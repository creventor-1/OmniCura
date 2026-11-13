"use client";

import * as React from "react";
import { PhoneCall, MapPinned, Siren, Armchair, CarFront, DoorOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RedFlagCheckResult } from "@/types";
import { DEFAULT_EMERGENCY_NUMBER } from "@/lib/constants";

interface EmergencyAlertModalProps {
  isOpen: boolean;
  onClose?: () => void;
  result: RedFlagCheckResult | null;
  onLocateFacilities?: () => void;
}

export function EmergencyAlertModal({
  isOpen,
  onClose,
  result,
  onLocateFacilities,
}: EmergencyAlertModalProps) {
  if (!result || !result.isEmergency) return null;

  const emergencyNumber = result.emergencyNumber || DEFAULT_EMERGENCY_NUMBER;

  const steps = [
    { icon: Armchair, text: "Stay calm and remain seated or lying down in a safe position." },
    { icon: CarFront, text: "Do not drive yourself to the emergency department." },
    { icon: DoorOpen, text: "Unlock the door so responders can reach you quickly." },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent
        className="sm:max-w-[480px] overflow-hidden border-danger/30 p-0 gap-0"
        showCloseButton={false}
      >
        {/* Alarm header */}
        <div className="relative bg-danger px-6 pt-7 pb-6 text-white dark:text-[#2a0605]">
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.18),transparent)]" aria-hidden="true" />
          <DialogHeader className="relative items-center gap-3 text-center">
            <span className="relative flex size-14 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/10">
              <Siren className="size-7" aria-hidden="true" />
            </span>
            <DialogTitle className="text-2xl font-bold text-inherit">Possible medical emergency</DialogTitle>
            <DialogDescription className="text-[13px] font-medium text-inherit opacity-90">
              {result.category || "Critical symptoms identified"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-danger/25 bg-danger-muted p-4">
            <div className="type-overline text-danger">Immediate action</div>
            <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-foreground">
              {result.immediateAction ||
                "Call emergency medical services immediately. Do not delay seeking professional emergency care."}
            </p>
          </div>

          <ul className="space-y-2.5">
            {steps.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[13px] leading-relaxed text-text-secondary">
                <Icon className="mt-0.5 size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>

          <div className="space-y-2.5">
            <a
              href={`tel:${emergencyNumber}`}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-danger text-base font-bold text-white shadow-[0_10px_24px_-10px_var(--danger)] transition-all hover:bg-danger-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[4px] focus-visible:ring-danger/35 dark:text-[#2a0605]"
            >
              <PhoneCall className="size-5" aria-hidden="true" />
              Call {emergencyNumber} now
            </a>

            {onLocateFacilities && (
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onLocateFacilities();
                }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-surface text-[15px] font-semibold text-foreground transition-colors hover:bg-subtle cursor-pointer"
              >
                <MapPinned className="size-[18px] text-text-tertiary" aria-hidden="true" />
                Find the nearest emergency department
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-center text-xs font-medium text-text-tertiary underline-offset-4 transition-colors hover:text-text-secondary hover:underline cursor-pointer"
              >
                Dismiss and continue (at your own discretion)
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
