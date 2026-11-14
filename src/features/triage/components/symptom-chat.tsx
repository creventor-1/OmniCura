"use client";

import * as React from "react";
import {
  ArrowUp,
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  Camera,
  Undo2,
  Siren,
  ShieldCheck,
  UserRound,
  Check,
  Lock,
  ArrowRight,
  PhoneCall,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { checkRedFlags } from "@/lib/red-flags";
import { EmergencyAlertModal } from "@/features/safety/components/emergency-alert-modal";
import { DisclaimerModal } from "./disclaimer-modal";
import { AssessmentResultView } from "./assessment-result-view";
import { DemoScenarios } from "./demo-scenarios";
import { AudioWaveformVisualizer } from "@/components/audio/audio-waveform-visualizer";
import { RedFlagBanner } from "@/components/emergency/red-flag-banner";
import { TriageMessage, AssessmentResponse, TriageTurnResponse } from "@/schemas/triage";
import { RedFlagCheckResult } from "@/types";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { TRIAGE_DRAFT_KEY, requestNavigate } from "@/components/shell/nav-config";
import { OmnicuraLogo } from "@/components/shared/brand-logo";
import { DEFAULT_EMERGENCY_NUMBER } from "@/lib/constants";
import { computeAssessmentHash } from "@/services/crypto/record-hasher";
import { requestAnchor, updateLocalRecordAnchor } from "@/services/zcash/anchor-client";
import { recordAssessmentAnchoredEvent } from "@/services/ownership/ownership-service";
import { StoredAssessment } from "@/types/database";

let messageCounter = 0;
function createMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

function getFormattedTimestamp(): string {
  if (typeof window === "undefined") return "";
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResultItem {
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultItem[];
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: { new (): SpeechRecognitionLike };
  webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
}

interface SymptomChatProps {
  onLocateFacilities?: () => void;
  onOpenVision?: () => void;
}

const DEFAULT_INITIAL_MESSAGES: TriageMessage[] = [
  {
    id: "initial-assistant-msg",
    role: "assistant",
    content:
      "Hello. Describe your symptoms, duration, and any discomfort you are experiencing.",
    timestamp: "Just now",
  },
];

const STAGES = [
  { title: "Presentation", detail: "What you're feeling" },
  { title: "Duration & severity", detail: "Onset, intensity, progression" },
  { title: "Location & context", detail: "Where, triggers, history" },
  { title: "Clinical synthesis", detail: "Acuity and care plan" },
];

interface ActiveAnchor {
  recordId?: string;
  recordHash?: string;
  symptoms?: string;
  txid?: string;
  verifiedAt?: string;
  state?: "requested" | "failed" | "unanchored";
  message?: string;
  /** Patient id exactly as hashed ("guest" for guests) — needed to resume after a reload. */
  userId?: string;
  remoteRecordId?: string | null;
}

function getInitialChatSession(): {
  messages: TriageMessage[];
  currentQuickOptions: string[];
  assessment: AssessmentResponse | null;
  anchor: ActiveAnchor | null;
} {
  if (typeof window === "undefined") {
    return { messages: DEFAULT_INITIAL_MESSAGES, currentQuickOptions: [], assessment: null, anchor: null };
  }
  try {
    const saved = sessionStorage.getItem("omnicura_active_chat_session");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        messages:
          Array.isArray(parsed.messages) && parsed.messages.length > 0
            ? parsed.messages
            : DEFAULT_INITIAL_MESSAGES,
        currentQuickOptions: Array.isArray(parsed.currentQuickOptions)
          ? parsed.currentQuickOptions
          : [],
        assessment: parsed.assessment || null,
        anchor: parsed.anchor || null,
      };
    }
  } catch {
    // ignore
  }
  return { messages: DEFAULT_INITIAL_MESSAGES, currentQuickOptions: [], assessment: null, anchor: null };
}

function createStoredAssessment(
  userId: string | undefined,
  symptoms: string,
  assessment: AssessmentResponse,
  timestamp?: string
): StoredAssessment {
  const createdAt = timestamp || new Date().toISOString();
  // Hash with exactly the patient id that is stored, so verification can recompute it.
  const storedUserId = userId || "guest";
  const recordHash = computeAssessmentHash({
    patientId: storedUserId,
    symptoms,
    assessment,
    timestamp: createdAt,
  });

  return {
    id: `assessment-${new Date(createdAt).getTime()}`,
    user_id: storedUserId,
    symptoms,
    severity: assessment.severity,
    assessment_result: assessment,
    disclaimer: assessment.disclaimer,
    created_at: createdAt,
    record_hash: recordHash,
    verification_status: "pending",
    verified_at: createdAt,
  };
}

