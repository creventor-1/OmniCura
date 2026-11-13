import * as React from "react";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <div className="hidden sm:flex size-12 shrink-0 items-center justify-center rounded-2xl bg-surface border border-border-subtle shadow-xs text-accent">
            <Icon className="size-[22px] stroke-[1.75]" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="type-overline text-text-tertiary">{eyebrow}</p>
          )}
          <h1 className="type-title text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
}

export function SectionHeader({
  title,
  description,
  action,
  className,
  as: Tag = "h2",
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <Tag className="type-heading text-foreground">{title}</Tag>
        {description && (
          <p className="text-[13px] text-text-tertiary mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
