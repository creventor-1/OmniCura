"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, HeartPulse, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm<HealthProfileFormValues>({
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
          if (profile.allergies?.length) setValue("allergies", profile.allergies.join(", "));
          if (profile.chronic_conditions?.length)
            setValue("chronic_conditions", profile.chronic_conditions.join(", "));
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
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <Card className="max-w-xl mx-auto my-6 text-center p-6">
        <HeartPulse className="size-10 text-muted-foreground mx-auto mb-2" />
        <CardTitle className="text-lg">Sign in to manage Health Profile</CardTitle>
        <CardDescription className="text-xs mt-1">
          Creating an account allows you to securely store your medical history and toggle AI consideration.
        </CardDescription>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HeartPulse className="size-5 text-primary" />
          <CardTitle className="text-xl">Your Health Profile</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Personal health details are protected under Row Level Security and only shared with the AI when you provide explicit consent below.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {saveSuccess && (
          <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <AlertTitle className="text-sm font-semibold">Profile Saved Successfully</AlertTitle>
            <AlertDescription className="text-xs">
              Your health information and AI consent preferences have been updated.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Demographic Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Age</label>
              <Input type="number" placeholder="e.g. 28" {...register("age")} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Biological Sex</label>
              <Input placeholder="Female / Male / Other" {...register("sex")} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Blood Group</label>
              <Input placeholder="e.g. O+, A-, B+" {...register("blood_group")} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Height (cm)</label>
              <Input type="number" placeholder="e.g. 175" {...register("height")} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Weight (kg)</label>
              <Input type="number" placeholder="e.g. 70" {...register("weight")} />
            </div>
          </div>

          {/* Clinical Context Fields */}
          <div className="space-y-1">
            <label className="text-xs font-medium">Known Allergies (comma separated)</label>
            <Input placeholder="Penicillin, Peanuts, Latex" {...register("allergies")} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Chronic Conditions (comma separated)</label>
            <Input placeholder="Asthma, Type 2 Diabetes, Hypertension" {...register("chronic_conditions")} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Current Medications (comma separated)</label>
            <Input placeholder="Metformin, Albuterol inhaler" {...register("medications")} />
          </div>

          {/* AI Consent Toggle Card */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mt-4 space-y-2">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="allow_ai_use"
                checked={allowAiUse}
                onChange={(e) => setAllowAiUse(e.target.checked)}
                className="mt-1 size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="allow_ai_use" className="text-sm font-semibold text-foreground cursor-pointer">
                Allow TriageAI to personalize triage assessments using this profile
              </label>
            </div>
            <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
              When checked, your reported age, allergies, and chronic conditions will be provided to the AI triage model to tailor questions and first-aid instructions. When unchecked, triage runs without profile data.
            </p>
            {allowAiUse && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 pl-7 font-medium">
                Prototype Notice: Please avoid entering real personal identifying health data during this hackathon demo.
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSaving} className="w-full gap-2 font-medium mt-4">
            {isSaving ? <Spinner size="sm" /> : <Save className="size-4" />}
            Save Health Profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