/** Minimal **bold** renderer for assistant content. */
function renderRichText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export function SymptomChat({ onLocateFacilities, onOpenVision }: SymptomChatProps) {
  const { user, setGuestAssessment } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [messages, setMessages] = React.useState<TriageMessage[]>(
    () => getInitialChatSession().messages
  );
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentQuickOptions, setCurrentQuickOptions] = React.useState<string[]>(
    () => getInitialChatSession().currentQuickOptions
  );
  const [assessment, setAssessment] = React.useState<AssessmentResponse | null>(
    () => getInitialChatSession().assessment
  );
  // Zcash anchoring for the current result (real txid only — nothing is fabricated)
  const [activeAnchor, setActiveAnchor] = React.useState<ActiveAnchor | null>(() => getInitialChatSession().anchor);

  // Sends the record to the notary and stores the real txid when it comes back.
  // Also resumes an anchor that was in flight when the page was reloaded: the
  // notary de-duplicates by hash, so a resume never pays for a second transaction.
  const runAnchor = React.useCallback(
    (a: {
      recordId: string;
      remoteRecordId?: string | null;
      userId: string;
      symptoms: string;
      createdAt: string;
      assessment: AssessmentResponse;
    }) => {
      void requestAnchor({
        user_id: a.userId,
        symptoms: a.symptoms,
        created_at: a.createdAt,
        assessment_result: a.assessment,
      }).then(async (anchor) => {
        if (anchor.txid) {
          const txid = anchor.txid;
          setActiveAnchor((prev) =>
            prev?.recordId === a.recordId ? { ...prev, txid, state: undefined, message: undefined } : prev
          );
          updateLocalRecordAnchor(a.recordId, { zcash_txid: txid });
          recordAssessmentAnchoredEvent({
            recordId: a.remoteRecordId || a.recordId,
            recordHash: anchor.recordHash,
            txid,
            userId: a.userId === "guest" ? undefined : a.userId,
          });
          if (a.remoteRecordId) {
            const { error } = await supabase
              .from("assessments")
              .update({ zcash_txid: txid })
              .eq("id", a.remoteRecordId);
            if (error) console.warn("[ANCHOR_SAVE] Could not store txid on the account record:", error.message);
          }
        } else {
          setActiveAnchor((prev) =>
            prev?.recordId === a.recordId
              ? { ...prev, state: anchor.status === "unanchored" ? "unanchored" : "failed", message: anchor.message }
              : prev
          );
        }
      });
    },
    [supabase]
  );

  const resumedAnchorRef = React.useRef(false);
  React.useEffect(() => {
    if (resumedAnchorRef.current) return;
    resumedAnchorRef.current = true;
    const a = activeAnchor;
    if (!a || a.txid || a.state !== "requested" || !assessment) return;
    if (!a.recordId || !a.symptoms || !a.verifiedAt || !a.userId) return;
    runAnchor({
      recordId: a.recordId,
      remoteRecordId: a.remoteRecordId,
      userId: a.userId,
      symptoms: a.symptoms,
      createdAt: a.verifiedAt,
      assessment,
    });
  }, [activeAnchor, assessment, runAnchor]);

  // Active Health Profile context
  const [activeProfile, setActiveProfile] = React.useState<{
    fullName?: string;
    age?: number;
    sex?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
    summaryText?: string;
  } | null>(null);

  // Safety & Disclaimer states
  const [isDisclaimerOpen, setIsDisclaimerOpen] = React.useState(false);
  const [emergencyResult, setEmergencyResult] = React.useState<RedFlagCheckResult | null>(null);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = React.useState(false);

  // Voice recognition state
  const [isListening, setIsListening] = React.useState(false);
  const [voiceNotice, setVoiceNotice] = React.useState<string | null>(null);
  const speechRecognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view (scroll the log, not the page)
  React.useEffect(() => {
    const el = scrollAreaRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-grow composer
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [inputValue]);

  // Prefill from the Overview quick-start composer
  React.useEffect(() => {
    try {
      const draft = sessionStorage.getItem(TRIAGE_DRAFT_KEY);
      if (draft) {
        sessionStorage.removeItem(TRIAGE_DRAFT_KEY);
        const t = setTimeout(() => {
          setInputValue(draft);
          textareaRef.current?.focus();
        }, 0);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync active chat session into sessionStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (messages.length > 1 || assessment) {
        sessionStorage.setItem(
          "omnicura_active_chat_session",
          JSON.stringify({ messages, currentQuickOptions, assessment, anchor: activeAnchor })
        );
      }
    } catch {
      // ignore storage error
    }
  }, [messages, currentQuickOptions, assessment, activeAnchor]);

  // Undo last response handler
  const handleUndoLastTurn = () => {
    if (isLoading) return;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;

    const lastUserMsg = messages[lastUserIdx];
    const restoredMessages = messages.slice(0, lastUserIdx);
    setMessages(restoredMessages);
    setInputValue(lastUserMsg.content);
    setCurrentQuickOptions([]);
  };

  const userTurnCount = React.useMemo(() => {
    return messages.filter((m) => m.role === "user").length;
  }, [messages]);

  const canUndo = !isLoading && !assessment && userTurnCount > 0;
  const stageIndex = Math.min(userTurnCount, STAGES.length - 1);
  const progressPct = Math.min(Math.round(((userTurnCount + 1) / 4) * 100), 100);

  // Check one-time disclaimer asynchronously after initial mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const acknowledged = sessionStorage.getItem("triage_disclaimer_accepted");
      if (!acknowledged) {
        const timer = setTimeout(() => {
          setIsDisclaimerOpen(true);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleAcknowledgeDisclaimer = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("triage_disclaimer_accepted", "true");
    }
    setIsDisclaimerOpen(false);
  };

  // Load persistent health profile context automatically
  React.useEffect(() => {
    async function loadActiveProfile() {
      // 1. Check Supabase if user logged in
      if (user) {
        try {
          const { data } = await supabase
            .from("health_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (data && data.allow_ai_use) {
            const parts: string[] = [];
            if (data.age) parts.push(`${data.age}yo`);
            if (data.sex) parts.push(data.sex);
            if (data.chronic_conditions?.length) parts.push(data.chronic_conditions.join(", "));
            if (data.allergies?.length) parts.push(`Allergies: ${data.allergies.join(", ")}`);

            setActiveProfile({
              fullName: user.user_metadata?.full_name,
              age: data.age,
              sex: data.sex,
              allergies: data.allergies,
              chronicConditions: data.chronic_conditions,
              currentMedications: data.medications,
              summaryText: parts.join(" • "),
            });
            return;
          }
        } catch (e) {
          console.warn("Could not query health_profiles:", e);
        }
      }

      // 2. Check localStorage fallback (works for guests/demos)
      try {
        const stored = localStorage.getItem("omnicura_active_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.allowAiUse !== false) {
            const parseList = (val?: string) =>
              val ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : [];

            const parts: string[] = [];
            if (parsed.age) parts.push(`${parsed.age}yo`);
            if (parsed.sex) parts.push(parsed.sex);
            if (parsed.chronicConditions) parts.push(parsed.chronicConditions);
            if (parsed.allergies) parts.push(`Allergies: ${parsed.allergies}`);

            setActiveProfile({
              fullName: parsed.fullName,
              age: parsed.age ? Number(parsed.age) : undefined,
              sex: parsed.sex,
              allergies: parseList(parsed.allergies),
              chronicConditions: parseList(parsed.chronicConditions),
              currentMedications: parseList(parsed.medications),
              summaryText: parts.join(" • "),
            });
          }
        }
      } catch {
        // ignore
      }
    }

    loadActiveProfile();
  }, [user, supabase]);

  // Setup Web Speech API for voice description
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;

    const win = window as unknown as WindowWithSpeech;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice("Voice input isn't supported in this browser. Please type your symptoms instead.");
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("Speech recognition error:", e);
      setIsListening(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setInputValue("");
    setCurrentQuickOptions([]);

    // 1. MANDATORY DETERMINISTIC CLIENT-SIDE RED-FLAG SCREENING
    const clientCheck = checkRedFlags(text);
    if (clientCheck.isEmergency) {
      setEmergencyResult(clientCheck);
      setIsEmergencyModalOpen(true);

      const userMsg: TriageMessage = {
        id: createMessageId("user"),
        role: "user",
        content: text,
        timestamp: getFormattedTimestamp(),
      };

      const emergencyResponseMsg: TriageMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: `🚨 **EMERGENCY WARNING**: ${clientCheck.description || "Critical symptoms detected."} ${clientCheck.immediateAction || "Please call emergency services immediately."}`,
        timestamp: getFormattedTimestamp(),
      };

      setMessages((prev) => [...prev, userMsg, emergencyResponseMsg]);
      return;
    }

    // Append user message
    const userMessage: TriageMessage = {
      id: createMessageId("user"),
      role: "user",
      content: text,
      timestamp: getFormattedTimestamp(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Persistent health profile payload (consented and pre-loaded)
      const healthProfilePayload = activeProfile
        ? {
            fullName: activeProfile.fullName,
            age: activeProfile.age,
            sex: activeProfile.sex,
            allergies: activeProfile.allergies,
            chronicConditions: activeProfile.chronicConditions,
            currentMedications: activeProfile.currentMedications,
          }
        : undefined;

      // Server-side triage API call (server re-runs red-flag check before any AI call)
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          healthProfile: healthProfilePayload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process clinical assessment.");
      }

      // Check if server detected an emergency
      if (data.isEmergency && data.emergencyResult) {
        setEmergencyResult(data.emergencyResult);
        setIsEmergencyModalOpen(true);
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId("assistant"),
            role: "assistant",
            content: `🚨 **EMERGENCY WARNING**: ${data.emergencyResult.immediateAction}`,
            timestamp: getFormattedTimestamp(),
          },
        ]);
        return;
      }

      const turnData: TriageTurnResponse = data.data;

      if (turnData.isComplete && turnData.assessment) {
        setAssessment(turnData.assessment);

        // Auto-save if logged in, or queue in guest session
        const firstSymptom =
          updatedMessages.find((m) => m.role === "user")?.content || text;
        const now = new Date().toISOString();
        const storedUserId = user?.id || "guest";
        const recordHash = computeAssessmentHash({
          patientId: storedUserId,
          symptoms: firstSymptom,
          assessment: turnData.assessment,
          timestamp: now,
        });
        const localRecordId = `assessment-${new Date(now).getTime()}`;
        let remoteRecordId: string | null = null;

        setActiveAnchor({
          recordId: localRecordId,
          recordHash,
          symptoms: firstSymptom,
          verifiedAt: now,
          state: "requested",
          userId: storedUserId,
        });

        if (user) {
          const baseRow = {
            user_id: user.id,
            created_at: now, // must equal the hashed timestamp
            symptoms: firstSymptom,
            severity: turnData.assessment.severity,
            assessment_result: turnData.assessment,
            disclaimer: turnData.assessment.disclaimer,
          };
          try {
            const { data: inserted, error } = await supabase
              .from("assessments")
              .insert({ ...baseRow, record_hash: recordHash, verification_status: "pending", verified_at: now })
              .select("id")
              .single();
            if (error) {
              // Database not yet migrated for anchoring columns: save the clinical record anyway.
              const missingColumn = error.code === "42703" || error.code === "PGRST204";
              if (!missingColumn) throw error;
              const retry = await supabase.from("assessments").insert(baseRow).select("id").single();
              if (retry.error) throw retry.error;
              remoteRecordId = retry.data?.id ?? null;
              console.warn("[ASSESSMENT_SAVE] Saved without anchoring columns — apply supabase/schema.sql.");
            } else {
              remoteRecordId = inserted?.id ?? null;
            }
          } catch (e) {
            console.warn("Failed to auto-save assessment:", e);
          }
        } else {
          setGuestAssessment({
            symptoms: firstSymptom,
            assessment: turnData.assessment,
          });
        }

        // Mirror in local assessment history for immediate timeline visibility
        if (typeof window !== "undefined") {
          try {
            const guestItem = createStoredAssessment(
              user?.id,
              firstSymptom,
              turnData.assessment,
              now
            );
            const stored = localStorage.getItem("omnicura_guest_assessments");
            const existing = stored ? JSON.parse(stored) : [];
            localStorage.setItem(
              "omnicura_guest_assessments",
              JSON.stringify([guestItem, ...existing.filter((item: { id: string }) => item.id !== guestItem.id)])
            );
          } catch (e) {
            console.warn("Failed to save local assessment history:", e);
          }
        }

        if (remoteRecordId) {
          const savedId = remoteRecordId;
          setActiveAnchor((prev) => (prev?.recordId === localRecordId ? { ...prev, remoteRecordId: savedId } : prev));
        }

        // Anchor on Zcash in the background — never blocks the clinical result.
        runAnchor({
          recordId: localRecordId,
          remoteRecordId,
          userId: storedUserId,
          symptoms: firstSymptom,
          createdAt: now,
          assessment: turnData.assessment,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId("assistant"),
            role: "assistant",
            content:
              "I have gathered sufficient clinical context and prepared your structured assessment below.",
            timestamp: getFormattedTimestamp(),
          },
        ]);
      } else if (turnData.nextQuestion) {
        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId("assistant"),
            role: "assistant",
            content: turnData.nextQuestion as string,
            timestamp: getFormattedTimestamp(),
          },
        ]);
        if (turnData.quickOptions && turnData.quickOptions.length > 0) {
          setCurrentQuickOptions(turnData.quickOptions);
        }
      }
    } catch (err: unknown) {
      console.error("[TRIAGE_CHAT_ERROR]", err);
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId("assistant-err"),
          role: "assistant",
          content:
            "The assessment service is currently busy or experiencing high demand. Please try again in a moment. If you are worried or symptoms are worsening, please contact a healthcare provider or call emergency services directly.",
          timestamp: getFormattedTimestamp(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("omnicura_active_chat_session");
    }
    setAssessment(null);
    setActiveAnchor(null);
    setCurrentQuickOptions([]);
    setEmergencyResult(null);
    setMessages([
      {
        id: "initial-assistant-msg",
        role: "assistant",
        content:
          "Hello. Describe your symptoms, duration, and any discomfort you are experiencing.",
        timestamp: "Just now",
      },
    ]);
  };

  const emergencyNumber = emergencyResult?.emergencyNumber || DEFAULT_EMERGENCY_NUMBER;

  return (
    <div className="w-full">
      <DisclaimerModal isOpen={isDisclaimerOpen} onAcknowledge={handleAcknowledgeDisclaimer} />

      <EmergencyAlertModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        result={emergencyResult}
        onLocateFacilities={onLocateFacilities}
      />

      <RedFlagBanner result={emergencyResult} onLocateFacilities={onLocateFacilities} />

      {assessment ? (
        <AssessmentResultView
          assessment={assessment}
          onReset={handleReset}
          onLocateFacilities={onLocateFacilities}
          recordId={activeAnchor?.recordId}
          symptoms={activeAnchor?.symptoms}
          recordHash={activeAnchor?.recordHash}
          zcashTxid={activeAnchor?.txid}
          verifiedAt={activeAnchor?.verifiedAt}
          anchorState={activeAnchor?.state}
          anchorMessage={activeAnchor?.message}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* ================= Conversation ================= */}
          <section
            aria-label="Symptom consultation"
            className="flex flex-col overflow-hidden rounded-[20px] border border-border-subtle bg-surface shadow-xs h-[min(780px,calc(100dvh-200px))] min-h-[580px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                  <OmnicuraLogo size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-success-strong" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Omnicura Assistant</div>
                  <div className="truncate text-xs text-text-tertiary">
                    {isLoading ? "Reviewing your answer…" : `Step ${stageIndex + 1} of 4 · ${STAGES[stageIndex].title}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {canUndo && (
                  <Button variant="ghost" size="sm" onClick={handleUndoLastTurn} title="Undo last response and edit">
                    <Undo2 />
                    <span className="hidden sm:inline">Undo</span>
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleReset} title="Start over">
                  <RotateCcw />
                  <span className="hidden sm:inline">Start over</span>
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div className="h-1 w-full bg-muted" aria-hidden="true">
              <div
                className="h-full bg-brand transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Messages */}
            <div
              ref={scrollAreaRef}
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-label="Clinical consultation history"
              className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6"
            >
              {messages.map((message) => {
                const isAssistant = message.role === "assistant";
                const isEmergency = isAssistant && message.content.startsWith("🚨");
                const content = isEmergency ? message.content.replace(/^🚨\s*/, "") : message.content;

                if (!isAssistant) {
                  return (
                    <div key={message.id} className="flex justify-end animate-rise">
                      <div className="max-w-[85%] sm:max-w-[72%]">
                        <div className="rounded-[18px] rounded-br-md bg-brand px-4 py-3 text-[15px] leading-relaxed text-brand-fg shadow-xs">
                          <p className="whitespace-pre-wrap">{content}</p>
                        </div>
                        {message.timestamp && (
                          <div className="mt-1.5 pr-1 text-right text-[11px] text-text-tertiary tabular-nums">
                            You · {message.timestamp}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className="flex items-start gap-3 animate-rise">
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
                        isEmergency
                          ? "border-danger/25 bg-danger-muted text-danger"
                          : "border-brand/15 bg-brand-muted text-accent"
                      )}
                      aria-hidden="true"
                    >
                      {isEmergency ? <Siren className="size-4" /> : <Sparkles className="size-4" />}
                    </span>
                    <div className="max-w-[85%] sm:max-w-[78%]">
                      <div
                        className={cn(
                          "rounded-[18px] rounded-tl-md border px-4 py-3 text-[15px] leading-relaxed",
                          isEmergency
                            ? "border-danger/25 bg-danger-muted text-foreground"
                            : "border-border-subtle bg-subtle text-foreground"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{renderRichText(content)}</p>
                        {isEmergency && (
                          <a
                            href={`tel:${emergencyNumber}`}
                            className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-danger px-3.5 text-[13px] font-semibold text-white dark:text-[#2a0605]"
                          >
                            <PhoneCall className="size-4" />
                            Call {emergencyNumber} now
                          </a>
                        )}
                      </div>
                      {message.timestamp && (
                        <div className="mt-1.5 pl-1 text-[11px] text-text-tertiary tabular-nums">
                          Omnicura · {message.timestamp}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {userTurnCount === 0 && !isLoading && (
                <div className="ml-11 max-w-xl space-y-4 animate-rise [animation-delay:120ms]">
                  <div className="rounded-2xl border border-dashed border-border-strong/70 p-4">
                    <p className="text-xs font-semibold text-text-secondary">For a faster, more accurate assessment, mention:</p>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[
                        { title: "What", body: "Main symptom and where" },
                        { title: "When", body: "Onset and how it's changed" },
                        { title: "How bad", body: "Severity from 1 to 10" },
                      ].map((tip) => (
                        <li key={tip.title} className="rounded-xl bg-subtle px-3 py-2.5">
                          <div className="text-[13px] font-semibold text-foreground">{tip.title}</div>
                          <div className="text-xs text-text-tertiary">{tip.body}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Headache and fever since yesterday, about 6/10",
                      "Sore throat and cough for three days",
                      "Burn on my hand from a hot pan",
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => {
                          setInputValue(example);
                          textareaRef.current?.focus();
                        }}
                        className="rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-brand/30 hover:bg-brand-muted hover:text-accent-text cursor-pointer"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && (
                <div role="status" aria-live="polite" className="flex items-start gap-3 animate-rise">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-brand/15 bg-brand-muted text-accent" aria-hidden="true">
                    <Sparkles className="size-4 animate-pulse" />
                  </span>
                  <div className="rounded-[18px] rounded-tl-md border border-border-subtle bg-subtle px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1" aria-hidden="true">
                        <span className="size-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-1.5 rounded-full bg-accent animate-bounce" />
                      </span>
                      <span className="text-[13px] font-medium text-text-secondary">
                        Screening red flags and reviewing your answer…
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick replies */}
            {currentQuickOptions.length > 0 && !isLoading && (
              <div className="border-t border-border-subtle px-4 pt-3 sm:px-6 animate-rise">
                <div className="mb-2 text-xs font-medium text-text-tertiary">Suggested replies</div>
                <div className="flex flex-wrap gap-2">
                  {currentQuickOptions.map((option, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(option)}
                      className="rounded-full border border-brand/25 bg-surface px-3.5 py-1.5 text-[13px] font-medium text-accent-text transition-colors hover:bg-brand-muted cursor-pointer"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Composer */}
            <div className="p-3 sm:p-4">
              <AudioWaveformVisualizer isListening={isListening} onStop={toggleSpeechRecognition} className="mb-2.5" />
              {voiceNotice && (
                <p role="status" className="mb-2 rounded-lg bg-info-muted px-3 py-2 text-xs text-info">{voiceNotice}</p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="rounded-2xl border border-border-strong/70 bg-surface shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[4px] focus-within:ring-ring/15"
              >
                <label htmlFor="triage-composer" className="sr-only">
                  Describe your symptoms or answer the question
                </label>
                <textarea
                  id="triage-composer"
                  ref={textareaRef}
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={isListening ? "Listening… speak now" : "Describe symptoms or answer the question…"}
                  disabled={isLoading}
                  className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-base sm:text-[15px] leading-relaxed text-foreground placeholder:text-text-tertiary outline-none disabled:opacity-60"
                />
                <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-xl transition-colors cursor-pointer",
                        isListening ? "bg-danger-muted text-danger" : "text-text-tertiary hover:bg-muted hover:text-foreground"
                      )}
                      title={isListening ? "Listening… click to stop" : "Speak your symptoms"}
                      aria-label={isListening ? "Stop voice input" : "Start voice input"}
                      aria-pressed={isListening}
                    >
                      {isListening ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
                    </button>
                    {onOpenVision && (
                      <button
                        type="button"
                        onClick={onOpenVision}
                        className="flex size-9 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                        title="Analyze a photo of a visible symptom"
                        aria-label="Upload a symptom photo"
                      >
                        <Camera className="size-[18px]" />
                      </button>
                    )}
                    <span className="hidden sm:inline ml-2 text-[11px] text-text-tertiary">
                      Enter to send · Shift + Enter for a new line
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-all hover:bg-brand-hover active:scale-95 disabled:bg-muted disabled:text-text-tertiary disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <ArrowUp className="size-[18px] stroke-[2.5]" />
                  </button>
                </div>
              </form>

              <div className="mt-2.5 flex items-center justify-between gap-3 xl:hidden">
                <DemoScenarios onSelectScenario={(text) => handleSendMessage(text)} disabled={isLoading} />
              </div>
            </div>
          </section>

          {/* ================= Context rail ================= */}
          <aside className="space-y-5" aria-label="Consultation context">
            {/* Stages */}
            <section className="rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Consultation progress</h2>
                <span className="text-xs font-semibold tabular-nums text-text-tertiary">{progressPct}%</span>
              </div>
              <ol className="mt-4 space-y-0">
                {STAGES.map((stage, i) => {
                  const done = i < stageIndex;
                  const current = i === stageIndex;
                  return (
                    <li key={stage.title} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < STAGES.length - 1 && (
                        <span
                          className={cn("absolute left-[11px] top-7 bottom-1 w-px", done ? "bg-brand" : "bg-border-subtle")}
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors",
                          done && "border-brand bg-brand text-brand-fg",
                          current && "border-brand bg-surface text-accent ring-4 ring-brand/15",
                          !done && !current && "border-border-strong bg-surface text-text-tertiary"
                        )}
                        aria-hidden="true"
                      >
                        {done ? <Check className="size-3.5 stroke-[3]" /> : i + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <div className={cn("text-[13px] font-semibold", current || done ? "text-foreground" : "text-text-tertiary")}>
                          {stage.title}
                          {current && <span className="sr-only"> (current step)</span>}
                        </div>
                        <div className="text-xs text-text-tertiary">{stage.detail}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 flex items-start gap-2 border-t border-border-subtle pt-4 text-xs leading-relaxed text-text-tertiary">
                <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Each message is screened on your device for emergency red flags before it reaches the AI.
              </p>
            </section>

            {/* Patient context */}
            <section className="rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-accent">
                  <UserRound className="size-4" aria-hidden="true" />
                </span>
                <h2 className="text-sm font-semibold text-foreground">Patient context</h2>
              </div>
              {activeProfile?.summaryText ? (
                <div className="mt-3.5 space-y-3">
                  <p className="text-[13px] leading-relaxed text-text-secondary">{activeProfile.summaryText}</p>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Shared with this assessment
                  </div>
                </div>
              ) : (
                <div className="mt-3.5 space-y-3">
                  <p className="text-[13px] leading-relaxed text-text-secondary">
                    Add age, allergies and conditions so the assistant can skip routine questions and tailor advice.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => requestNavigate("profile")}>
                    Add health profile
                    <ArrowRight />
                  </Button>
                </div>
              )}
            </section>

            {/* Demo scenarios (desktop) */}
            <section className="hidden xl:block rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="size-4 text-accent" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Try a scenario</h2>
              </div>
              <DemoScenarios variant="list" onSelectScenario={(text) => handleSendMessage(text)} disabled={isLoading} />
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
