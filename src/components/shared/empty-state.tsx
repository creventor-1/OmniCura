import * as React from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
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
      className={`rounded-3xl border border-dashed border-border/80 bg-card/60 p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-4 animate-in fade-in-50 duration-200 ${className}`}
    >
      <div className="relative">
        {/* Soft background pulse halo */}
        <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xs">
          <Icon className="size-8 stroke-[1.75]" />
        </div>
        <div className="absolute -top-1 -right-1 size-3 rounded-full bg-primary/30 animate-ping" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {actionLabel && onAction && (
            <Button
              size="sm"
              onClick={onAction}
              className="rounded-xl px-4 font-semibold text-xs h-9 shadow-xs"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              className="rounded-xl px-4 text-xs h-9"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
