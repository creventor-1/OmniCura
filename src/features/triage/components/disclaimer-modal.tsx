"use client";

import * as React from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
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
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="mx-auto sm:mx-0 flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-5" />
          </div>
          <DialogTitle className="text-xl font-bold">Important Notice</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            {DISCLAIMER_TEXT}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p>• Not a substitute for clinical diagnosis or emergency medicine.</p>
          <p>• If in immediate danger, dial <strong>{DEFAULT_EMERGENCY_NUMBER}</strong> directly.</p>
        </div>

        <DialogFooter className="pt-2">
          <Button onClick={onAcknowledge} className="w-full gap-2 font-medium">
            <ShieldCheck className="size-4" />
            I Understand &amp; Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
