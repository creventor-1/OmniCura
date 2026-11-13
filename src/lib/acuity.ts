import { Siren, Clock3, ShieldCheck, type LucideIcon } from "lucide-react";

export type Acuity = "emergency" | "urgent" | "non-urgent";

export interface AcuityConfig {
  id: Acuity;
  label: string;
  title: string;
  timeframe: string;
  guidance: string;
  examples: string;
  icon: LucideIcon;
  /** Tailwind classes — status colours are reserved for clinical state only */
  text: string;
  bg: string;
  border: string;
  solid: string;
  ring: string;
}

export const ACUITY: Record<Acuity, AcuityConfig> = {
  emergency: {
    id: "emergency",
    label: "Emergency",
    title: "Emergency care required",
    timeframe: "Immediately",
    guidance: "Immediate emergency medical attention advised. Do not delay.",
    examples: "Chest pain, stroke signs, anaphylaxis",
    icon: Siren,
    text: "text-danger",
    bg: "bg-danger-muted",
    border: "border-danger/25",
    solid: "bg-danger-strong",
    ring: "ring-danger/30",
  },
  urgent: {
    id: "urgent",
    label: "Urgent",
    title: "Urgent evaluation advised",
    timeframe: "Within 12–24 hours",
    guidance: "Evaluation by a healthcare professional advised within 12–24 hours.",
    examples: "High fever, acute abdominal pain",
    icon: Clock3,
    text: "text-warning-text",
    bg: "bg-warning-muted",
    border: "border-warning/30",
    solid: "bg-warning",
    ring: "ring-warning/30",
  },
  "non-urgent": {
    id: "non-urgent",
    label: "Non-urgent",
    title: "Self-care appropriate",
    timeframe: "Monitor at home",
    guidance: "Monitor with self-care. Consult a doctor if symptoms persist.",
    examples: "Mild cough, minor scrapes, rash",
    icon: ShieldCheck,
    text: "text-success",
    bg: "bg-success-muted",
    border: "border-success/25",
    solid: "bg-success-strong",
    ring: "ring-success/30",
  },
};

export const ACUITY_ORDER: Acuity[] = ["emergency", "urgent", "non-urgent"];

export function getAcuity(severity: string | null | undefined): AcuityConfig | null {
  const key = (severity || "").toLowerCase() as Acuity;
  return ACUITY[key] ?? null;
}
