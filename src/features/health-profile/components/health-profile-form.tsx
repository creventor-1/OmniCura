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
  Phone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { HealthProfile } from "@/types/database";

const HealthProfileFormSchema = z.object({
  fullName: z.string().optional(),
  age: z.string().optional(),
  sex: z.string().optional(),
  bloodGroup: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  medications: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
});

type HealthProfileFormValues = z.infer<typeof HealthProfileFormSchema>;

export const LOCAL_PROFILE_STORAGE_KEY = "omnicura_active_profile";

export function HealthProfileForm() {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [allowAiUse, setAllowAiUse] = React.useState(true);
  const [isFirstTimeUser, setIsFirstTimeUser] = React.useState(false);

  const { register, handleSubmit, setValue } =
    useForm<HealthProfileFormValues>({
      resolver: zodResolver(HealthProfileFormSchema),
      defaultValues: {
        fullName: "",
        age: "",
        sex: "",
        bloodGroup: "",
        height: "",
        weight: "",
        allergies: "",
        chronicConditions: "",
        medications: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
      },
    });

  // Load existing profile from Supabase or localStorage
  React.useEffect(() => {
    let active = true;

    async function loadProfile() {
      // 1. Try loading from localStorage first (works for guest or offline)
      let localData: Record<string, unknown> | null = null;
      try {
        const stored = localStorage.getItem(LOCAL_PROFILE_STORAGE_KEY);
        if (stored) {
          localData = JSON.parse(stored);
        }
      } catch {
        // ignore parse error
      }

      if (!user) {
        if (active) {
          if (localData) {
            populateForm(localData);
            setIsFirstTimeUser(false);
          } else {
            setIsFirstTimeUser(true);
          }
          setIsLoading(false);
        }
        return;
      }

      // 2. Load from Supabase if logged in
      try {
        const { data: profile } = await supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // Also fetch latest emergency contact
        const { data: contacts } = await supabase
          .from("emergency_contacts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (active) {
          if (profile) {
            const contact = contacts && contacts.length > 0 ? contacts[0] : null;
            populateForm({
              fullName: user.user_metadata?.full_name || localData?.fullName || "",
              age: profile.age ? String(profile.age) : "",
              sex: profile.sex || "",
              bloodGroup: profile.blood_group || "",
              height: profile.height ? String(profile.height) : "",
              weight: profile.weight ? String(profile.weight) : "",
              allowAiUse: profile.allow_ai_use ?? true,
              allergies: profile.allergies?.join(", ") || "",
              chronicConditions: profile.chronic_conditions?.join(", ") || "",
              medications: profile.medications?.join(", ") || "",
              emergencyContactName: contact?.name || localData?.emergencyContactName || "",
              emergencyContactNumber: contact?.phone_number || localData?.emergencyContactNumber || "",
            });
            setIsFirstTimeUser(false);
          } else if (localData) {
            populateForm(localData);
            setIsFirstTimeUser(false);
          } else {
            setIsFirstTimeUser(true);
          }
        }
      } catch (err) {
        console.warn("[HEALTH_PROFILE_LOAD_EXCEPTION]", err);
        if (active && localData) {
          populateForm(localData);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    function populateForm(data: Record<string, unknown>) {
      if (data.fullName) setValue("fullName", String(data.fullName));
      if (data.age) setValue("age", String(data.age));
      if (data.sex) setValue("sex", String(data.sex));
      if (data.bloodGroup) setValue("bloodGroup", String(data.bloodGroup));
      if (data.height) setValue("height", String(data.height));
      if (data.weight) setValue("weight", String(data.weight));
      if (data.allergies) setValue("allergies", String(data.allergies));
      if (data.chronicConditions) setValue("chronicConditions", String(data.chronicConditions));
      if (data.medications) setValue("medications", String(data.medications));
      if (data.emergencyContactName) setValue("emergencyContactName", String(data.emergencyContactName));
      if (data.emergencyContactNumber) setValue("emergencyContactNumber", String(data.emergencyContactNumber));
      if (typeof data.allowAiUse === "boolean") setAllowAiUse(data.allowAiUse);
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [user, supabase, setValue]);

  // Demo auto-fill template for hackathon presentation
  const handleQuickDemoFill = () => {
    setValue("fullName", "Alex Chen");
    setValue("age", "26");
    setValue("sex", "Male");
    setValue("bloodGroup", "O+");
    setValue("height", "178");
    setValue("weight", "72");
    setValue("allergies", "Penicillin, Peanuts");
    setValue("chronicConditions", "Mild Asthma");
    setValue("medications", "Albuterol inhaler as needed");
    setValue("emergencyContactName", "Dr. Sarah Chen");
    setValue("emergencyContactNumber", "+1 (555) 392-1084");
    setAllowAiUse(true);
    setIsFirstTimeUser(false);
  };

  const onSubmit = async (data: HealthProfileFormValues) => {
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

    // 1. Local storage record (always saved for immediate AI context availability)
    const localRecord = {
      fullName: data.fullName || undefined,
      age: isNaN(parsedAge as number) ? undefined : parsedAge,
      sex: data.sex || undefined,
      bloodGroup: data.bloodGroup || undefined,
      height: isNaN(parsedHeight as number) ? undefined : parsedHeight,
      weight: isNaN(parsedWeight as number) ? undefined : parsedWeight,
      allergies: data.allergies || "",
      chronicConditions: data.chronicConditions || "",
      medications: data.medications || "",
      emergencyContactName: data.emergencyContactName || undefined,
      emergencyContactNumber: data.emergencyContactNumber || undefined,
      allowAiUse,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(LOCAL_PROFILE_STORAGE_KEY, JSON.stringify(localRecord));
    } catch {
      // ignore
    }

    // 2. Supabase sync if user is signed in
    if (user) {
      const payload: Partial<HealthProfile> = {
        user_id: user.id,
        age: isNaN(parsedAge as number) ? undefined : parsedAge,
        sex: data.sex || undefined,
        blood_group: data.bloodGroup || undefined,
        height: isNaN(parsedHeight as number) ? undefined : parsedHeight,
        weight: isNaN(parsedWeight as number) ? undefined : parsedWeight,
        allow_ai_use: allowAiUse,
        allergies: parseList(data.allergies),
        chronic_conditions: parseList(data.chronicConditions),
        medications: parseList(data.medications),
        updated_at: new Date().toISOString(),
      };

      try {
        const { error: profileError } = await supabase
          .from("health_profiles")
          .upsert(payload, { onConflict: "user_id" });

        if (profileError) throw profileError;

        // Sync emergency contact if provided
        if (data.emergencyContactName && data.emergencyContactNumber) {
          await supabase.from("emergency_contacts").insert({
            user_id: user.id,
            name: data.emergencyContactName,
            relationship: "Primary Emergency Contact",
            phone_number: data.emergencyContactNumber,
          });
        }
      } catch (err: unknown) {
        console.warn("[SUPABASE_PROFILE_SAVE_WARNING]", err);
      }
    }

    setIsFirstTimeUser(false);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

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
      {/* First-Time Empty State Banner */}
      {isFirstTimeUser && (
        <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-50">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="size-5 text-accent shrink-0" />
            <div>
              <div className="text-sm font-semibold text-foreground">Welcome to Your Health Profile</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Save your medical background once so Omnicura automatically personalizes your triage assessments without asking repeatedly.
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleQuickDemoFill}
            className="text-xs font-semibold gap-1.5 shrink-0 bg-background"
          >
            <Sparkles className="size-3 text-accent" />
            <span>Fill Demo Profile</span>
          </Button>
        </div>
      )}

      {/* Dynamic Alerts */}
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
            Health Profile Saved
          </AlertTitle>
          <AlertDescription className="text-xs sm:text-sm">
            Your physiological details, allergies, and AI personalization preferences are active. Omnicura will incorporate this context during assessments.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Section Card 1: Personal & Biometrics */}
        <Card className="rounded-xl border border-border bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <User className="size-4 text-accent" />
              <span>Personal &amp; Biometrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-fullname"
                  className="text-xs font-medium text-foreground cursor-pointer block"
                >
                  Full Name (Optional)
                </label>
                <Input
                  id="profile-fullname"
                  placeholder="e.g. Alex Chen"
                  className="rounded-lg h-9 text-sm"
                  {...register("fullName")}
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
                  placeholder="e.g. O+, A-, B+, AB+"
                  className="rounded-lg h-9 text-sm"
                  {...register("bloodGroup")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
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
                  placeholder="e.g. 26"
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

        {/* Section Card 2: Medical History & Allergies */}
        <Card className="rounded-xl border border-border bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Activity className="size-4 text-accent" />
              <span>Medical History &amp; Sensitivities</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="profile-chronic-conditions"
                className="text-xs font-medium text-foreground cursor-pointer block"
              >
                Chronic Conditions (Comma separated)
              </label>
              <Input
                id="profile-chronic-conditions"
                placeholder="e.g. Asthma, Hypertension, Type 2 Diabetes"
                className="rounded-lg h-9 text-sm"
                {...register("chronicConditions")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-allergies"
                className="text-xs font-medium text-foreground cursor-pointer block"
              >
                Known Allergies (Comma separated)
              </label>
              <Input
                id="profile-allergies"
                placeholder="e.g. Penicillin, Peanuts, Latex, Sulfa"
                className="rounded-lg h-9 text-sm"
                {...register("allergies")}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="profile-medications"
                className="text-xs font-medium text-foreground cursor-pointer block"
              >
                Current Daily Medications (Comma separated)
              </label>
              <Input
                id="profile-medications"
                placeholder="e.g. Albuterol inhaler, Metformin 500mg, Lisinopril"
                className="rounded-lg h-9 text-sm"
                {...register("medications")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section Card 3: Designated Emergency Contact */}
        <Card className="rounded-xl border border-border bg-card shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Phone className="size-4 text-accent" />
              <span>Primary Emergency Contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-emergency-name"
                  className="text-xs font-medium text-foreground cursor-pointer block"
                >
                  Emergency Contact Name
                </label>
                <Input
                  id="profile-emergency-name"
                  placeholder="e.g. Dr. Sarah Chen / Spouse"
                  className="rounded-lg h-9 text-sm"
                  {...register("emergencyContactName")}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-emergency-phone"
                  className="text-xs font-medium text-foreground cursor-pointer block"
                >
                  Emergency Phone Number
                </label>
                <Input
                  id="profile-emergency-phone"
                  type="tel"
                  placeholder="e.g. +1 (555) 392-1084"
                  className="rounded-lg h-9 text-sm"
                  {...register("emergencyContactNumber")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Card 4: AI Personalization Consent */}
        <Card className="rounded-xl border border-border bg-card shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Lock className="size-4 text-accent" />
              <span>AI Autonomous Context Consent</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-muted/20 border border-border">
              <input
                type="checkbox"
                id="allow_ai_use"
                checked={allowAiUse}
                onChange={(e) => setAllowAiUse(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
              />
              <div className="space-y-0.5">
                <label
                  htmlFor="allow_ai_use"
                  className="text-sm font-medium text-foreground cursor-pointer block"
                >
                  Automatically incorporate this health profile into symptom triage
                </label>
                <p className="text-xs text-muted-foreground leading-normal">
                  When enabled, Omnicura immediately references your age, asthma/allergies, and medications during consultations, eliminating redundant questions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            isLoading={isSaving}
            className="px-6 h-10 rounded-lg font-semibold text-xs sm:text-sm gap-2"
          >
            <Save className="size-3.5" />
            <span>Save Health Profile</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleQuickDemoFill}
            className="h-10 text-xs px-4"
          >
            Load Demo Profile
          </Button>
        </div>
      </form>
    </div>
  );
}
