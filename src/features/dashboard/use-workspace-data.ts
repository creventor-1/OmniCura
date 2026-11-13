"use client";

import * as React from "react";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import type { StoredAssessment } from "@/types/database";

const GUEST_ASSESSMENTS_KEY = "omnicura_guest_assessments";
const LOCAL_PROFILE_KEY = "omnicura_active_profile";

export interface ProfileSnapshot {
  fullName?: string;
  age?: number | string;
  sex?: string;
  bloodGroup?: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  allowAiUse: boolean;
  completeness: number;
  missing: string[];
}

export interface WorkspaceData {
  isLoading: boolean;
  assessments: StoredAssessment[];
  profile: ProfileSnapshot | null;
  contactsCount: number;
  isSignedIn: boolean;
}

function toList(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function buildSnapshot(raw: Record<string, unknown>): ProfileSnapshot {
  const fields: [string, boolean][] = [
    ["Age", !!raw.age],
    ["Biological sex", !!raw.sex],
    ["Blood group", !!raw.bloodGroup],
    ["Height", !!raw.height],
    ["Weight", !!raw.weight],
    ["Allergies", toList(raw.allergies).length > 0],
    ["Chronic conditions", toList(raw.chronicConditions).length > 0],
    ["Medications", toList(raw.medications).length > 0],
  ];
  const done = fields.filter(([, ok]) => ok).length;
  return {
    fullName: raw.fullName ? String(raw.fullName) : undefined,
    age: raw.age as number | string | undefined,
    sex: raw.sex ? String(raw.sex) : undefined,
    bloodGroup: raw.bloodGroup ? String(raw.bloodGroup) : undefined,
    allergies: toList(raw.allergies),
    conditions: toList(raw.chronicConditions),
    medications: toList(raw.medications),
    allowAiUse: raw.allowAiUse !== false,
    completeness: Math.round((done / fields.length) * 100),
    missing: fields.filter(([, ok]) => !ok).map(([k]) => k),
  };
}

/**
 * Read-only aggregation of the same sources the individual feature views use
 * (localStorage guest records + Supabase when signed in). No writes.
 */
export function useWorkspaceData(): WorkspaceData {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);
  const [state, setState] = React.useState<WorkspaceData>({
    isLoading: true,
    assessments: [],
    profile: null,
    contactsCount: 0,
    isSignedIn: false,
  });

  React.useEffect(() => {
    let active = true;

    async function load() {
      let local: StoredAssessment[] = [];
      let localProfile: Record<string, unknown> | null = null;
      try {
        const stored = localStorage.getItem(GUEST_ASSESSMENTS_KEY);
        if (stored) local = JSON.parse(stored);
        const p = localStorage.getItem(LOCAL_PROFILE_KEY);
        if (p) localProfile = JSON.parse(p);
      } catch {
        // ignore
      }

      if (!user) {
        if (active) {
          setState({
            isLoading: false,
            assessments: local,
            profile: localProfile ? buildSnapshot(localProfile) : null,
            contactsCount: 0,
            isSignedIn: false,
          });
        }
        return;
      }

      try {
        const [assessRes, profileRes, contactsRes] = await Promise.all([
          supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("health_profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("emergency_contacts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        const remote = (assessRes.data as StoredAssessment[] | null) ?? [];
        const merged = [...remote, ...local.filter((l) => !remote.some((r) => r.id === l.id))];

        let profile: ProfileSnapshot | null = null;
        if (profileRes.data) {
          const d = profileRes.data;
          profile = buildSnapshot({
            fullName: user.user_metadata?.full_name || localProfile?.fullName,
            age: d.age,
            sex: d.sex,
            bloodGroup: d.blood_group,
            height: d.height,
            weight: d.weight,
            allergies: d.allergies,
            chronicConditions: d.chronic_conditions,
            medications: d.medications,
            allowAiUse: d.allow_ai_use,
          });
        } else if (localProfile) {
          profile = buildSnapshot(localProfile);
        }

        if (active) {
          setState({
            isLoading: false,
            assessments: merged,
            profile,
            contactsCount: contactsRes.count ?? 0,
            isSignedIn: true,
          });
        }
      } catch (err) {
        console.warn("[WORKSPACE_DATA_ERROR]", err);
        if (active) {
          setState({
            isLoading: false,
            assessments: local,
            profile: localProfile ? buildSnapshot(localProfile) : null,
            contactsCount: 0,
            isSignedIn: true,
          });
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user, supabase]);

  return state;
}

/** Bucket assessments into the trailing `days` calendar days (oldest → newest). */
export function bucketByDay(assessments: StoredAssessment[], days = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return { date: d, value: 0 };
  });
  for (const a of assessments) {
    const t = new Date(a.created_at);
    t.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - t.getTime()) / 86400000);
    if (diff >= 0 && diff < days) buckets[days - 1 - diff].value += 1;
  }
  return buckets.map((b, i) => ({
    key: b.date.toISOString(),
    label: b.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    shortLabel:
      i === days - 1 ? "Today" : b.date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: b.value,
  }));
}
