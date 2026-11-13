import * as React from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export interface ErrorStateProps {
  title?: string
  description?: string
  recoveryActionLabel?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "Something went wrong",
  description = "We were unable to complete this action. Please check your network connection and try again.",
  recoveryActionLabel = "Try Again",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-danger/30 bg-danger-muted p-6 sm:p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-3",
        className
      )}
    >
      <div className="size-11 rounded-lg bg-danger/10 text-danger flex items-center justify-center border border-danger/20">
        <AlertTriangle className="size-5 stroke-[1.75]" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-semibold text-danger tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="gap-1.5 border-danger/30 text-danger hover:bg-danger/10"
          >
            <RotateCcw className="size-3.5" />
            <span>{recoveryActionLabel}</span>
          </Button>
        </div>
      )}
    </div>
  )
}
