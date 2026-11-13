"use client";

import * as React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  ScanEye,
  Pill,
  MapPinned,
  ShieldCheck,
  Sparkles,
  FileText,
  UserRound,
  PhoneCall,
  HeartPulse,
  ClipboardList,
  Plus,
  Lock,
  Zap,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { IconTile } from "@/components/system/icon-tile";
import { SectionHeader } from "@/components/system/page-header";
import { ActivityColumns, SegmentedShare, ProgressRing } from "@/components/system/charts";
import { ACUITY, ACUITY_ORDER } from "@/lib/acuity";
import { formatRelativeTime, getGreeting } from "@/lib/format";
import { useWorkspaceData, bucketByDay } from "@/features/dashboard/use-workspace-data";
import { TRIAGE_DRAFT_KEY, requestAuth } from "@/components/shell/nav-config";
import type { NavSection } from "@/components/shared/navbar";

interface OverviewProps {
  onNavigate: (section: NavSection) => void;
}

const emptySubscribe = () => () => {};

const QUICK_PROMPTS = [
  "Headache and fever since yesterday",
  "Sharp pain in lower right abdomen",
  "Itchy red rash on my forearm",
  "Twisted ankle, swelling and bruising",
];

const TOOLS: {
  id: NavSection;
  title: string;
  description: string;
  cta: string;
  icon: typeof Activity;
}[] = [
  {
    id: "triage",
    title: "Symptom Assessment",
    description: "Guided conversation with adaptive follow-ups and an acuity verdict.",
    cta: "Start assessment",
    icon: Activity,
  },
  {
    id: "vision",
    title: "Symptom Vision",
    description: "Photo analysis for visible rashes, burns, cuts and swelling.",
    cta: "Analyze a photo",
    icon: ScanEye,
  },
  {
    id: "medication",
    title: "Medication Scan",
    description: "Identify packaging and review dosing cautions and interactions.",
    cta: "Scan a label",
    icon: Pill,
  },
  {
    id: "hospitals",
    title: "Hospital Locator",
    description: "Nearest emergency departments with routing and direct dial.",
    cta: "Open map",
    icon: MapPinned,
  },
];

