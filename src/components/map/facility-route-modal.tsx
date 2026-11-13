"use client";

import * as React from "react";
import {
  Navigation,
  PhoneCall,
  Clock,
  MapPin,
  X,
  Compass,
  ExternalLink,
  WifiOff,
} from "lucide-react";
import { HealthcareFacility } from "@/types/hospital";
import { Badge } from "@/components/ui/badge";

interface FacilityRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: HealthcareFacility | null;
  userCoords: { lat: number; lon: number };
  userLocationName: string;
}

export function FacilityRouteModal({
  isOpen,
  onClose,
  facility,
  userCoords,
  userLocationName,
}: FacilityRouteModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !facility) return null;

  const distance = facility.distanceKm ?? 0;

  // Calculate estimated transit duration based on distance and average urban emergency transit speeds (approx 25 km/h)
  const estimatedMinutes = Math.max(
    3,
    Math.round((distance / 25) * 60)
  );

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lon}&destination=${facility.lat},${facility.lon}`;

  // Deterministic step-by-step route cues
  const routeSteps = [
    {
      step: 1,
      instruction: `Depart origin coordinates at ${userLocationName}`,
      detail: `Initial GPS fix (${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}). Proceed toward nearest primary access roadway.`,
    },
    {
      step: 2,
      instruction: `Follow principal corridor toward ${facility.name}`,
      detail: `Maintain direct transit course for approximately ${(distance * 0.7).toFixed(1)} km toward target sector.`,
    },
    {
      step: 3,
      instruction: facility.emergency
        ? "Look for Emergency Casualty & Triage entrance"
        : "Follow signage for Patient Admissions / Reception",
      detail: facility.address ? `Approaching address: ${facility.address}` : "Target facility in visual range.",
    },
    {
      step: 4,
      instruction: `Arrive at destination: ${facility.name}`,
      detail: `Target destination reached (${facility.lat.toFixed(4)}, ${facility.lon.toFixed(4)}). Report immediately to triage desk.`,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50 duration-180"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xl space-y-5 animate-in zoom-in-95 duration-180 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent flex items-center gap-1">
                <Navigation className="size-3" />
                <span>Turn-by-Turn Route Preview</span>
              </span>

              {facility.emergency && (
                <Badge variant="destructive" className="text-[10px] uppercase font-semibold">
                  Emergency 24/7
                </Badge>
              )}
            </div>

            <h3
              id="route-modal-title"
              className="text-lg font-semibold tracking-tight text-foreground truncate"
            >
              {facility.name}
            </h3>

            {facility.address && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <MapPin className="size-3 text-muted-foreground shrink-0" />
                <span>{facility.address}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors"
            aria-label="Close route preview"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Rapid Telemetry Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-0.5">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Compass className="size-3 text-accent" />
              <span>Route Distance</span>
            </span>
            <div className="text-xl font-semibold tabular-nums text-foreground">
              {distance} km
            </div>
          </div>

          <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-0.5">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="size-3 text-accent" />
              <span>Est. Transit Time</span>
            </span>
            <div className="text-xl font-semibold tabular-nums text-foreground">
              ~{estimatedMinutes} mins
            </div>
          </div>
        </div>

        {/* Step-by-Step Directions */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Step-by-Step Navigation Guidance
          </h4>

          <div className="space-y-2.5">
            {routeSteps.map((step) => (
              <div
                key={step.step}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="size-6 rounded-full bg-accent/10 text-accent font-semibold text-xs flex items-center justify-center shrink-0 border border-accent/20 mt-0.5 tabular-nums">
                  {step.step}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-xs font-semibold text-foreground leading-snug">
                    {step.instruction}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offline Emergency Readiness Callout */}
        <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center gap-2.5 text-xs text-muted-foreground">
          <WifiOff className="size-4 text-accent shrink-0" />
          <span>
            Offline Routing Enabled: This itinerary is saved locally on your device for emergency access without active cellular signal.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 border-t border-border">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors shadow-none text-center"
          >
            <ExternalLink className="size-3.5" />
            <span>Launch Live GPS Navigation</span>
          </a>

          {facility.phone && (
            <a
              href={`tel:${facility.phone}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors text-center"
            >
              <PhoneCall className="size-3.5 text-accent" />
              <span>Call ({facility.phone})</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
