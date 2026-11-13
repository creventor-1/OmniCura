"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, UserPlus, ShieldCheck, Lock } from "lucide-react";
import { OmnicuraLogo } from "@/components/shared/brand-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "../context/auth-context";
import { createClient } from "@/services/database/supabase/client";

const AuthSchema = z.object({
  email: z.string().email("Please provide a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type AuthFormData = z.infer<typeof AuthSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
  promptMessage?: string;
  onSuccess?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  defaultMode = "signin",
  promptMessage,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = React.useState<"signin" | "signup">(defaultMode);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [signupSuccess, setSignupSuccess] = React.useState(false);

  const { signIn, signUp, guestAssessment, setGuestAssessment } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(AuthSchema),
  });

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setMode(defaultMode);
        setAuthError(null);
        setSignupSuccess(false);
        reset();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [defaultMode, isOpen, reset]);

  const savePendingGuestAssessment = async (userId: string) => {
    if (!guestAssessment) return;
    try {
      await supabase.from("assessments").insert({
        user_id: userId,
        symptoms: guestAssessment.symptoms,
        severity: guestAssessment.assessment.severity,
        assessment_result: guestAssessment.assessment,
        disclaimer: guestAssessment.assessment.disclaimer,
      });
      setGuestAssessment(null);
    } catch (e) {
      console.warn("Failed to persist guest assessment upon login:", e);
    }
  };

  const onSubmit = async (data: AuthFormData) => {
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          setAuthError(error.message || "Invalid email or password.");
        } else {
          // Check session user
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user) {
            await savePendingGuestAssessment(sessionData.session.user.id);
          }
          if (onSuccess) onSuccess();
          onClose();
        }
      } else {
        const { error, user } = await signUp(data.email, data.password);
        if (error) {
          setAuthError(error.message || "Registration failed. Please try again.");
        } else {
          if (user) {
            await savePendingGuestAssessment(user.id);
          }
          setSignupSuccess(true);
          if (onSuccess) onSuccess();
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      }
    } catch (err: unknown) {
      setAuthError((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] gap-6">
        <DialogHeader className="items-center gap-3 text-center">
          <OmnicuraLogo size="xl" />
          <DialogTitle className="text-xl">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </DialogTitle>
          <DialogDescription className="max-w-xs">
            {promptMessage ||
              (mode === "signin"
                ? "Sign in to access your assessment history and health profile."
                : "Securely save, sync and export your clinical assessments.")}
          </DialogDescription>
        </DialogHeader>

        {/* Mode switch */}
        {!signupSuccess && (
          <div className="grid grid-cols-2 rounded-xl bg-muted p-1" role="tablist" aria-label="Account mode">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setAuthError(null);
                }}
                className={
                  mode === m
                    ? "h-9 rounded-lg bg-surface text-[13px] font-semibold text-foreground shadow-sm cursor-pointer"
                    : "h-9 rounded-lg text-[13px] font-medium text-text-secondary hover:text-foreground cursor-pointer"
                }
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
        )}

        {authError && (
          <Alert variant="destructive" className="py-3">
            <AlertDescription className="text-danger mt-0">{authError}</AlertDescription>
          </Alert>
        )}

        {signupSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center animate-rise">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-success/20 bg-success-muted text-success">
              <ShieldCheck className="size-6" />
            </span>
            <h4 className="text-base font-semibold text-foreground">Account created</h4>
            <p className="text-sm text-text-secondary">
              You&apos;re signed in. Your assessment data is saved securely.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              {...register("email")}
              disabled={isSubmitting}
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="At least 6 characters"
              {...register("password")}
              disabled={isSubmitting}
              error={errors.password?.message}
            />

            <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
              {isSubmitting ? (
                "Please wait…"
              ) : mode === "signin" ? (
                <>
                  <LogIn />
                  Sign in
                </>
              ) : (
                <>
                  <UserPlus />
                  Create account &amp; save
                </>
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-text-tertiary">
              <Lock className="size-3.5" />
              Encrypted and protected with row-level security
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
