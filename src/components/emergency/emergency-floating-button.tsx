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
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 font-semibold text-white shadow-xl shadow-red-600/30 hover:bg-red-500 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-red-400"
      >
        <PhoneCall className="size-4 animate-pulse" />
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
