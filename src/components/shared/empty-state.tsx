import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border-subtle bg-surface p-8 sm:p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-3",
        className
      )}
    >
      <div className="size-12 rounded-lg bg-secondary flex items-center justify-center text-text-secondary border border-border-subtle">
        <Icon className="size-6 stroke-[1.5]" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-foreground tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {actionLabel && onAction && (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
