"use client";

import * as React from "react";
import { Mic, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioWaveformVisualizerProps {
  isListening: boolean;
  onStop: () => void;
  className?: string;
}

export function AudioWaveformVisualizer({
  isListening,
  onStop,
  className = "",
}: AudioWaveformVisualizerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animFrameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!isListening) {
      // Clean up audio streams and animation
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    let isSubscribed = true;

    async function initAudio() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const renderFrame = () => {
          if (!isSubscribed) return;

          analyser.getByteFrequencyData(dataArray);

          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          const barCount = 20;
          const barWidth = 3;
          const gap = (width - barCount * barWidth) / (barCount - 1);

          for (let i = 0; i < barCount; i++) {
            // Sample frequency index
            const dataIndex = Math.floor((i / barCount) * (bufferLength / 2));
            const value = dataArray[dataIndex] || 0;

            // Normalized height with subtle resting baseline
            const percent = value / 255;
            const barHeight = Math.max(3, percent * (height - 4));

            const x = i * (barWidth + gap);
            const y = (height - barHeight) / 2;

            // Surgical teal bar style
            ctx.fillStyle = percent > 0.4 ? "#0D9488" : "#14B8A6";
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 1.5);
            ctx.fill();
          }

          animFrameRef.current = requestAnimationFrame(renderFrame);
        };

        renderFrame();
      } catch (err) {
        console.warn("[AUDIO_VISUALIZER_NOTICE] Microphones unavailable or permission denied:", err);
      }
    }

    initAudio();

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isListening]);

  if (!isListening) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border border-accent/30 bg-accent/5 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in-50 duration-180 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
        <div className="size-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0 border border-accent/25">
          <Mic className="size-3.5 stroke-[2] animate-pulse" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span className="size-1.5 rounded-full bg-destructive animate-ping" />
            <span>Voice Dictation Active</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            Speak your symptoms naturally...
          </p>
        </div>
      </div>

      {/* Real-Time Waveform Canvas */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <canvas
          ref={canvasRef}
          width={140}
          height={24}
          className="w-[140px] h-[24px] shrink-0"
        />

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={onStop}
            className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1"
          >
            <Check className="size-3" />
            <span>Done</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onStop}
            className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Cancel voice input"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
