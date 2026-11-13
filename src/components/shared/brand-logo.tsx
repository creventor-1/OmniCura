import * as React from "react";

export interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
}

/**
 * Omnicura mark — four rounded quadrants form a negative-space medical cross;
 * the mint quadrant is the "intelligence" node.
 */
export function OmnicuraLogo({
  size = "md",
  showWordmark = false,
  showTagline = false,
  className = "",
  ...props
}: BrandLogoProps) {
  const sizeMap = {
    sm: { icon: 28, text: "text-[15px]", sub: "text-[10.5px]" },
    md: { icon: 32, text: "text-base", sub: "text-[11px]" },
    lg: { icon: 38, text: "text-lg", sub: "text-xs" },
    xl: { icon: 46, text: "text-xl", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];
  const gradientId = React.useId();

  const iconElement = (
    <svg
      width={currentSize.icon}
      height={currentSize.icon}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14917F" />
          <stop offset="1" stopColor="#0A5650" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" stroke="white" strokeOpacity="0.14" />
      <path d="M14.25 5.5C8.865 5.5 5.5 8.865 5.5 14.25H12.75C13.578 14.25 14.25 13.578 14.25 12.75V5.5Z" fill="white" />
      <path d="M17.75 12.75C17.75 13.578 18.422 14.25 19.25 14.25H26.5C26.5 8.865 23.135 5.5 17.75 5.5V12.75Z" fill="#8BEBDD" />
      <path d="M19.25 17.75C18.422 17.75 17.75 18.422 17.75 19.25V26.5C23.135 26.5 26.5 23.135 26.5 17.75H19.25Z" fill="white" />
      <path d="M12.75 17.75H5.5C5.5 23.135 8.865 26.5 14.25 26.5V19.25C14.25 18.422 13.578 17.75 12.75 17.75Z" fill="white" />
      <circle cx="16" cy="16" r="1.6" fill="#8BEBDD" />
    </svg>
  );

  if (!showWordmark) {
    return iconElement;
  }

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      {iconElement}
      <div className="flex flex-col text-left leading-none">
        <span className={`font-heading font-bold tracking-[-0.02em] text-foreground ${currentSize.text}`}>
          Omnicura
        </span>
        {showTagline && (
          <span className={`font-medium text-text-tertiary mt-1 ${currentSize.sub}`}>
            Clinical decision support
          </span>
        )}
      </div>
    </div>
  );
}

// Backward-compatibility alias
export const TriageAILogo = OmnicuraLogo;
