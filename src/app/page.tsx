import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/theme-toggle";
import { ShieldAlert, Activity, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
      <header className="absolute top-4 right-4">
        <ThemeToggle />
      </header>
      <main className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            <Activity className="size-3.5" />
            Hackathon Development Build
          </div>
          <h1 className="text-3xl font-bold tracking-tight">TriageAI</h1>
          <p className="text-muted-foreground text-sm">
            AI-Powered Emergency Triage & First-Aid Assistant
          </p>
        </div>

        <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Medical Disclaimer</AlertTitle>
          <AlertDescription className="text-xs">
            TriageAI provides educational guidance only and is not a medical diagnosis. If you are experiencing a life-threatening medical emergency, call your local emergency services immediately.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Environment Foundation Ready
            </CardTitle>
            <CardDescription>
              Phase 1 environment setup and core architecture scaffolding completed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Next.js App Router with TypeScript &amp; Tailwind CSS</p>
            <p>✓ shadcn/ui base primitives &amp; light/dark theme system</p>
            <p>✓ Modular architecture directory structure</p>
            <p>✓ Official repository connected</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
