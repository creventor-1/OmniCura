"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, UserPlus, Shield, HeartPulse } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HeartPulse className="size-6" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {mode === "signin" ? "Welcome Back to TriageAI" : "Create Your TriageAI Account"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {promptMessage ||
              (mode === "signin"
                ? "Sign in to access your assessment history and health profile."
                : "Create an account to securely save and export your medical assessments.")}
          </DialogDescription>
        </DialogHeader>

        {authError && (
          <Alert variant="destructive" className="py-2 text-xs">
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {signupSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mx-auto">
              <Shield className="size-5" />
            </div>
            <h4 className="font-semibold text-sm">Account Created Successfully!</h4>
            <p className="text-xs text-muted-foreground">
              You are now signed in. Your assessment data is saved.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="name@example.com"
                {...register("email")}
                disabled={isSubmitting}
                className="text-sm h-10"
              />
              {errors.email && (
                <span className="text-[11px] text-destructive">{errors.email.message}</span>
              )}
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-medium text-foreground">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register("password")}
                disabled={isSubmitting}
                className="text-sm h-10"
              />
              {errors.password && (
                <span className="text-[11px] text-destructive">{errors.password.message}</span>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2 font-medium">
              {isSubmitting ? (
                <>
                  <Spinner size="sm" />
                  <span>Processing...</span>
                </>
              ) : mode === "signin" ? (
                <>
                  <LogIn className="size-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Create Account &amp; Save
                </>
              )}
            </Button>

            <div className="text-center pt-2 text-xs text-muted-foreground">
              {mode === "signin" ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setAuthError(null);
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setAuthError(null);
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
