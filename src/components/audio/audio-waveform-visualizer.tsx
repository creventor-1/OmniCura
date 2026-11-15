"use client";

import * as React from "react";
import { Mic, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioWaveformVisualizerProps {
  isListening: boolean;
  hasSpeech?: boolean;
  onStop: () => void;
  className?: string;
}

export function AudioWaveformVisualizer({
  isListening,
  hasSpeech = false,
  onStop,
  className = "",
}: AudioWaveformVisualizerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = React.useRef<number | null>(null);
  const themeColorsRef = React.useRef<{ accent: string; muted: string }>({
    accent: "#14A3B3",
    muted: "#CBD4DF",
  });

  // Track prefers-reduced-motion via useSyncExternalStore
  const prefersReducedMotion = React.useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  // Read CSS variables via getComputedStyle & watch theme changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    function updateColors() {
      const styles = getComputedStyle(document.documentElement);
      const accent = styles.getPropertyValue("--accent").trim() || "#14A3B3";
      const muted = styles.getPropertyValue("--border-strong").trim() || "#CBD4DF";
      themeColorsRef.current = { accent, muted };
    }

    updateColors();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          updateColors();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isListening) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    if (prefersReducedMotion) {
      return; // Under reduced motion, do not spin up canvas animation
    }

    let isSubscribed = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPR-aware canvas sizing
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || 240;
    const displayHeight = canvas.clientHeight || 28;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    const barCount = 20;
    const barWidth = 3;
    const totalBarsWidth = barCount * barWidth;
    const gap = Math.max(2, (displayWidth - totalBarsWidth) / (barCount - 1));

    const renderFrame = () => {
      if (!isSubscribed) return;

      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const { accent } = themeColorsRef.current;
      const t = performance.now() * 0.0035;
      const speechMultiplier = hasSpeech ? 1.35 : 0.8;

      for (let i = 0; i < barCount; i++) {
        // Natural center-weighted bell curve
        const normX = i / (barCount - 1);
        const centerWeight = Math.sin(normX * Math.PI);

        // Fluid organic multi-harmonic waves
        const wave1 = Math.sin(t * 2.2 + i * 0.45);
        const wave2 = Math.sin(t * 3.8 - i * 0.65);
        const wave3 = Math.cos(t * 1.5 + i * 0.85);
        const rawAmp = Math.abs(wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2) * speechMultiplier;

        const percent = Math.min(1, Math.max(0.12, rawAmp * (0.35 + 0.65 * centerWeight)));
        const barHeight = Math.max(3, percent * (displayHeight - 4));

        const x = i * (barWidth + gap);
        const y = (displayHeight - barHeight) / 2;

        ctx.fillStyle = accent;
        ctx.globalAlpha = percent > 0.3 ? 1.0 : 0.6;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, barWidth, barHeight, 1.5);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isListening, hasSpeech, prefersReducedMotion]);

  if (!isListening) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-accent/40 bg-surface shadow-xs ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-2.5 rounded-full bg-accent animate-pulse" />
        <span className="text-xs font-semibold text-accent tracking-tight flex items-center gap-1.5 shrink-0">
          <Mic className="size-3.5" />
          Listening...
        </span>

        {/* Dynamic Canvas or Reduced-Motion Static Bars */}
        {prefersReducedMotion ? (
          <div className="flex items-center gap-1 px-2" aria-hidden="true">
            {[4, 12, 18, 14, 8, 16, 20, 10, 6, 14].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-accent opacity-75"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-44 sm:w-56 h-7 block"
            aria-hidden="true"
          />
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        className="text-xs h-7 px-2.5 rounded-lg text-accent hover:text-accent-text hover:bg-brand-muted gap-1.5 shrink-0 font-medium cursor-pointer"
        title="Stop speaking and send message"
      >
        <Send className="size-3" />
        <span>Send</span>
      </Button>
    </div>
  );
}
