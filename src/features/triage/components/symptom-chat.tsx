"use client";

import * as React from "react";
import { Send, Mic, MicOff, Bot, User, RefreshCw, Camera, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function getInitialChatSession(): {
  messages: TriageMessage[];
  currentQuickOptions: string[];
  assessment: AssessmentResponse | null;
} {
  if (typeof window === "undefined") {
    return { messages: DEFAULT_INITIAL_MESSAGES, currentQuickOptions: [], assessment: null };
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
      };
    }
  } catch {
    // ignore
  }
  return { messages: DEFAULT_INITIAL_MESSAGES, currentQuickOptions: [], assessment: null };
}

function createStoredAssessment(
  userId: string | undefined,
  symptoms: string,
  assessment: AssessmentResponse
) {
  return {
    id: "assessment-" + Date.now(),
    user_id: userId || "guest",
    symptoms,
    severity: assessment.severity,
    assessment_result: assessment,
    disclaimer: assessment.disclaimer,
    created_at: new Date().toISOString(),
  };
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
  const speechRecognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Sync active chat session into sessionStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (messages.length > 1 || assessment) {
        sessionStorage.setItem(
          "omnicura_active_chat_session",
          JSON.stringify({ messages, currentQuickOptions, assessment })
        );
      }
    } catch {
      // ignore storage error
    }
  }, [messages, currentQuickOptions, assessment]);

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
      alert("Speech recognition is not supported in this browser. Please use text input.");
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

        if (user) {
          try {
            await supabase.from("assessments").insert({
              user_id: user.id,
              symptoms: firstSymptom,
              severity: turnData.assessment.severity,
              assessment_result: turnData.assessment,
              disclaimer: turnData.assessment.disclaimer,
            });
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
              turnData.assessment
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
    setCurrentQuickOptions([]);
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

  return (
    <div className="flex flex-col flex-1 w-full max-w-2xl mx-auto h-full min-h-[500px]">
      {/* Disclaimer Acknowledgement Dialog */}
      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onAcknowledge={handleAcknowledgeDisclaimer}
      />

      {/* Emergency Alert Dialog */}
      <EmergencyAlertModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        result={emergencyResult}
        onLocateFacilities={onLocateFacilities}
      />

      {/* Synchronous Deterministic RedFlagBanner (Top of View, Solid Surface) */}
      <RedFlagBanner
        result={emergencyResult}
        onLocateFacilities={onLocateFacilities}
      />

      {/* When completed, show structured assessment view */}
      {assessment ? (
        <AssessmentResultView
          assessment={assessment}
          onReset={handleReset}
          onLocateFacilities={onLocateFacilities}
        />
      ) : (
        <div className="flex flex-col flex-1 border border-border rounded-xl bg-card shadow-none overflow-hidden min-h-[580px]">
          {/* Clinical Chat Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/20 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent border border-accent/20 shrink-0">
                <Bot className="size-4 stroke-[1.75]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground leading-none">Omnicura Assistant</h3>
                  {activeProfile?.summaryText && (
                    <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-[10px] font-medium max-w-[220px] truncate" title={`Active Profile: ${activeProfile.summaryText}`}>
                      <span className="size-1.5 rounded-full bg-accent shrink-0" />
                      <span className="truncate">Context: {activeProfile.summaryText}</span>
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground block truncate">
                  Clinical Decision Support
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {canUndo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndoLastTurn}
                  className="text-xs text-muted-foreground gap-1 h-8 px-2 rounded-lg hover:text-foreground"
                  title="Undo last response and edit"
                >
                  <Undo2 className="size-3" />
                  <span className="hidden sm:inline">Undo</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs text-muted-foreground gap-1.5 h-8 px-2.5 rounded-lg hover:text-foreground"
                title="Reset conversation"
              >
                <RefreshCw className="size-3" />
                Reset
              </Button>
            </div>
          </div>

          {/* Consultation Progress Indicator Bar */}
          <div className="border-b border-border/70 bg-muted/15 px-4 py-2 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent shrink-0" />
              <span className="font-semibold text-foreground">
                Consultation Stage {Math.min(userTurnCount + 1, 4)} of ~4
              </span>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="text-muted-foreground hidden sm:inline">
                {userTurnCount === 0
                  ? "Symptom Presentation"
                  : userTurnCount === 1
                  ? "Duration & Severity"
                  : userTurnCount === 2
                  ? "Location & Context"
                  : "Clinical Synthesis"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-20 sm:w-28 h-1.5 rounded-full bg-muted/80 overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(((userTurnCount + 1) / 4) * 100, 100)}%` }}
                />
              </div>
              <span className="text-muted-foreground font-mono tabular-nums text-[10px]">
                {Math.min(Math.round(((userTurnCount + 1) / 4) * 100), 100)}%
              </span>
            </div>
          </div>

          {/* Messages Scroll Area with Accessible aria-live Log */}
          <div
            role="log"
            aria-live="polite"
            aria-atomic="false"
            aria-label="Clinical consultation history"
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
          >
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={`flex ${isAssistant ? "justify-start" : "justify-end"} animate-in fade-in-50 duration-180`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-xl p-4 text-sm leading-relaxed border ${
                      isAssistant
                        ? "bg-card text-foreground border-border border-l-2 border-l-accent shadow-none"
                        : "bg-muted/60 text-foreground border-border/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-border/50 text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {isAssistant ? (
                          <>
                            <span className="size-1.5 rounded-full bg-accent" />
                            <span className="text-accent uppercase tracking-wider">Clinical Note</span>
                          </>
                        ) : (
                          <>
                            <User className="size-3 text-muted-foreground" />
                            <span className="text-muted-foreground uppercase tracking-wider">Patient Note</span>
                          </>
                        )}
                      </div>
                      {message.timestamp && (
                        <span className="text-muted-foreground tabular-nums text-[10px]">
                          {message.timestamp}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-foreground/90 font-normal">{message.content}</p>
                  </div>
                </div>
              );
            })}

            {/* Staged Clinical Evaluation Progress State */}
            {isLoading && (
              <div
                role="status"
                aria-live="polite"
                className="max-w-[88%] sm:max-w-[80%] rounded-xl border border-border border-l-2 border-l-accent bg-card p-4 space-y-2.5 animate-in fade-in-50 duration-180"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                    <div className="flex items-center gap-1 py-0.5">
                      <span className="size-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
                      <span className="size-1.5 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
                      <span className="size-1.5 rounded-full bg-accent animate-bounce" />
                    </div>
                    <span>Omnicura is evaluating clinical presentation...</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Screening
                  </span>
                </div>

                <div className="space-y-1.5 py-1">
                  <div className="h-2.5 w-5/6 rounded bg-muted animate-pulse" />
                  <div className="h-2.5 w-3/5 rounded bg-muted animate-pulse" />
                </div>

                <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                  Evaluating red-flag indicators, symptom duration, and supportive care protocols.
                </p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Option Choice Chips */}
          {currentQuickOptions.length > 0 && !isLoading && (
            <div className="px-4 py-3 bg-muted/20 border-t border-border flex flex-wrap items-center gap-2 animate-in fade-in-50">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 w-full sm:w-auto mr-1">
                <Sparkles className="size-3 text-accent" />
                Suggested responses:
              </span>
              {currentQuickOptions.map((option, idx) => (
                <Button
                  key={idx}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendMessage(option)}
                  className="text-xs h-7 px-3 rounded-full bg-background hover:bg-muted hover:text-foreground transition-colors font-medium border-border"
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

          {/* Hackathon Demo Presets */}
          <div className="px-4 py-2.5 bg-muted/10 border-t border-border">
            <DemoScenarios onSelectScenario={(text) => handleSendMessage(text)} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-border bg-card">
            {/* Real-time Audio Waveform Visualizer */}
            <AudioWaveformVisualizer
              isListening={isListening}
              onStop={toggleSpeechRecognition}
              className="mb-2.5"
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleSpeechRecognition}
                className={`size-9 rounded-lg shrink-0 ${isListening ? "bg-destructive/10 text-destructive border-destructive/40" : ""}`}
                title={isListening ? "Listening... click to stop" : "Speak your symptoms"}
              >
                {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                <span className="sr-only">Voice input</span>
              </Button>

              {onOpenVision && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onOpenVision}
                  className="size-9 rounded-lg shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  title="Upload visible symptom photo (rash, cut, burn)"
                >
                  <Camera className="size-4" />
                  <span className="sr-only">Upload symptom image</span>
                </Button>
              )}

              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? "Listening... speak now" : "Describe symptoms or answer question..."}
                disabled={isLoading}
                className="flex-1 text-sm h-9 rounded-lg"
              />

              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="h-9 px-3 rounded-lg shrink-0 gap-1.5"
              >
                <Send className="size-3.5" />
                <span className="text-xs font-semibold hidden sm:inline">Send</span>
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
