import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8 text-center space-y-4 shadow-overlay animate-in fade-in-50 duration-200">
        <div className="size-12 rounded-xl bg-secondary border border-border-subtle text-text-secondary flex items-center justify-center mx-auto">
          <Compass className="size-6 stroke-[1.5]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            Page Not Found
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            The clinical view or resource you requested does not exist or may have been relocated.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/">
            <Button size="default" className="gap-2 h-10 px-4 text-xs font-semibold">
              <Home className="size-3.5" />
              <span>Return to Workspace</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
