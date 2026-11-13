import * as React from "react";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

type Tone = "brand" | "neutral" | "danger" | "warning" | "success" | "info";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-muted text-accent border-brand/10",
  neutral: "bg-muted text-text-secondary border-border-subtle",
  danger: "bg-danger-muted text-danger border-danger/15",
  warning: "bg-warning-muted text-warning-text border-warning/20",
  success: "bg-success-muted text-success border-success/15",
  info: "bg-info-muted text-info border-info/15",
};

const sizeClasses = {
  sm: "size-8 rounded-lg [&>svg]:size-4",
  md: "size-10 rounded-xl [&>svg]:size-[18px]",
  lg: "size-12 rounded-2xl [&>svg]:size-[22px]",
};

interface IconTileProps {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function IconTile({ icon: Icon, tone = "brand", size = "md", className }: IconTileProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border",
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      aria-hidden="true"
    >
      <Icon className="stroke-[1.85]" />
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border-subtle bg-surface px-1.5 font-sans text-[11px] font-medium text-text-tertiary shadow-xs",
        className
      )}
    >
      {children}
    </kbd>
  );
}
