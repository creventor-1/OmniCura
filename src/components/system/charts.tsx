"use client";

import * as React from "react";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";

/* --------------------------------------------------------------------------
 * ActivityColumns — single-series column chart (brand hue only).
 * Thin columns (≤ 24px), 4px rounded data-end, square at the baseline,
 * hairline gridlines, per-column hover tooltip, sr-only table view.
 * ------------------------------------------------------------------------ */
export interface ActivityDatum {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
}

interface ActivityColumnsProps {
  data: ActivityDatum[];
  height?: number;
  unit?: string;
  className?: string;
}

export function ActivityColumns({
  data,
  height = 132,
  unit = "assessment",
  className,
}: ActivityColumnsProps) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 2) * 2;
  const ticks = [niceMax, niceMax / 2, 0];

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex gap-3">
        {/* Y-axis ticks */}
        <div
          className="flex flex-col justify-between text-[11px] tabular-nums text-text-tertiary text-right w-5 shrink-0"
          style={{ height }}
          aria-hidden="true"
        >
          {ticks.map((t) => (
            <span key={t} className="leading-none -translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {t}
            </span>
          ))}
        </div>

        <div className="relative flex-1 min-w-0">
          {/* Gridlines */}
          <div className="absolute inset-x-0 top-0 flex flex-col justify-between pointer-events-none" style={{ height }} aria-hidden="true">
            {ticks.map((t) => (
              <div key={t} className="h-px w-full bg-border-subtle" />
            ))}
          </div>

          {/* Columns */}
          <div
            className="relative flex items-end justify-between gap-[2px]"
            style={{ height }}
            role="img"
            aria-label={`Daily ${unit} activity for the last ${data.length} days`}
          >
            {data.map((d, i) => {
              const h = d.value === 0 ? 0 : Math.max(4, (d.value / niceMax) * height);
              const isActive = hovered === i;
              return (
                <div
                  key={d.key}
                  className="relative flex-1 h-full flex items-end justify-center cursor-default"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  tabIndex={0}
                  aria-label={`${d.label}: ${d.value} ${unit}${d.value === 1 ? "" : "s"}`}
                >
                  {/* hover band */}
                  <div
                    className={cn(
                      "absolute inset-x-0 inset-y-0 rounded-md transition-colors",
                      isActive ? "bg-muted/70" : "bg-transparent"
                    )}
                  />
                  <div
                    className={cn(
                      "relative w-full max-w-[22px] rounded-t-[4px] origin-bottom animate-grow-y transition-colors",
                      d.value === 0
                        ? "bg-transparent"
                        : isActive
                        ? "bg-brand-hover"
                        : "bg-brand"
                    )}
                    style={{ height: h, animationDelay: `${i * 28}ms` }}
                  />
                  {d.value === 0 && (
                    <div className="absolute bottom-0 w-full max-w-[22px] h-[2px] rounded-full bg-border-strong/70" />
                  )}

                  {isActive && (
                    <div
                      role="tooltip"
                      className="absolute z-10 bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-inverse text-app px-2.5 py-1.5 text-xs shadow-md animate-fade pointer-events-none"
                    >
                      <div className="font-semibold">{d.label}</div>
                      <div className="opacity-80 tabular-nums">
                        {d.value} {unit}
                        {d.value === 1 ? "" : "s"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* X labels — sparse: first, middle, last */}
          <div className="flex justify-between pt-2 text-[11px] text-text-tertiary" aria-hidden="true">
            <span>{data[0]?.shortLabel}</span>
            <span>{data[Math.floor(data.length / 2)]?.shortLabel}</span>
            <span>{data[data.length - 1]?.shortLabel}</span>
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Daily {unit} counts</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.label}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * SegmentedShare — one whole split into parts (thin 8px bar + legend).
 * Status colours ship with icon + label; never colour alone.
 * ------------------------------------------------------------------------ */
export interface SegmentDatum {
  key: string;
  label: string;
  value: number;
  colorClass: string;
  icon?: LucideIcon;
  iconClass?: string;
}

export function SegmentedShare({
  data,
  className,
  emptyLabel = "No data yet",
}: {
  data: SegmentDatum[];
  className?: string;
  emptyLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hovered, setHovered] = React.useState<string | null>(null);

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={
          total === 0
            ? emptyLabel
            : data.map((d) => `${d.label}: ${d.value} (${Math.round((d.value / total) * 100)}%)`).join(", ")
        }
      >
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((d, i) => (
              <div
                key={d.key}
                className={cn(
                  "h-full origin-left animate-grow-x transition-opacity first:rounded-l-full last:rounded-r-full",
                  d.colorClass,
                  hovered && hovered !== d.key ? "opacity-35" : "opacity-100"
                )}
                style={{ width: `${(d.value / total) * 100}%`, animationDelay: `${i * 80}ms` }}
              />
            ))}
      </div>

      <ul className="space-y-1">
        {data.map((d) => {
          const Icon = d.icon;
          const pct = total === 0 ? 0 : Math.round((d.value / total) * 100);
          return (
            <li
              key={d.key}
              onMouseEnter={() => setHovered(d.key)}
              onMouseLeave={() => setHovered(null)}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/60 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-[13px] text-text-secondary min-w-0">
                <span className={cn("size-2.5 rounded-[3px] shrink-0", d.colorClass)} aria-hidden="true" />
                {Icon && <Icon className={cn("size-3.5 shrink-0", d.iconClass)} aria-hidden="true" />}
                <span className="truncate font-medium text-foreground">{d.label}</span>
              </span>
              <span className="flex items-baseline gap-2 text-[13px] tabular-nums">
                <span className="font-semibold text-foreground">{d.value}</span>
                <span className="text-text-tertiary w-9 text-right">{pct}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * ProgressRing — single-value meter; track is a lighter step of the fill hue.
 * ------------------------------------------------------------------------ */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  className,
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const [drawn, setDrawn] = React.useState(0);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" className="stroke-brand-soft" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          className="stroke-brand transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
          strokeDasharray={c}
          strokeDashoffset={c - (drawn / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Meter — horizontal fill bar (single hue), used for likelihood / completeness.
 * ------------------------------------------------------------------------ */
export function Meter({
  value,
  className,
  fillClass = "bg-brand",
  trackClass = "bg-brand-soft/70",
  label,
}: {
  value: number;
  className?: string;
  fillClass?: string;
  trackClass?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-2 w-full rounded-full overflow-hidden", trackClass, className)}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full origin-left animate-grow-x", fillClass)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
