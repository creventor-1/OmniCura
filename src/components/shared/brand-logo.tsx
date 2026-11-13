import * as React from "react";

interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

export function TriageAILogo({
  size = "md",
  showWordmark = false,
  className = "",
  ...props
}: BrandLogoProps) {
  const sizeMap = {
    sm: { icon: 24, text: "text-base", sub: "text-[9px]" },
    md: { icon: 32, text: "text-lg", sub: "text-[10px]" },
    lg: { icon: 40, text: "text-xl", sub: "text-[11px]" },
    xl: { icon: 48, text: "text-2xl", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];

  const iconElement = (
    <svg
      width={currentSize.icon}
      height={currentSize.icon}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 hover:scale-105 ${className}`}
      {...props}
    >
      <defs>
        {/* Soothing Healthcare Blue-Cyan Gradient */}
        <linearGradient id="triageGradientPrimary" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" /> {/* Sky-600 */}
          <stop offset="100%" stopColor="#0d9488" /> {/* Teal-600 */}
        </linearGradient>

        <linearGradient id="triagePulseGradient" x1="8" y1="20" x2="32" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.9" />
        </linearGradient>

        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Rounded Hexagonal Shield / Medical Emblem */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        fill="url(#triageGradientPrimary)"
        filter="url(#softGlow)"
      />

      {/* Subtle Inner Border */}
      <rect
        x="3"
        y="3"
        width="34"
        height="34"
        rx="9"
        stroke="#ffffff"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />

      {/* Stylized Medical Cross + EKG Rhythm Heartbeat Line */}
      <path
        d="M9 21.5H15L17.5 15.5L21.5 26.5L24.5 18.5L26.5 21.5H31"
        stroke="url(#triagePulseGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* AI Spark / Intelligence Star Node in top-right */}
      <circle cx="28.5" cy="11.5" r="2.25" fill="#38bdf8" />
      <circle cx="28.5" cy="11.5" r="4" stroke="#38bdf8" strokeWidth="0.75" strokeOpacity="0.6" />
      <circle cx="11.5" cy="28.5" r="1.5" fill="#99f6e4" opacity="0.8" />
    </svg>
  );

  if (!showWordmark) {
    return iconElement;
  }

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {iconElement}
      <div className="flex flex-col text-left">
        <div className={`font-black tracking-tight leading-none ${currentSize.text} flex items-center gap-1 text-foreground`}>
          <span>Triage</span>
          <span className="text-primary bg-gradient-to-r from-sky-600 to-teal-600 dark:from-sky-400 dark:to-teal-400 bg-clip-text text-transparent">
            AI
          </span>
        </div>
        <span className={`font-bold tracking-wider uppercase text-muted-foreground ${currentSize.sub} mt-0.5`}>
          Clinical Assistant
        </span>
      </div>
    </div>
  );
}
