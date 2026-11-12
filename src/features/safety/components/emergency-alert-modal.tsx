"use client";

import * as React from "react";
import { AlertTriangle, PhoneCall, MapPin, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose && onClose()}>
      <DialogContent className="sm:max-w-md border-red-600 bg-red-950/95 text-red-50 backdrop-blur-md">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-600/30 ring-8 ring-red-600/20 text-red-400">
            <AlertTriangle className="size-8 animate-pulse text-red-500" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold tracking-tight text-white">
            Medical Emergency Detected
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-red-200">
            {result.category || "Critical Symptoms Identified"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2 text-sm text-red-100">
          <div className="rounded-lg bg-red-900/60 p-3.5 border border-red-700/60">
            <h4 className="font-semibold text-white flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wider">
              <ShieldAlert className="size-4 text-red-400" />
              Immediate Action Required
            </h4>
            <p className="leading-relaxed">
              {result.immediateAction ||
                "Call emergency medical services immediately. Do not delay seeking professional emergency care."}
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-red-300">
            <p>• Stay calm and remain in a safe, seated or resting position.</p>
            <p>• Do not attempt to drive yourself to the emergency department.</p>
            <p>• Keep doors unlocked so first responders can enter quickly.</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <a
            href={`tel:${emergencyNumber}`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-red-900/50 hover:bg-red-500 active:scale-[0.98] transition-all text-base"
          >
            <PhoneCall className="size-5 animate-bounce" />
            Call Emergency Services ({emergencyNumber})
          </a>

          {onLocateFacilities && (
            <Button
              type="button"
              variant="outline"
              onClick={onLocateFacilities}
              className="w-full border-red-800 bg-red-900/30 text-white hover:bg-red-900/60"
            >
              <MapPin className="size-4 mr-1.5" />
              Find Nearest Emergency Facility
            </Button>
          )}

          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="w-full text-xs text-red-300 hover:text-white hover:bg-red-900/40"
            >
              Dismiss and continue assessment (under your own responsibility)
              <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
