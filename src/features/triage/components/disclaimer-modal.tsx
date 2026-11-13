"use client";

import * as React from "react";
import { ShieldCheck, Stethoscope, Siren, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DISCLAIMER_TEXT, DEFAULT_EMERGENCY_NUMBER } from "@/lib/constants";

interface DisclaimerModalProps {
  isOpen: boolean;
  onAcknowledge: () => void;
}

export function DisclaimerModal({ isOpen, onAcknowledge }: DisclaimerModalProps) {
  const points = [
    {
      icon: Stethoscope,
      title: "Guidance, not a diagnosis",
      body: "Recommendations support — never replace — evaluation by a licensed clinician.",
    },
    {
      icon: Siren,
      title: "Emergencies come first",
      body: `If you are in immediate danger, call ${DEFAULT_EMERGENCY_NUMBER} now instead of using this tool.`,
    },
    {
      icon: Lock,
      title: "Private by design",
      body: "Red-flag screening runs on your device before anything is sent for analysis.",
    },
  ];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[460px]" showCloseButton={false}>
        <DialogHeader className="gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-brand/15 bg-brand-muted text-accent">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </span>
          <DialogTitle className="text-xl">Before you begin</DialogTitle>
          <DialogDescription>{DISCLAIMER_TEXT}</DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-2xl border border-border-subtle bg-subtle p-3.5">
              <Icon className="mt-0.5 size-[18px] shrink-0 text-text-secondary" aria-hidden="true" />
              <div>
                <div className="text-[13px] font-semibold text-foreground">{title}</div>
                <div className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">{body}</div>
              </div>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button onClick={onAcknowledge} size="lg" className="w-full">
            I understand, continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
