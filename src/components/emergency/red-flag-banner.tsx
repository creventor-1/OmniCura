"use client"

import * as React from "react"
import { PhoneCall, ShieldAlert, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        "w-full rounded-xl border border-danger/40 bg-surface shadow-xs p-4 sm:p-5 text-left space-y-3 mb-5 animate-in fade-in-50 duration-180",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-lg bg-danger-muted border border-danger/30 text-danger flex items-center justify-center shrink-0">
          <ShieldAlert className="size-5 stroke-[2]" />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-danger px-2 py-0.5 rounded-full bg-danger-muted border border-danger/30">
              Emergency Safety Indicator
            </span>
            {result.category && (
              <span className="text-xs font-semibold text-text-secondary">
                {result.category}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground tracking-tight">
            Immediate Professional Medical Attention Required
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {result.description ||
              "Your reported symptoms match clinical red-flag emergency protocols. Do not delay seeking urgent medical care."}
          </p>
        </div>
      </div>

      {result.immediateAction && (
        <div className="rounded-lg bg-danger-muted/60 border border-danger/20 p-3 text-xs sm:text-sm font-medium text-foreground">
          <strong className="text-danger font-semibold">Immediate Action: </strong>
          {result.immediateAction}
        </div>
      )}

      {/* Prominent Emergency Action Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
        <Button
          variant="danger"
          size="default"
          onClick={() => {
            window.location.href = `tel:${emergencyNumber}`
          }}
          className="gap-2 text-sm font-semibold flex-1 h-10 shadow-xs"
        >
          <PhoneCall className="size-4" />
          <span>Call Emergency ({emergencyNumber})</span>
        </Button>

        {onLocateFacilities && (
          <Button
            variant="outline"
            size="default"
            onClick={onLocateFacilities}
            className="gap-2 text-sm font-medium border-border-subtle h-10"
          >
            <MapPin className="size-4 text-accent" />
            <span>Find Nearest Emergency Room</span>
          </Button>
        )}
      </div>
    </div>
  )
}
