import {
  LayoutGrid,
  Activity,
  ScanEye,
  Pill,
  MapPinned,
  History,
  HeartPulse,
  PhoneCall,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import type { NavSection } from "@/components/shared/navbar";

export interface NavItem {
  id: NavSection;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  keywords?: string;
}

export interface NavGroup {
  id: string;
  label: string | null;
  items: NavItem[];
}

export const NAV_ITEMS: Record<NavSection, NavItem> = {
  home: {
    id: "home",
    label: "Overview",
    shortLabel: "Home",
    description: "Workspace summary, activity and quick actions",
    icon: LayoutGrid,
    keywords: "dashboard home summary",
  },
  triage: {
    id: "triage",
    label: "Symptom Assessment",
    shortLabel: "Assess",
    description: "Guided AI triage with red-flag screening",
    icon: Activity,
    keywords: "triage chat symptoms consult assess",
  },
  vision: {
    id: "vision",
    label: "Symptom Vision",
    shortLabel: "Vision",
    description: "Photo analysis of rashes, burns and wounds",
    icon: ScanEye,
    keywords: "image photo camera rash burn wound skin",
  },
  medication: {
    id: "medication",
    label: "Medication Scan",
    shortLabel: "Meds",
    description: "Identify medication and safety notes",
    icon: Pill,
    keywords: "drug pill label pharmacy scan",
  },
  hospitals: {
    id: "hospitals",
    label: "Hospital Locator",
    shortLabel: "Care",
    description: "Nearby emergency departments and clinics",
    icon: MapPinned,
    keywords: "map hospital clinic directions facility er",
  },
  history: {
    id: "history",
    label: "Assessment History",
    shortLabel: "History",
    description: "Past encounters, reports and exports",
    icon: History,
    keywords: "records encounters timeline pdf",
  },
  profile: {
    id: "profile",
    label: "Health Profile",
    shortLabel: "Profile",
    description: "Medical background used to tailor triage",
    icon: HeartPulse,
    keywords: "allergies conditions medications age",
  },
  contacts: {
    id: "contacts",
    label: "Emergency Contacts",
    shortLabel: "Contacts",
    description: "People to call during an emergency",
    icon: PhoneCall,
    keywords: "family doctor phone call sos",
  },
  ownership: {
    id: "ownership",
    label: "Data Ownership",
    shortLabel: "Ownership",
    description: "Patient-controlled access grants and verifiable audit logs",
    icon: KeyRound,
    keywords: "privacy ownership zcash blockchain consent grant revoke audit",
  },
};

export const NAV_GROUPS: NavGroup[] = [
  { id: "workspace", label: null, items: [NAV_ITEMS.home] },
  {
    id: "assess",
    label: "Clinical tools",
    items: [NAV_ITEMS.triage, NAV_ITEMS.vision, NAV_ITEMS.medication],
  },
  { id: "care", label: "Care network", items: [NAV_ITEMS.hospitals] },
  {
    id: "records",
    label: "Patient record",
    items: [
      NAV_ITEMS.history,
      NAV_ITEMS.profile,
      NAV_ITEMS.contacts,
      NAV_ITEMS.ownership,
    ],
  },
];

export const SECTION_GROUP_LABEL: Record<NavSection, string> = {
  home: "Workspace",
  triage: "Clinical tools",
  vision: "Clinical tools",
  medication: "Clinical tools",
  hospitals: "Care network",
  history: "Patient record",
  profile: "Patient record",
  contacts: "Patient record",
  ownership: "Patient record",
};

/** Cross-component events (no global store needed). */
export const OPEN_AUTH_EVENT = "omnicura:open-auth";
export const NAVIGATE_EVENT = "omnicura:navigate";
export const TRIAGE_DRAFT_KEY = "omnicura_triage_draft";

export function requestAuth(mode: "signin" | "signup" = "signin") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT, { detail: { mode } }));
}

export function requestNavigate(section: NavSection) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT, { detail: { section } }));
}
