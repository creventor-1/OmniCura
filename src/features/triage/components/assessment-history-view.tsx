"use client";

import * as React from "react";
import { Clock, ShieldAlert, Trash2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { StoredAssessment } from "@/types/database";
import { AssessmentResponse } from "@/schemas/triage";

export function AssessmentHistoryView() {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [assessments, setAssessments] = React.useState<StoredAssessment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    async function fetchHistory() {
      if (!user) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("assessments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (active && !error && data) {
          setAssessments((data as StoredAssessment[]) || []);
        }
      } catch (err) {
        console.warn("[ASSESSMENT_HISTORY_EXCEPTION]", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchHistory();
    return () => {
      active = false;
    };
  }, [user, supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment record?")) return;

    try {
      await supabase.from("assessments").delete().eq("id", id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("Failed to delete assessment record:", e);
    }
  };

  const formatDateString = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (!user) {
    return (
      <Card className="max-w-xl mx-auto my-6 text-center p-6">
        <FileText className="size-10 text-muted-foreground mx-auto mb-2" />
        <CardTitle className="text-lg">Sign in to view History</CardTitle>
        <CardDescription className="text-xs mt-1">
          Registered users can securely review their past symptom assessments and clinical recommendations.
        </CardDescription>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto my-6 text-center p-8">
        <Clock className="size-10 text-muted-foreground mx-auto mb-2" />
        <CardTitle className="text-base">No previous assessments found</CardTitle>
        <CardDescription className="text-xs mt-1">
          Your previous symptom assessments and triage reports will appear here.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Assessment History ({assessments.length})</h3>
      </div>

      <div className="space-y-3">
        {assessments.map((item) => {
          const isExpanded = expandedId === item.id;
          const result = item.assessment_result as unknown as AssessmentResponse;

          const badgeStyles = {
            "non-urgent": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
            urgent: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
            emergency: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
          }[item.severity];

          return (
            <Card key={item.id} className="overflow-hidden transition-all">
              <div
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[11px] font-semibold uppercase ${badgeStyles}`}>
                      {item.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateString(item.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-medium line-clamp-1 text-foreground">
                    &ldquo;{item.symptoms}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="size-8 text-muted-foreground hover:text-destructive"
                    title="Delete record"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
              </div>

              {isExpanded && result && (
                <CardContent className="pt-2 pb-4 border-t bg-muted/10 space-y-3 text-xs leading-relaxed">
                  <div>
                    <h5 className="font-semibold text-foreground">Possible Considerations</h5>
                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
                      {result.possibleConditions?.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-foreground">Triage Rationale</h5>
                    <p className="text-muted-foreground mt-0.5">{result.severityReasoning}</p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-foreground">Recommended Action</h5>
                    <p className="text-primary font-medium mt-0.5">{result.recommendedAction}</p>
                  </div>

                  <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5 shrink-0 text-amber-500" />
                    <span>{item.disclaimer}</span>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