export function Overview({ onNavigate }: OverviewProps) {
  const data = useWorkspaceData();
  const [draft, setDraft] = React.useState("");

  const greeting = React.useSyncExternalStore(emptySubscribe, () => getGreeting(), () => "Welcome back");
  const today = React.useSyncExternalStore(
    emptySubscribe,
    () => new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    () => ""
  );

  const startAssessment = (text?: string) => {
    const value = (text ?? draft).trim();
    try {
      if (value) sessionStorage.setItem(TRIAGE_DRAFT_KEY, value);
    } catch {
      // ignore
    }
    onNavigate("triage");
  };

  const { assessments, profile, contactsCount, isLoading, isSignedIn } = data;
  const activity = React.useMemo(() => bucketByDay(assessments, 14), [assessments]);
  const last7 = activity.slice(-7).reduce((s, d) => s + d.value, 0);
  const latest = assessments[0];
  const counts = ACUITY_ORDER.map((id) => ({
    id,
    value: assessments.filter((a) => a.severity === id).length,
  }));
  const firstName = profile?.fullName?.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* ---------- Greeting ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-text-tertiary min-h-5">{today}</p>
          <h1 className="type-title text-foreground">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-text-secondary">
            Screen symptoms, review records and route to care — all in one workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onNavigate("hospitals")}>
            <MapPinned className="text-text-tertiary" />
            Find care
          </Button>
          <Button onClick={() => onNavigate("triage")}>
            <Plus className="stroke-[2.5]" />
            New assessment
          </Button>
        </div>
      </div>

      {/* ---------- Hero: quick triage + protocol ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 animate-rise [animation-delay:60ms]">
        <section
          aria-labelledby="quick-triage-title"
          className="relative overflow-hidden rounded-[20px] border border-border-subtle bg-surface p-6 sm:p-8 shadow-xs lg:col-span-8"
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[radial-gradient(closest-side,var(--brand-soft),transparent)] opacity-90"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-grid opacity-50 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden="true" />

          <div className="relative space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/15 bg-brand-muted px-2.5 py-1 text-xs font-semibold text-accent-text">
                <Sparkles className="size-3.5" />
                AI symptom assessment
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success-strong opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-success-strong" />
                </span>
                Red-flag screening active
              </span>
            </div>

            <div className="space-y-2 max-w-xl">
              <h2 id="quick-triage-title" className="type-display text-foreground">
                What symptoms are you experiencing?
              </h2>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                Describe them in your own words. Omnicura screens for emergencies instantly, asks a few
                clinical follow-ups, then recommends the right level of care.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                startAssessment();
              }}
              className="group/composer flex flex-col gap-2 rounded-2xl border border-border-strong/70 bg-surface p-2 shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[4px] focus-within:ring-ring/15 sm:flex-row sm:items-center"
            >
              <label htmlFor="quick-triage-input" className="sr-only">
                Describe your symptoms
              </label>
              <input
                id="quick-triage-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. Sore throat and mild fever for two days…"
                className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base sm:text-[15px] text-foreground placeholder:text-text-tertiary outline-none"
                autoComplete="off"
              />
              <Button type="submit" size="lg" className="sm:h-11 rounded-xl">
                Start assessment
                <ArrowRight className="transition-transform group-hover/button:translate-x-0.5" />
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-text-tertiary mr-1">Try:</span>
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDraft(p)}
                  className="rounded-full border border-border-subtle bg-subtle px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand/30 hover:bg-brand-muted hover:text-accent-text cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>

            <ul className="flex flex-col gap-x-6 gap-y-2.5 border-t border-border-subtle pt-5 text-[13px] text-text-secondary sm:flex-row sm:flex-wrap">
              <li className="flex items-center gap-2">
                <Zap className="size-4 text-accent shrink-0" />
                Instant red-flag screen
              </li>
              <li className="flex items-center gap-2">
                <UserRound className="size-4 text-accent shrink-0" />
                Personalised to your profile
              </li>
              <li className="flex items-center gap-2">
                <FileText className="size-4 text-accent shrink-0" />
                Shareable PDF report
              </li>
            </ul>
          </div>
        </section>

        {/* Acuity protocol */}
        <section
          aria-labelledby="protocol-title"
          className="flex flex-col rounded-[20px] border border-border-subtle bg-surface p-6 shadow-xs lg:col-span-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="protocol-title" className="type-heading text-foreground">Triage protocol</h2>
              <p className="text-[13px] text-text-tertiary mt-0.5">Three standardized acuity levels</p>
            </div>
            <IconTile icon={ShieldCheck} size="sm" />
          </div>

          <ol className="mt-5 flex flex-1 flex-col gap-2.5">
            {ACUITY_ORDER.map((id, i) => {
              const a = ACUITY[id];
              const Icon = a.icon;
              return (
                <li
                  key={id}
                  className="flex flex-1 items-center gap-3 rounded-2xl border border-border-subtle bg-subtle p-3.5"
                >
                  <span className={cn("flex size-9 items-center justify-center rounded-xl border", a.bg, a.text, a.border)}>
                    <Icon className="size-[18px] stroke-[2]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{a.label}</span>
                      <span className="text-[11px] font-semibold text-text-tertiary tabular-nums">L{i + 1}</span>
                    </div>
                    <div className="text-xs text-text-secondary truncate">{a.timeframe} · {a.examples}</div>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-text-tertiary">
            <Lock className="mt-0.5 size-3.5 shrink-0" />
            Emergency rules run deterministically on your device before any AI call.
          </p>
        </section>
      </div>

      {/* ---------- KPI tiles ---------- */}
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-rise [animation-delay:120ms]">
        <StatTile
          label="Assessments"
          icon={ClipboardList}
          isLoading={isLoading}
          onClick={() => onNavigate("history")}
          value={<span className="type-metric text-foreground">{assessments.length}</span>}
          footer={
            last7 > 0 ? (
              <span><span className="font-semibold text-foreground">{last7}</span> in the last 7 days</span>
            ) : (
              "No activity this week"
            )
          }
        />
        <StatTile
          label="Latest acuity"
          icon={HeartPulse}
          isLoading={isLoading}
          onClick={() => onNavigate("history")}
          value={
            latest ? (
              <SeverityBadge severity={latest.severity} size="md" />
            ) : (
              <span className="text-[15px] font-semibold text-text-tertiary">No record yet</span>
            )
          }
          footer={latest ? formatRelativeTime(latest.created_at) : "Run an assessment to begin"}
        />
        <StatTile
          label="Health profile"
          icon={UserRound}
          isLoading={isLoading}
          onClick={() => onNavigate("profile")}
          value={
            <div className="flex items-center gap-3">
              <ProgressRing value={profile?.completeness ?? 0} size={44} stroke={5} label="Profile completeness">
                <span className="text-[11px] font-bold tabular-nums text-foreground">{profile?.completeness ?? 0}%</span>
              </ProgressRing>
              <span className="text-[13px] font-semibold text-foreground leading-tight">
                {profile ? (profile.completeness === 100 ? "Complete" : "In progress") : "Not started"}
              </span>
            </div>
          }
          footer={profile?.allowAiUse ? "Used to personalise triage" : "Add details to tailor triage"}
        />
        <StatTile
          label="Emergency contacts"
          icon={PhoneCall}
          isLoading={isLoading}
          onClick={() => (isSignedIn ? onNavigate("contacts") : requestAuth("signin"))}
          value={<span className="type-metric text-foreground">{contactsCount}</span>}
          footer={isSignedIn ? (contactsCount > 0 ? "Ready for one-tap dial" : "Add a trusted contact") : "Sign in to add contacts"}
        />
      </section>

      {/* ---------- Activity + Acuity mix ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 animate-rise [animation-delay:180ms]">
        <section className="rounded-[20px] border border-border-subtle bg-surface p-6 shadow-xs lg:col-span-8">
          <SectionHeader
            title="Assessment activity"
            description="Daily assessments over the last 14 days"
            action={
              <span className="text-[13px] text-text-tertiary tabular-nums">
                <span className="font-semibold text-foreground">{activity.reduce((s, d) => s + d.value, 0)}</span> total
              </span>
            }
          />
          <div className="mt-6">
            {isLoading ? <Skeleton className="h-[160px] w-full rounded-xl" /> : <ActivityColumns data={activity} />}
          </div>
        </section>

        <section className="rounded-[20px] border border-border-subtle bg-surface p-6 shadow-xs lg:col-span-4">
          <SectionHeader title="Acuity mix" description="Share of all recorded assessments" />
          <div className="mt-6">
            {isLoading ? (
              <Skeleton className="h-[140px] w-full rounded-xl" />
            ) : (
              <SegmentedShare
                data={counts.map(({ id, value }) => ({
                  key: id,
                  label: ACUITY[id].label,
                  value,
                  colorClass: ACUITY[id].solid,
                  icon: ACUITY[id].icon,
                  iconClass: ACUITY[id].text,
                }))}
                emptyLabel="No assessments recorded yet"
              />
            )}
          </div>
        </section>
      </div>

      {/* ---------- Recent encounters + Patient snapshot ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 animate-rise [animation-delay:240ms]">
        <section className="rounded-[20px] border border-border-subtle bg-surface shadow-xs lg:col-span-8 overflow-hidden">
          <div className="p-6 pb-4">
            <SectionHeader
              title="Recent encounters"
              description="Your latest triage outcomes"
              action={
                assessments.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => onNavigate("history")}>
                    View all
                    <ArrowRight />
                  </Button>
                )
              }
            />
          </div>

          {isLoading ? (
            <div className="space-y-3 px-6 pb-6">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : assessments.length === 0 ? (
            <div className="mx-6 mb-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong/70 bg-subtle px-6 py-10 text-center">
              <IconTile icon={ClipboardList} tone="neutral" />
              <div>
                <p className="text-sm font-semibold text-foreground">No encounters yet</p>
                <p className="mt-1 text-[13px] text-text-tertiary max-w-sm">
                  Completed assessments appear here with their acuity, recommended action and PDF report.
                </p>
              </div>
              <Button size="sm" onClick={() => onNavigate("triage")}>
                Start first assessment
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle border-t border-border-subtle">
              {assessments.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate("history")}
                    className="group flex w-full items-center gap-4 px-6 py-3.5 text-left transition-colors hover:bg-subtle cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.symptoms}</p>
                      <p className="mt-0.5 text-xs text-text-tertiary">{formatRelativeTime(a.created_at)}</p>
                    </div>
                    <SeverityBadge severity={a.severity} />
                    <ArrowUpRight className="size-4 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col rounded-[20px] border border-border-subtle bg-surface p-6 shadow-xs lg:col-span-4">
          <SectionHeader
            title="Patient snapshot"
            description="Context shared with assessments"
            action={
              <Button variant="ghost" size="sm" onClick={() => onNavigate("profile")}>
                Edit
              </Button>
            }
          />
          {isLoading ? (
            <Skeleton className="mt-5 h-40 w-full rounded-xl" />
          ) : profile ? (
            <dl className="mt-5 space-y-4 text-[13px]">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Age", profile.age ? String(profile.age) : "—"],
                  ["Sex", profile.sex || "—"],
                  ["Blood", profile.bloodGroup || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border-subtle bg-subtle px-3 py-2.5">
                    <dt className="text-[11px] font-medium text-text-tertiary">{k}</dt>
                    <dd className="mt-0.5 truncate font-semibold text-foreground">{v}</dd>
                  </div>
                ))}
              </div>
              <SnapshotList label="Allergies" items={profile.allergies} tone="danger" />
              <SnapshotList label="Conditions" items={profile.conditions} />
              <SnapshotList label="Medications" items={profile.medications} />
              <div className="flex items-center gap-2 rounded-xl bg-subtle px-3 py-2 text-xs text-text-secondary">
                <ShieldCheck className={cn("size-4", profile.allowAiUse ? "text-success" : "text-text-tertiary")} />
                {profile.allowAiUse ? "AI personalisation enabled" : "AI personalisation off"}
              </div>
            </dl>
          ) : (
            <div className="mt-5 flex flex-1 flex-col items-start justify-between gap-4 rounded-2xl bg-subtle p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Add your medical background</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  Allergies, conditions and medications let Omnicura skip repetitive questions and flag interactions.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onNavigate("profile")}>
                Set up profile
                <ArrowRight />
              </Button>
            </div>
          )}
        </section>
      </div>

      {/* ---------- Clinical tools ---------- */}
      <section aria-labelledby="tools-title" className="space-y-4 animate-rise [animation-delay:300ms]">
        <SectionHeader title="Clinical tools" description="Specialised modules for assessment and navigation" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onNavigate(tool.id)}
              className="group flex flex-col items-start gap-4 rounded-[20px] border border-border-subtle bg-surface p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 cursor-pointer"
            >
              <div className="flex w-full items-center justify-between">
                <IconTile icon={tool.icon} />
                <ArrowUpRight className="size-4 text-text-tertiary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] font-semibold text-foreground">{tool.title}</h3>
                <p className="text-[13px] leading-relaxed text-text-secondary">{tool.description}</p>
              </div>
              <span className="mt-auto text-[13px] font-semibold text-accent-text">{tool.cta}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatTile({
  label,
  icon: Icon,
  value,
  footer,
  isLoading,
  onClick,
}: {
  label: string;
  icon: typeof Activity;
  value: React.ReactNode;
  footer: React.ReactNode;
  isLoading: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[148px] flex-col justify-between gap-4 rounded-[20px] border border-border-subtle bg-surface p-5 text-left shadow-xs transition-all duration-200 hover:border-border-strong hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 cursor-pointer"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-text-secondary">{label}</span>
        <Icon className="size-4 text-text-tertiary transition-colors group-hover:text-accent" />
      </div>
      <div className="min-h-10 flex items-center">
        {isLoading ? <Skeleton className="h-8 w-20 rounded-lg" /> : value}
      </div>
      <div className="text-xs text-text-tertiary leading-snug">{isLoading ? <Skeleton className="h-3 w-24" /> : footer}</div>
    </button>
  );
}

function SnapshotList({ label, items, tone }: { label: string; items: string[]; tone?: "danger" }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-text-tertiary mb-1.5">{label}</dt>
      <dd className="flex flex-wrap gap-1.5">
        {items.length === 0 ? (
          <span className="text-text-tertiary">None recorded</span>
        ) : (
          items.slice(0, 4).map((item) => (
            <span
              key={item}
              className={cn(
                "rounded-md border px-2 py-0.5 text-xs font-medium",
                tone === "danger"
                  ? "border-danger/20 bg-danger-muted text-danger"
                  : "border-border-subtle bg-subtle text-foreground"
              )}
            >
              {item}
            </span>
          ))
        )}
      </dd>
    </div>
  );
}
