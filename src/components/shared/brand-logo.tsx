import * as React from "react";

export interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

export function OmnicuraLogo({
  size = "md",
  showWordmark = false,
  className = "",
  ...props
}: BrandLogoProps) {
  const sizeMap = {
    sm: { icon: 22, text: "text-sm", sub: "text-[9px]" },
    md: { icon: 28, text: "text-base", sub: "text-[10px]" },
    lg: { icon: 34, text: "text-lg", sub: "text-[11px]" },
    xl: { icon: 42, text: "text-xl", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];

  const iconElement = (
    <svg
      width={currentSize.icon}
      height={currentSize.icon}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {/* Background container tile */}
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="8"
        className="fill-[#0B1B33] dark:fill-[#0F172A] stroke-[#E3E8EE] dark:stroke-[#1E293B]"
        strokeWidth="1"
      />

      {/* Top-Left Quadrant */}
      <path
        d="M14.25 5.5C8.865 5.5 5.5 8.865 5.5 14.25H12.75C13.578 14.25 14.25 13.578 14.25 12.75V5.5Z"
        className="fill-white/90 dark:fill-slate-200"
      />

      {/* Top-Right Quadrant (Accent / Intelligence Node) */}
      <path
        d="M17.75 12.75C17.75 13.578 18.422 14.25 19.25 14.25H26.5C26.5 8.865 23.135 5.5 17.75 5.5V12.75Z"
        className="fill-[#14A3B3] dark:fill-[#2DD4BF]"
      />

      {/* Bottom-Right Quadrant */}
      <path
        d="M19.25 17.75C18.422 17.75 17.75 18.422 17.75 19.25V26.5C23.135 26.5 26.5 23.135 26.5 17.75H19.25Z"
        className="fill-white/90 dark:fill-slate-200"
      />

      {/* Bottom-Left Quadrant */}
      <path
        d="M12.75 17.75H5.5C5.5 23.135 8.865 26.5 14.25 26.5V19.25C14.25 18.422 13.578 17.75 12.75 17.75Z"
        className="fill-white/90 dark:fill-slate-200"
      />

      {/* Center Neural Pulse Core */}
      <circle
        cx="16"
        cy="16"
        r="1.75"
        className="fill-[#14A3B3] dark:fill-[#2DD4BF]"
      />
    </svg>
  );

  if (!showWordmark) {
    return iconElement;
  }

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {iconElement}
      <div className="flex flex-col text-left">
        <div className={`font-semibold tracking-tight leading-none ${currentSize.text} text-foreground flex items-center gap-1.5`}>
          <span className="font-bold tracking-tight text-foreground">Omnicura</span>
          <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
            Clinical
          </span>
        </div>
        <span className={`font-medium tracking-wider uppercase text-muted-foreground ${currentSize.sub} mt-0.5`}>
          Clinical Decision Support
        </span>
      </div>
    </div>
  );
}

// Backward-compatibility alias
export const TriageAILogo = OmnicuraLogo;
