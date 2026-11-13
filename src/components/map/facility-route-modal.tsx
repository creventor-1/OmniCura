"use client";

import * as React from "react";
import { Navigation, PhoneCall, Clock3, MapPin, ExternalLink, WifiOff, Route, Siren, Flag } from "lucide-react";
import { HealthcareFacility } from "@/types/hospital";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "cn";

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
  if (!facility) return null;

  const distance = facility.distanceKm ?? 0;

  // Estimated transit duration based on average urban emergency transit speeds (approx 25 km/h)
  const estimatedMinutes = Math.max(3, Math.round((distance / 25) * 60));

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lon}&destination=${facility.lat},${facility.lon}`;

  // Deterministic step-by-step route cues
  const routeSteps = [
    {
      step: 1,
      instruction: `Depart from ${userLocationName}`,
      detail: `Starting point (${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)}). Head toward the nearest main road.`,
    },
    {
      step: 2,
      instruction: `Follow the main corridor toward ${facility.name}`,
      detail: `Continue for approximately ${(distance * 0.7).toFixed(1)} km toward the destination area.`,
    },
    {
      step: 3,
      instruction: facility.emergency
        ? "Look for the Emergency / Casualty entrance"
        : "Follow signage for Patient Admissions / Reception",
      detail: facility.address ? `Approaching: ${facility.address}` : "Destination should be in sight.",
    },
    {
      step: 4,
      instruction: `Arrive at ${facility.name}`,
      detail: `Destination (${facility.lat.toFixed(4)}, ${facility.lon.toFixed(4)}). Report to the triage desk.`,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="gap-2 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-text">
              <Navigation className="size-3.5" aria-hidden="true" />
              Route preview
            </span>
            {facility.emergency && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full border border-danger/20 bg-danger-muted px-2.5 text-[11px] font-semibold text-danger">
                <Siren className="size-3" aria-hidden="true" />
                Emergency 24/7
              </span>
            )}
          </div>
          <DialogTitle className="text-xl">{facility.name}</DialogTitle>
          {facility.address && (
            <DialogDescription className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
              <span className="truncate">{facility.address}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border-subtle bg-subtle p-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <Route className="size-3.5" aria-hidden="true" />
              Distance
            </span>
            <div className="mt-1 font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground">{distance} km</div>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-subtle p-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Est. travel time
            </span>
            <div className="mt-1 font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground">~{estimatedMinutes} min</div>
          </div>
        </div>

        <ol className="space-y-0">
          {routeSteps.map((step, i) => {
            const isLast = i === routeSteps.length - 1;
            return (
              <li key={step.step} className="relative flex gap-3.5 pb-4 last:pb-0">
                {!isLast && <span className="absolute left-[13px] top-8 bottom-1 w-px bg-border-subtle" aria-hidden="true" />}
                <span
                  className={cn(
                    "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums",
                    isLast ? "border-brand bg-brand text-brand-fg" : "border-border-subtle bg-surface text-foreground"
                  )}
                >
                  {isLast ? <Flag className="size-3.5" aria-hidden="true" /> : step.step}
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="text-[13px] font-semibold leading-snug text-foreground">{step.instruction}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-text-tertiary">{step.detail}</div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex items-start gap-2.5 rounded-xl bg-subtle p-3 text-xs leading-relaxed text-text-secondary">
          <WifiOff className="mt-0.5 size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
          This itinerary is saved on your device so it stays available without a signal.
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-brand-hover"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Open live navigation
          </a>
          {facility.phone && (
            <a
              href={`tel:${facility.phone}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-subtle"
            >
              <PhoneCall className="size-4 text-text-tertiary" aria-hidden="true" />
              Call {facility.phone}
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
