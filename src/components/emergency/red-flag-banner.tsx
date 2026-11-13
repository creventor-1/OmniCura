"use client"

import * as React from "react"
import { PhoneCall, Siren, MapPinned } from "lucide-react"
import { RedFlagCheckResult } from "@/types"
import { DEFAULT_EMERGENCY_NUMBER } from "@/lib/constants"
import { cn } from "cn"

export interface RedFlagBannerProps {
  result: RedFlagCheckResult | null
  onLocateFacilities?: () => void
  className?: string
}

export function RedFlagBanner({
  result,
  onLocateFacilities,
  className = "",
}: RedFlagBannerProps) {
  if (!result || !result.isEmergency) {
    return null
  }

  const emergencyNumber = result.emergencyNumber || DEFAULT_EMERGENCY_NUMBER

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "relative mb-6 w-full overflow-hidden rounded-[20px] border border-danger/30 bg-surface text-left shadow-xs animate-rise",
        className
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-danger" aria-hidden="true" />
      <div className="flex flex-col gap-4 p-5 pl-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-danger text-white dark:text-[#2a0605]">
            <span className="absolute inset-0 rounded-2xl text-danger animate-pulse-ring" aria-hidden="true" />
            <Siren className="size-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-overline text-danger">Emergency red flag</span>
              {result.category && (
                <span className="rounded-full bg-danger-muted px-2 py-0.5 text-[11px] font-semibold text-danger">
                  {result.category}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Seek immediate professional medical attention
            </h3>
            <p className="max-w-2xl text-[13px] leading-relaxed text-text-secondary">
              {result.description ||
                "Your reported symptoms match clinical red-flag emergency protocols. Do not delay seeking urgent medical care."}
            </p>
            {result.immediateAction && (
              <p className="max-w-2xl text-[13px] leading-relaxed text-foreground">
                <span className="font-semibold text-danger">Immediate action: </span>
                {result.immediateAction}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <a
            href={`tel:${emergencyNumber}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger px-5 text-sm font-semibold text-white transition-colors hover:bg-danger-strong dark:text-[#2a0605]"
          >
            <PhoneCall className="size-4" aria-hidden="true" />
            Call {emergencyNumber}
          </a>
          {onLocateFacilities && (
            <button
              type="button"
              onClick={onLocateFacilities}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-subtle cursor-pointer"
            >
              <MapPinned className="size-4 text-text-tertiary" aria-hidden="true" />
              Nearest ER
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
