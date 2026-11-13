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
    sm: { icon: 20, text: "text-sm", sub: "text-[10px]" },
    md: { icon: 28, text: "text-base", sub: "text-[11px]" },
    lg: { icon: 32, text: "text-lg", sub: "text-xs" },
    xl: { icon: 40, text: "text-xl", sub: "text-xs" },
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
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="8"
        className="fill-[#12305A] dark:fill-[#111A2E] stroke-[#E3E8EE] dark:stroke-[#1F2B45]"
        strokeWidth="1.5"
      />
      <path
        d="M7 16H11.5L13.5 11.5L16.5 20.5L19 14L20.5 16H25"
        className="stroke-[#14A3B3]"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22.5" cy="8.5" r="1.75" className="fill-[#14A3B3]" />
    </svg>
  );

  if (!showWordmark) {
    return iconElement;
  }

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {iconElement}
      <div className="flex flex-col text-left">
        <div className={`font-semibold tracking-tight leading-none ${currentSize.text} text-foreground flex items-center gap-0.5`}>
          <span>Triage</span>
          <span className="text-accent font-bold">AI</span>
        </div>
        <span className={`font-medium tracking-wide text-muted-foreground ${currentSize.sub} mt-0.5`}>
          Clinical Decision Support
        </span>
      </div>
    </div>
  );
}
