import * as React from "react"
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "cn"

export type SeverityLevel = "non-urgent" | "urgent" | "emergency"

interface SeverityBadgeProps {
  severity: SeverityLevel | string
  className?: string
  showIcon?: boolean
}

export function SeverityBadge({
  severity,
  className,
  showIcon = true,
}: SeverityBadgeProps) {
  const normSeverity = (severity || "").toLowerCase() as SeverityLevel

  const config = {
    "non-urgent": {
      variant: "success" as const,
      label: "Non-Urgent",
      icon: CheckCircle2,
    },
    urgent: {
      variant: "warning" as const,
      label: "Urgent Care Advised",
      icon: Clock,
    },
    emergency: {
      variant: "danger" as const,
      label: "Emergency Required",
      icon: AlertTriangle,
    },
  }[normSeverity] || {
    variant: "secondary" as const,
    label: severity,
    icon: Clock,
  }

  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn("gap-1 font-semibold capitalize", className)}>
      {showIcon && <Icon className="size-3 shrink-0 stroke-[2]" />}
      <span>{config.label}</span>
    </Badge>
  )
}
