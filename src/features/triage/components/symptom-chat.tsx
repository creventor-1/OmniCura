"use client";

import * as React from "react";
import { Send, Mic, MicOff, Bot, User, RefreshCw, Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkRedFlags } from "@/lib/red-flags";
import { EmergencyAlertModal } from "@/features/safety/components/emergency-alert-modal";
import { DisclaimerModal } from "./disclaimer-modal";
import { AssessmentResultView } from "./assessment-result-view";
import { DemoScenarios } from "./demo-scenarios";
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

export function SymptomChat({ onLocateFacilities, onOpenVision }: SymptomChatProps) {
  const { user, setGuestAssessment } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [messages, setMessages] = React.useState<TriageMessage[]>([
    {
      id: "initial-assistant-msg",
      role: "assistant",
      content:
        'Hello, I am TriageAI. Please describe your symptoms naturally (for example: "I have had a mild headache and sore throat for two days"). How can I help you today?',
      timestamp: "Just now",
    },
  ]);

  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentQuickOptions, setCurrentQuickOptions] = React.useState<string[]>([]);
  const [assessment, setAssessment] = React.useState<AssessmentResponse | null>(null);

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
      // Check if user has consented health profile to attach
      let healthProfilePayload = undefined;
      if (user) {
        try {
          const { data: profile } = await supabase
            .from("health_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (profile && profile.allow_ai_use) {
            healthProfilePayload = {
              age: profile.age,
              sex: profile.sex,
              allergies: profile.allergies,
              chronicConditions: profile.chronic_conditions,
              currentMedications: profile.medications,
            };
          }
        } catch (e) {
          console.warn("Could not load health profile for triage:", e);
        }
      }

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
        throw new Error(data.error || "Failed to process triage assessment.");
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

        setMessages((prev) => [
          ...prev,
          {
            id: createMessageId("assistant"),
            role: "assistant",
            content:
              "I have gathered sufficient context and prepared your structured triage assessment below.",
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
            "The triage service is currently busy or experiencing high demand. Please try again in a moment. If you are worried or symptoms are worsening, please contact a healthcare provider or call emergency services directly.",
          timestamp: getFormattedTimestamp(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAssessment(null);
    setCurrentQuickOptions([]);
    setMessages([
      {
        id: "initial-assistant-msg",
        role: "assistant",
        content:
          "Hello, I am TriageAI. Please describe your symptoms naturally. How can I help you today?",
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

      {/* When completed, show structured assessment view */}
      {assessment ? (
        <AssessmentResultView
          assessment={assessment}
          onReset={handleReset}
          onLocateFacilities={onLocateFacilities}
        />
      ) : (
        <div className="flex flex-col flex-1 border rounded-xl bg-card shadow-sm overflow-hidden min-h-[580px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-none">TriageAI Assistant</h3>
                <span className="text-[11px] text-muted-foreground">
                  Adaptive Emergency &amp; Symptom Triage
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground gap-1 h-8"
              title="Reset conversation"
            >
              <RefreshCw className="size-3" />
              Reset
            </Button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${isAssistant ? "justify-start" : "justify-end"} animate-in fade-in-50 duration-200`}
                >
                  {isAssistant && (
                    <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-teal-600 text-white shadow-xs text-xs font-bold mt-0.5">
                      <Bot className="size-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      isAssistant
                        ? "bg-card text-foreground rounded-tl-xs border border-border/70"
                        : "bg-primary text-primary-foreground rounded-tr-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.timestamp && (
                      <div
                        className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] ${
                          isAssistant ? "text-muted-foreground" : "text-primary-foreground/75"
                        }`}
                      >
                        <span>{message.timestamp}</span>
                      </div>
                    )}
                  </div>

                  {!isAssistant && (
                    <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs text-xs font-bold mt-0.5">
                      <User className="size-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pulsing 3-Dot Shimmer Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-3 animate-in fade-in-50 duration-200">
                <div className="flex size-8 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-teal-600 text-white shadow-xs text-xs font-bold mt-0.5">
                  <Bot className="size-4" />
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-card border border-border/70 px-4 py-3 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-2 rounded-full bg-primary animate-bounce" />
                    <span className="text-xs font-semibold text-foreground ml-2">
                      TriageAI is analyzing symptoms...
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Screening duration, clinical urgency factors &amp; safety red-flags.
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Option Choice Chips */}
          {currentQuickOptions.length > 0 && !isLoading && (
            <div className="px-4 py-3 bg-muted/30 border-t flex flex-wrap items-center gap-2 animate-in fade-in-50">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 w-full sm:w-auto mr-1">
                <Sparkles className="size-3 text-primary" />
                Suggested responses:
              </span>
              {currentQuickOptions.map((option, idx) => (
                <Button
                  key={idx}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendMessage(option)}
                  className="text-xs h-8 px-3.5 rounded-full bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all font-medium border-border/80 shadow-2xs active:scale-95"
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

          {/* Hackathon Demo Presets */}
          <div className="px-4 py-2 bg-muted/10 border-t">
            <DemoScenarios onSelectScenario={(text) => handleSendMessage(text)} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t bg-background">
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
                className={`size-10 shrink-0 ${isListening ? "bg-red-500/10 text-red-600 border-red-500/40 animate-pulse" : ""}`}
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
                  className="size-10 shrink-0 text-muted-foreground hover:text-primary transition-colors"
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
                className="flex-1 text-sm h-10"
              />

              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="size-10 shrink-0 p-0"
              >
                <Send className="size-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
