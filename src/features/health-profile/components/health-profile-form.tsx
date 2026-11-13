"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShieldCheck,
  HeartPulse,
  Save,
  AlertCircle,
  User,
  Activity,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { HealthProfile } from "@/types/database";

const HealthProfileFormSchema = z.object({
  age: z.string().optional(),
  sex: z.string().optional(),
  allergies: z.string().optional(),
  chronic_conditions: z.string().optional(),
  medications: z.string().optional(),
  blood_group: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});

type HealthProfileFormValues = z.infer<typeof HealthProfileFormSchema>;

export function HealthProfileForm() {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [allowAiUse, setAllowAiUse] = React.useState(false);

  const { register, handleSubmit, setValue } =
    useForm<HealthProfileFormValues>({
      resolver: zodResolver(HealthProfileFormSchema),
    });

  // Load existing profile asynchronously
  React.useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (active && !error && data) {
          const profile = data as HealthProfile;
          if (profile.age) setValue("age", String(profile.age));
          if (profile.sex) setValue("sex", profile.sex);
          if (profile.blood_group) setValue("blood_group", profile.blood_group);
          if (profile.height) setValue("height", String(profile.height));
          if (profile.weight) setValue("weight", String(profile.weight));
          setAllowAiUse(!!profile.allow_ai_use);
          if (profile.allergies?.length)
            setValue("allergies", profile.allergies.join(", "));
          if (profile.chronic_conditions?.length)
            setValue(
              "chronic_conditions",
              profile.chronic_conditions.join(", ")
            );
          if (profile.medications?.length)
            setValue("medications", profile.medications.join(", "));
        }
      } catch (err) {
        console.warn("[HEALTH_PROFILE_LOAD_EXCEPTION]", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [user, supabase, setValue]);

  const onSubmit = async (data: HealthProfileFormValues) => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const parseList = (val?: string) =>
      val
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const parsedAge = data.age ? parseInt(data.age, 10) : undefined;
    const parsedHeight = data.height ? parseFloat(data.height) : undefined;
    const parsedWeight = data.weight ? parseFloat(data.weight) : undefined;

    const payload: Partial<HealthProfile> = {
      user_id: user.id,
      age: isNaN(parsedAge as number) ? undefined : parsedAge,
      sex: data.sex || undefined,
      blood_group: data.blood_group || undefined,
      height: isNaN(parsedHeight as number) ? undefined : parsedHeight,
      weight: isNaN(parsedWeight as number) ? undefined : parsedWeight,
      allow_ai_use: allowAiUse,
      allergies: parseList(data.allergies),
      chronic_conditions: parseList(data.chronic_conditions),
      medications: parseList(data.medications),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from("health_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        setErrorMessage(error.message || "Failed to save profile.");
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error).message || "An unexpected error occurred."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="Sign In to Manage Your Health Profile"
        description="Securely store your medical context, allergies, and daily medications to enable tailored AI triage evaluations."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          <HeartPulse className="size-4.5 text-accent" />
          <span>Patient Health Profile</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Confidential health context stored under Supabase Row Level Security.
          Explicit consent required for AI consideration.
        </p>
      </div>

      {/* Dynamic Alerts with Accessible aria-live */}
      {errorMessage && (
        <Alert
          variant="destructive"
          role="alert"
          aria-live="polite"
          className="rounded-xl"
        >
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs sm:text-sm font-medium">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert
          role="status"
          aria-live="polite"
          className="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
        >
          <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-sm font-semibold">
            Profile Saved Successfully
          </AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            Your clinical background and AI personalization preferences have been safely updated.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section Card 1: Personal & Biometric Information */}
        <Card className="rounded-xl border border-border bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <User className="size-4 text-accent" />
              <span>Personal &amp; Biometric Details</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Baseline physiological measurements used to evaluate pediatric or geriatric risk factors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-age"
                  className="text-xs font-medium text-foreground cursor-pointer block"
                >
                  Age
                </label>
                <Input
                  id="profile-age"
                  type="number"
                  placeholder="e.g. 28"
                  className="rounded-lg h-9 text-sm tabular-nums"
                  {...register("age")}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-sex"
                  className="text-xs font-medium text-foreground cursor-pointer block"
                >
                  Biological Sex
                </label>
                <Input
                  id="profile-sex"
                  placeholder="Female / Male / Other"
                  className="rounded-lg h-9 text-sm"
                  {...register("sex")}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-blood-group"
                  className="text-xs font-medium text-foreground cursor-pointer block"
                >
                  Blood Group
                </label>
                <Input
                  id="profile-blood-group"
                  placeholder="e.g. O+, A-, B+"
                  className="rounded-lg h-9 text-sm"
                  {...register("blood_group")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-height"
                  className="text-xs font-medium text-foreground cursor-pointer block"
                >
                  Height (cm)
                </label>
                <Input
                  id="profile-height"
                  type="number"
                  placeholder="e.g. 175"
                  className="rounded-lg h-9 text-sm tabular-nums"
                  {...register("height")}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-weight"
                  className="text-xs font-medium text-foreground cursor-pointer block"
                >
                  Weight (kg)
                </label>
                <Input
                  id="profile-weight"
                  type="number"
                  placeholder="e.g. 70"
                  className="rounded-lg h-9 text-sm tabular-nums"
                  {...register("weight")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Card 2: Clinical Context & Medical History */}
        <Card className="rounded-xl border border-border bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Activity className="size-4 text-accent" />
              <span>Clinical History &amp; Medications</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Pre-existing conditions that influence symptom severity and potential drug interactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="profile-allergies"
                className="text-xs font-medium text-foreground cursor-pointer block"
              >
                Known Allergies (comma separated)
              </label>
              <Input
                id="profile-allergies"
                placeholder="Penicillin, Peanuts, Latex"
                className="rounded-lg h-9 text-sm"
                {...register("allergies")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-chronic-conditions"
                className="text-xs font-medium text-foreground cursor-pointer block"
              >
                Chronic Conditions (comma separated)
              </label>
              <Input
                id="profile-chronic-conditions"
                placeholder="Asthma, Type 2 Diabetes, Hypertension"
                className="rounded-lg h-9 text-sm"
                {...register("chronic_conditions")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-medications"
                className="text-xs font-medium text-foreground cursor-pointer block"
              >
                Current Medications (comma separated)
              </label>
              <Input
                id="profile-medications"
                placeholder="Metformin, Albuterol inhaler, Lisinopril"
                className="rounded-lg h-9 text-sm"
                {...register("medications")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section Card 3: AI Personalization & Consent Preference */}
        <Card className="rounded-xl border border-border bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Lock className="size-4 text-accent" />
              <span>AI Personalization Consent &amp; Privacy</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-muted/20 border border-border">
              <input
                type="checkbox"
                id="allow_ai_use"
                checked={allowAiUse}
                onChange={(e) => setAllowAiUse(e.target.checked)}
                className="mt-1 size-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
              />
              <div className="space-y-1">
                <label
                  htmlFor="allow_ai_use"
                  className="text-sm font-medium text-foreground cursor-pointer block"
                >
                  Allow TriageAI to personalize triage assessments using this profile
                </label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When enabled, reported age, allergies, and chronic conditions are sent in the prompt to the AI triage model to tailor questions and first-aid instructions. When disabled, triage operates with standard baseline logic.
                </p>
              </div>
            </div>

            {allowAiUse && (
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium pl-1">
                Prototype Notice: For hackathon demonstration purposes, avoid submitting actual sensitive personal health data.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 h-9 rounded-lg font-semibold text-xs gap-2"
          >
            <Save className="size-3.5" />
            <span>{isSaving ? "Saving Profile..." : "Save Health Profile"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
