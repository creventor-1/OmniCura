import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "cn"
import { getAcuity } from "@/lib/acuity"

export type SeverityLevel = "non-urgent" | "urgent" | "emergency"

interface SeverityBadgeProps {
  severity: SeverityLevel | string
  className?: string
  showIcon?: boolean
  size?: "sm" | "md"
}

export function SeverityBadge({
  severity,
  className,
  showIcon = true,
  size = "sm",
}: SeverityBadgeProps) {
  const acuity = getAcuity(severity)
  const Icon = acuity?.icon ?? Clock

  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "h-6 px-2.5 text-xs" : "h-7 px-3 text-[13px]",
        acuity
          ? [acuity.bg, acuity.text, acuity.border]
          : "bg-muted text-text-secondary border-border-subtle",
        className
      )}
    >
      {showIcon && <Icon className={cn("shrink-0 stroke-[2.25]", size === "sm" ? "size-3.5" : "size-4")} aria-hidden="true" />}
      <span>{acuity?.label ?? severity}</span>
    </span>
  )
}
