"use client";

import * as React from "react";
import QRCode from "qrcode";

interface QrDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrDisplay({ value, size = 180, className = "" }: QrDisplayProps) {
  const [svgMarkup, setSvgMarkup] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;

    QRCode.toString(value, {
      type: "svg",
      width: size,
      margin: 1,
      color: {
        dark: "#0a0a0a",
        light: "#ffffff",
      },
    })
      .then((svg) => {
        if (!ignore) {
          setSvgMarkup(svg);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error("QR Code generation error:", err);
          setError("Failed to render QR code");
        }
      });

    return () => {
      ignore = true;
    };
  }, [value, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-xl border border-border-subtle bg-subtle text-xs text-text-tertiary ${className}`}
      >
        QR Preview Unavailable
      </div>
    );
  }

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`animate-pulse rounded-xl border border-border-subtle bg-subtle ${className}`}
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border-subtle bg-white p-2 shadow-xs ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
