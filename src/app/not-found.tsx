import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { OmnicuraLogo } from "@/components/shared/brand-logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-app p-6">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(50%_50%_at_50%_45%,black,transparent)]" aria-hidden="true" />
      <div className="relative w-full max-w-md text-center animate-rise">
        <div className="mb-10 flex justify-center">
          <OmnicuraLogo size="md" showWordmark />
        </div>
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface text-accent shadow-sm">
          <Compass className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-6 type-overline text-text-tertiary">Error 404</p>
        <h1 className="mt-2 type-title text-foreground">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          The view you requested may have moved or never existed. Your clinical records are safe.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to workspace
        </Link>
      </div>
    </div>
  );
}
