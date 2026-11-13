"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShieldCheck,
  Save,
  CircleAlert,
  UserRound,
  Activity,
  Phone,
  Sparkles,
  CircleCheckBig,
  Lock,
  Droplet,
  ChevronDown,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/system/charts";
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

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEX_OPTIONS = ["Female", "Male", "Intersex", "Prefer not to say"];

const selectClass =
  "h-11 sm:h-10 w-full appearance-none rounded-[10px] border border-border-subtle bg-surface pl-3.5 pr-10 text-base sm:text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 cursor-pointer";

function NativeSelect({
  options,
  currentValue,
  placeholder,
  ref,
  ...props
}: React.ComponentProps<"select"> & { options: string[]; currentValue?: string; placeholder: string }) {
  const all = currentValue && !options.includes(currentValue) ? [currentValue, ...options] : options;
  return (
    <div className="relative">
      <select ref={ref} className={selectClass} {...props}>
        <option value="">{placeholder}</option>
        {all.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
    </div>
  );
}

function toList(val?: string) {
  return val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

function FieldLabel({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-foreground">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-text-tertiary">{hint}</span>}
    </label>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-border-subtle bg-surface shadow-xs">
      <div className="flex items-start gap-3 border-b border-border-subtle px-5 py-4 sm:px-6">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-accent">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          <p className="text-[13px] text-text-tertiary">{description}</p>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function ChipPreview({ value, tone }: { value?: string; tone?: "danger" }) {
  const items = toList(value);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "rounded-md border px-2 py-0.5 text-xs font-medium",
            tone === "danger" ? "border-danger/20 bg-danger-muted text-danger" : "border-border-subtle bg-subtle text-foreground"
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

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

  const { register, handleSubmit, setValue, control } =
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

  const values = useWatch({ control });
  const heightNum = parseFloat(values.height || "");
  const weightNum = parseFloat(values.weight || "");
  const bmi =
    heightNum > 0 && weightNum > 0 ? Math.round((weightNum / Math.pow(heightNum / 100, 2)) * 10) / 10 : null;
  const bmiLabel =
    bmi === null ? null : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obese range";

  const completenessFields: [string, boolean][] = [
    ["Age", !!values.age],
    ["Biological sex", !!values.sex],
    ["Blood group", !!values.bloodGroup],
    ["Height", !!values.height],
    ["Weight", !!values.weight],
    ["Allergies", toList(values.allergies).length > 0],
    ["Chronic conditions", toList(values.chronicConditions).length > 0],
    ["Medications", toList(values.medications).length > 0],
  ];
  const completeness = Math.round(
    (completenessFields.filter(([, ok]) => ok).length / completenessFields.length) * 100
  );
  const missing = completenessFields.filter(([, ok]) => !ok).map(([k]) => k);
  const initials =
    (values.fullName || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-[420px] rounded-[20px] lg:col-span-4" />
        <div className="space-y-5 lg:col-span-8">
          <Skeleton className="h-64 w-full rounded-[20px]" />
          <Skeleton className="h-56 w-full rounded-[20px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* ============ Summary rail ============ */}
      <aside className="lg:col-span-4">
        <div className="space-y-5 lg:sticky lg:top-24">
          <section className="overflow-hidden rounded-[20px] border border-border-subtle bg-surface shadow-xs">
            <div className="relative h-20 bg-gradient-to-br from-brand via-brand to-brand-hover">
              <div className="absolute inset-0 bg-grid opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
            </div>
            <div className="relative -mt-10 px-5 pb-5">
              <div className="flex items-end justify-between">
                <span className="flex size-20 items-center justify-center rounded-[22px] border-4 border-surface bg-brand-soft font-heading text-2xl font-bold text-accent-text shadow-sm">
                  {initials || <UserRound className="size-8" aria-hidden="true" />}
                </span>
                <ProgressRing value={completeness} size={56} stroke={5} label="Profile completeness">
                  <span className="text-xs font-bold tabular-nums text-foreground">{completeness}%</span>
                </ProgressRing>
              </div>
              <h2 className="mt-3 font-heading text-lg font-semibold tracking-[-0.015em] text-foreground">
                {values.fullName || "Your health profile"}
              </h2>
              <p className="text-[13px] text-text-tertiary">
                {[values.age && `${values.age} yrs`, values.sex, values.bloodGroup].filter(Boolean).join(" · ") ||
                  "Add your details to personalise triage"}
              </p>

              <dl className="mt-5 grid grid-cols-3 gap-2">
                {[
                  ["Height", values.height ? `${values.height} cm` : "—"],
                  ["Weight", values.weight ? `${values.weight} kg` : "—"],
                  ["BMI", bmi ? String(bmi) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-border-subtle bg-subtle px-3 py-2.5">
                    <dt className="text-[11px] font-medium text-text-tertiary">{k}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
              {bmiLabel && <p className="mt-2 text-xs text-text-tertiary">BMI: {bmiLabel} (informational)</p>}

              <div className="mt-5 space-y-2 border-t border-border-subtle pt-4">
                {missing.length === 0 ? (
                  <p className="flex items-center gap-2 text-[13px] font-medium text-success">
                    <CircleCheckBig className="size-4" aria-hidden="true" />
                    Profile complete
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-text-secondary">Still missing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {missing.map((m) => (
                        <span key={m} className="rounded-md bg-muted px-2 py-0.5 text-xs text-text-secondary">
                          {m}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs">
            <Switch
              id="allow_ai_use"
              checked={allowAiUse}
              onCheckedChange={(checked) => setAllowAiUse(checked)}
              label="Use profile in assessments"
              description="Omnicura references your age, conditions, allergies and medications during triage to avoid repetitive questions."
            />
            <p className="mt-4 flex items-center gap-2 border-t border-border-subtle pt-4 text-xs text-text-tertiary">
              <Lock className="size-3.5 shrink-0" aria-hidden="true" />
              {user ? "Stored on this device and synced to your account" : "Stored privately on this device"}
            </p>
          </section>

          {isFirstTimeUser && (
            <section className="rounded-[20px] border border-brand/20 bg-brand-muted p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="size-4 text-accent" aria-hidden="true" />
                Exploring Omnicura?
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                Load a sample patient to see how a profile personalises assessments.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={handleQuickDemoFill}>
                Fill demo profile
              </Button>
            </section>
          )}
        </div>
      </aside>

      {/* ============ Form ============ */}
      <div className="space-y-5 lg:col-span-8">
        {errorMessage && (
          <div role="alert" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-danger/20 bg-danger-muted p-4 text-[13px] font-medium text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {saveSuccess && (
          <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-success/20 bg-success-muted p-4 animate-rise">
            <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-success" />
            <div>
              <p className="text-sm font-semibold text-foreground">Health profile saved</p>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                Omnicura will use this context in your next assessment{allowAiUse ? "" : " once personalisation is enabled"}.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <FormSection icon={UserRound} title="Personal & biometrics" description="Baseline details that shape clinical risk.">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="profile-fullname" hint="Optional">Full name</FieldLabel>
                <Input id="profile-fullname" placeholder="e.g. Alex Chen" autoComplete="name" {...register("fullName")} />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="profile-blood-group">
                  <span className="inline-flex items-center gap-1.5">
                    <Droplet className="size-3.5 text-text-tertiary" aria-hidden="true" />
                    Blood group
                  </span>
                </FieldLabel>
                <NativeSelect
                  id="profile-blood-group"
                  options={BLOOD_GROUPS}
                  currentValue={values.bloodGroup}
                  placeholder="Select blood group"
                  value={values.bloodGroup ?? ""}
                  {...register("bloodGroup")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="profile-age">Age</FieldLabel>
                <div className="relative">
                  <Input id="profile-age" type="number" inputMode="numeric" placeholder="26" className="pr-12 tabular-nums" {...register("age")} />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">yrs</span>
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="profile-sex">Biological sex</FieldLabel>
                <NativeSelect
                  id="profile-sex"
                  options={SEX_OPTIONS}
                  currentValue={values.sex}
                  placeholder="Select"
                  value={values.sex ?? ""}
                  {...register("sex")}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="profile-height">Height</FieldLabel>
                <div className="relative">
                  <Input id="profile-height" type="number" inputMode="decimal" placeholder="175" className="pr-11 tabular-nums" {...register("height")} />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">cm</span>
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="profile-weight">Weight</FieldLabel>
                <div className="relative">
                  <Input id="profile-weight" type="number" inputMode="decimal" placeholder="70" className="pr-11 tabular-nums" {...register("weight")} />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">kg</span>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection icon={Activity} title="Medical history & sensitivities" description="Separate multiple entries with commas.">
            <div className="space-y-2">
              <FieldLabel htmlFor="profile-allergies">Known allergies</FieldLabel>
              <Input id="profile-allergies" placeholder="e.g. Penicillin, Peanuts, Latex" {...register("allergies")} />
              <ChipPreview value={values.allergies} tone="danger" />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="profile-chronic-conditions">Chronic conditions</FieldLabel>
              <Input id="profile-chronic-conditions" placeholder="e.g. Asthma, Hypertension, Type 2 Diabetes" {...register("chronicConditions")} />
              <ChipPreview value={values.chronicConditions} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="profile-medications">Current daily medications</FieldLabel>
              <Input id="profile-medications" placeholder="e.g. Albuterol inhaler, Metformin 500mg" {...register("medications")} />
              <ChipPreview value={values.medications} />
            </div>
          </FormSection>

          <FormSection icon={Phone} title="Primary emergency contact" description="Who should be reached first in an emergency.">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="profile-emergency-name">Contact name</FieldLabel>
                <Input id="profile-emergency-name" placeholder="e.g. Dr. Sarah Chen" {...register("emergencyContactName")} />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="profile-emergency-phone">Phone number</FieldLabel>
                <Input id="profile-emergency-phone" type="tel" autoComplete="tel" placeholder="e.g. +234 803 123 4567" className="tabular-nums" {...register("emergencyContactNumber")} />
              </div>
            </div>
          </FormSection>

          {/* Sticky save bar */}
          <div className="sticky bottom-20 z-10 md:bottom-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface/95 p-3 pl-4 shadow-md backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-[13px] text-text-secondary">
                <ShieldCheck className="size-4 shrink-0 text-accent" aria-hidden="true" />
                Your data stays private and is never shared without consent.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleQuickDemoFill}>
                  Load demo
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  <Save />
                  Save profile
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
