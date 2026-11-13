"use client";

import * as React from "react";
import { PhoneCall } from "lucide-react";
import { DEFAULT_EMERGENCY_NUMBER } from "@/lib/constants";
import { EmergencyAlertModal } from "@/features/safety/components/emergency-alert-modal";
import { RedFlagCheckResult } from "@/types";

interface EmergencyFloatingButtonProps {
  onLocateFacilities?: () => void;
}

export function EmergencyFloatingButton({
  onLocateFacilities,
}: EmergencyFloatingButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const manualEmergencyResult: RedFlagCheckResult = {
    isEmergency: true,
    category: "User-Triggered Emergency Help",
    description: "Immediate emergency access requested.",
    immediateAction:
      "If you or someone near you needs emergency medical care, call emergency responders immediately.",
    emergencyNumber: DEFAULT_EMERGENCY_NUMBER,
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={`Emergency dial ${DEFAULT_EMERGENCY_NUMBER}`}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-danger px-4 py-3 font-semibold text-white shadow-overlay hover:opacity-90 active:translate-y-px transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 cursor-pointer"
      >
        <PhoneCall className="size-4" />
        <span className="text-sm">SOS ({DEFAULT_EMERGENCY_NUMBER})</span>
      </button>

      <EmergencyAlertModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        result={manualEmergencyResult}
        onLocateFacilities={onLocateFacilities}
      />
    </>
  );
}
