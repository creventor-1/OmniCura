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
  children?: React.ReactNode
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
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-2xl flex-col items-center justify-center overflow-hidden rounded-[22px] border border-border-subtle bg-surface px-6 py-14 text-center shadow-xs sm:px-10",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]" aria-hidden="true" />
      <div className="relative">
        <div className="absolute inset-0 -m-3 rounded-[22px] bg-brand-muted blur-xl opacity-70" aria-hidden="true" />
        <div className="relative flex size-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface text-accent shadow-sm">
          <Icon className="size-6 stroke-[1.75]" />
        </div>
      </div>

      <div className="relative mt-6 max-w-md space-y-2">
        <h3 className="font-heading text-lg font-semibold tracking-[-0.015em] text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="relative mt-7 flex flex-wrap items-center justify-center gap-2.5">
          {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
      {children && <div className="relative mt-8 w-full">{children}</div>}
    </div>
  )
}
