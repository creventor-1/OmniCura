# Task: Redesign the entire OmniCura AI interface as a production-grade AI healthcare SaaS product

## Role
You are a senior product designer and frontend engineer. Make decisive design decisions,
implement them in code, and justify them briefly. Only ask questions that block
correctness, never questions of taste.

## Product context
- Product: OmniCura AI, an AI-assisted emergency triage and first-aid web app. It is
  educational guidance, not diagnosis.
- Users: members of the public, often stressed, on phones, sometimes on weak connections.
- Expected surfaces (confirm during the audit): symptom assessment, structured results,
  symptom image analysis, medication scanner, voice input, nearby hospitals map with
  navigation, assessment history, PDF export, health profile, emergency contacts,
  auth and guest mode, settings.
- All functionality already works. Redesign the visual layer, interactions, and
  front-end structure only.

## Stack (work within it; add no dependencies; do not upgrade versions)
- Next.js 16 App Router + Turbopack, React 19, TypeScript strict
- Tailwind CSS v4 (CSS-first config: tokens live in `@theme` in globals.css; there is no
  tailwind.config.js), tw-animate-css
- Base UI (`@base-ui/react`) and Radix patterns for headless primitives
- CVA + clsx + tailwind-merge for variants (a `cn()` helper)
- next-themes (class strategy), Lucide React (the only icon library)
- React Hook Form + Zod, Zustand, Supabase (auth, Postgres), Leaflet, Web Speech and
  Web Audio APIs, jsPDF + jspdf-autotable, Gemini via route handlers
- Font: **Geist** (preferred) or Inter via `next/font`, replacing the current font.
  Subset to Latin, `display: swap`, exposed as `--font-sans` and `--font-mono`, with
  system fallbacks.

## Hard constraints (never violate)
1. Do not modify: `/api/*` route handlers, Zod schemas, the deterministic red-flag
   safety engine logic, Gemini prompts or response schemas, Supabase queries, RLS
   or migrations, Zustand store shapes, or the Haversine routing logic.
2. No new features. You may add the UI states that existing features imply
   (loading, empty, error, offline, permission-denied).
3. Respect the Server/Client boundary. Components are Server Components by default;
   add `"use client"` only where needed, and push it as far down the tree as possible.
   Do not change caching or Partial Prerendering behavior. Use `loading.tsx`,
   `error.tsx`, `not-found.tsx`, and `<Suspense>` skeleton fallbacks per route segment
   for async states.
4. All styling comes from tokens. No hard-coded hex values, pixel margins, or font sizes
   in components. Never use arbitrary Tailwind values (`w-[13px]`) when a token or scale
   step exists.
5. Everything interactive is keyboard-operable with a visible focus ring.
6. Respect `prefers-reduced-motion`, `prefers-color-scheme`, and
   `prefers-reduced-transparency`.
7. `npx tsc --noEmit`, lint, and `next build` must pass before you finish.

## Process (in order)
0. **Audit.** Read the codebase and list routes, shared components, and the current
   styling approach. Name the 5 to 8 worst visual problems. Output this before coding.
1. **Tokens.** Build the token layer in globals.css: light and dark together, plus glass
   utilities.
2. **Primitives.** Restyle or build, on Base UI where a primitive exists: Button, Input,
   Select, Textarea, Checkbox/Radio/Switch, Card, Badge, Tabs, Table, Dialog, Sheet,
   Popover, DropdownMenu, Toast, Tooltip, Skeleton, EmptyState, ErrorState, Alert.
   Variants are defined with CVA. Each primitive implements its full state matrix.
3. **Shell.** Layout, sidebar, top bar, mobile navigation, theme toggle.
4. **Domain components.** SeverityBadge, RedFlagBanner, AIResultPanel, MapShell, Waveform,
   ImageUploader, MedicationResult (see "OmniCura-specific components").
5. **Pages.** Apply the system page by page, starting with the dashboard. If a page needs
   a new style, add it to the system instead of inlining it.
6. **Verify** against the Definition of Done, with evidence.

## Design tokens

### Implementation pattern (Tailwind v4)
Define raw tokens as CSS variables on `:root` and `.dark`, then expose them to Tailwind
through `@theme inline`, so utilities like `bg-surface` and `text-secondary` work.

```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:where(.dark, .dark *));

:root {
  --bg-app: #F6F8FA;  --bg-surface: #FFFFFF;  --bg-raised: #FFFFFF;
  --border-subtle: #E3E8EE;  --border-strong: #CBD4DF;
  --text-primary: #0B1B33;  --text-secondary: #51607A;  --text-tertiary: #5B6B82;
  --brand: #12305A;  --brand-hover: #0E2646;  --brand-fg: #FFFFFF;
  --accent: #14A3B3;  --accent-text: #0B7A87;
  --success: #1F9D63;  --success-muted: #E8F6EF;
  --warning: #B7791F;  --warning-text: #8A5A12;  --warning-muted: #FDF3E1;
  --danger: #C0392B;   --danger-muted: #FCEBE9;
  --ring: #14A3B3;
  --glass-bg: rgb(255 255 255 / 0.72);  --glass-border: rgb(11 27 51 / 0.08);
  --glass-highlight: rgb(255 255 255 / 0.10);
}
.dark {
  --bg-app: #0A1120;  --bg-surface: #111A2E;  --bg-raised: #16213A;
  --border-subtle: #1F2B45;  --border-strong: #2B3A5C;
  --text-primary: #E8EEF7;  --text-secondary: #9AA9C2;  --text-tertiary: #8493AD;
  --brand: #7FA8E0;  --brand-hover: #9BBBEA;  --brand-fg: #0A1120;
  --accent: #2DBCCB;  --accent-text: #4CCBD8;
  /* re-derive success/warning/danger and their muted tints for dark; verify contrast */
  --glass-bg: rgb(17 26 46 / 0.65);  --glass-border: rgb(255 255 255 / 0.08);
  --glass-highlight: rgb(255 255 255 / 0.06);
}
@theme inline {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --color-app: var(--bg-app);  --color-surface: var(--bg-surface);  /* ...and so on */
  --radius-control: 8px;  --radius-card: 12px;  --radius-dialog: 16px;
}
```
The values above are a starting point; refine within the same family. You may convert
to oklch. Amber text on light backgrounds must use `--warning-text` (the base amber
fails 4.5:1 as text). Verify every pairing.

### Color rules
- Neutrals do about 90% of the work. Navy is the brand, teal is the accent. Amber is for
  warnings and "urgent" only. Red is for critical errors, emergencies, and destructive
  actions only.
- No decorative gradients. The only exception is one faint radial teal glow behind the
  dashboard header.
- Contrast: text >= 4.5:1, large text and UI boundaries >= 3:1, in both themes. Never use
  color as the only signal (pair it with an icon and a label).

### Typography
- Scale (px): 12 / 13 / 14 / 16 / 20 / 24 / 32. App body is 14, with 16 for
  safety-critical reading copy and mobile form inputs (16 also prevents iOS zoom on focus).
- Page title 24 to 32 semibold; section title 16 to 20 semibold; captions 12 to 13 in
  secondary color. Weights 400/500/600 only. Line-height 1.5 body, 1.2 to 1.3 headings.
  Letter-spacing -0.01 to -0.02em on headings of 24px and above.
- Tabular numerals for metrics, tables, distances, and times.

### Spacing, radius, elevation
- 4px base. Allowed steps: 4, 8, 12, 16, 24, 32, 48, 64.
- Gutters 16 / 24 / 32. Card padding 16 to 24. Section rhythm 24 to 32. Favor generous
  whitespace.
- Radius: 8 controls, 12 cards, 16 dialogs and sheets, full for pills and avatars.
- Borders first, shadows second. Exactly three shadow tokens: `shadow-card-hover`,
  `shadow-overlay`, `shadow-glass`. Cards at rest: 1px border, no shadow.

### Translucency (functional, restrained, layered)
Define as Tailwind `@utility` classes: `glass-chrome` (sidebar, top bar, mobile tab bar)
and `glass-overlay` (dialogs, popovers, dropdowns, toasts, tooltips).
- Allowed only on floating or overlay layers. **Never** on content cards, tables, forms,
  AI result panels, the red-flag banner, or anything holding dense text.
- Recipe: `background: var(--glass-bg)`, 1px `var(--glass-border)`,
  `backdrop-filter: blur(16px) saturate(150%)`, an inset 1px top highlight using
  `--glass-highlight`.
- Never stack glass on glass. Do not animate blur. Animate opacity and transform only.
- Performance (low-end Android, weak GPUs): blur 8px below 768px, at most one
  backdrop-filter layer visible at a time, no backdrop-filter on scrolling lists.
- Fallbacks: `@supports not (backdrop-filter: blur(1px))` and
  `@media (prefers-reduced-transparency: reduce)` switch to solid `--bg-surface`.
  Text on glass must pass contrast against worst-case content behind it; raise opacity
  if not.
- Modal backdrop scrim: black at 40% (light) and 60% (dark).

### Motion
- 120ms hover and press, 180ms reveals, 240ms dialogs and page fades. Ease-out in, ease-in
  out. Opacity and transform only. Use tw-animate-css utilities and CSS transitions; do
  not add an animation library.
- Allowed: press feedback, card hover (border change or <= 2px lift), dialog fade + 8px
  rise, skeleton shimmer, toast slide, page fade.
- Not allowed: bounce, parallax, looping decoration, anything over 300ms. Reduced motion
  means fades only.

## Components
- **Buttons:** primary, secondary, ghost, danger (CVA variants). Heights 32 / 36 / 44, with
  44 the minimum on mobile. States: hover, active, focus-visible, loading (stable width,
  label kept), disabled. One primary button per view region.
- **Cards:** 12px radius, 1px subtle border, solid surface, header/body/footer pattern.
  Interactive cards get hover and focus styles; static cards must not look clickable.
- **Forms (React Hook Form + Zod):** visible labels above inputs, helper text below,
  validation on blur, error state = border + icon + message. Map Zod issues to specific
  human messages ("Enter a date in the past", not "Invalid input"). Fully restyle native
  controls. Single column on mobile.
- **Tables / history lists:** sticky header, subtle dividers, right-aligned numerics. Below
  768px, switch to stacked cards.
- **Dialogs:** Base UI Dialog; focus trap, Esc, scroll lock. `glass-overlay` on desktop,
  bottom sheet on mobile. Destructive confirmations name the affected object.
- **Toasts:** four severities with icon + text. Persistent context uses Alert banners.

## Navigation
- Desktop: left sidebar 240px, collapsible to a 64px icon rail, `glass-chrome` with a
  hairline right border. Grouped sections, a clear active state (tinted background +
  stronger text + 2px accent indicator), user menu and settings pinned to the bottom.
- Top bar: sticky `glass-chrome`, page title or breadcrumbs, theme toggle, and a command
  palette trigger only if one already exists.
- Tablet: icon rail that expands as an overlay. Mobile: top bar plus bottom tab bar
  (max 5 items), safe-area aware.
- Persist sidebar state. Theme via next-themes: `attribute="class"`,
  `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`,
  `suppressHydrationWarning` on `<html>`, and a mounted guard on the toggle to avoid
  hydration flicker.
- Icons: Lucide only, 1.5 to 1.75px stroke, sizes 16 / 20 / 24. No emoji as icons.
- On mobile, the emergency action (call or find nearest hospital) must be reachable in
  one tap from every screen.

## Dashboard
Page header (context line + primary action); a KPI row of 3 to 4 cards using only metrics
that already exist in the data; a primary work area (start assessment, recent assessments);
a secondary column (quick actions, emergency contacts, nearby facilities). Every card earns
its place. Never invent figures. Guest users see a calm, honest prompt about saving history
only if guest-to-user handoff exists today.

## OmniCura-specific components

**RedFlagBanner (deterministic safety engine output).**
- Renders synchronously from the safety engine, before and independent of the AI response.
  It must never wait on Gemini and never be hidden behind a skeleton.
- Solid surface only (no glass), top of the view, danger treatment with icon, plain
  language, and a prominent call-emergency action using the number already configured in
  the app (do not hard-code a new one). Not dismissible for emergency-level flags.
- Restrained and structured, not frantic: no flashing, no shaking.

**SeverityBadge.** Maps the existing levels (non-urgent / urgent / emergency) to
success-or-teal / amber / red, each with an icon and a text label. Used consistently in
results, history, and PDF-adjacent summaries.

**AIResultPanel (Gemini structured output).**
- Solid surface, labeled "AI-generated" with a subtle marker; no chat bubbles.
- Render the existing schema fields as sections: summary, severity, recommended action,
  first-aid steps (numbered), reasoning or contributing factors, caveats and disclaimer.
  Do not change the schema; map what exists.
- Show confidence only if the response contains it; otherwise show "basis for this result".
  Never fabricate a score.
- Loading: staged progress ("Checking for urgent signs", "Analyzing symptoms", "Preparing
  guidance") or layout-matched skeletons, driven by real state only. Failure: retry, edit
  input, or call/contact a human.
- The disclaimer is visible but not obstructive.

**ImageUploader / symptom image analysis.** Camera and file selection, preview, clear
"photo is analyzed by AI; this is not a diagnosis" note, replace and remove actions,
permission-denied and unsupported-file error states.

**MedicationResult.** Structured sections (active ingredients, standard dosing as read from
the label, precautions) with a visible "verify with a pharmacist or doctor" caveat. Visually
distinguish text extracted from the label from AI commentary where the data supports that
distinction. No dosing numbers are styled to look more authoritative than they are.

**Voice input and Waveform.**
- Clear states: idle, requesting permission, listening, processing, unsupported browser,
  permission denied.
- The 20-bar canvas waveform reads its colors from CSS variables via `getComputedStyle`
  and re-reads on theme change; it is DPR-aware, resizes cleanly, and under
  reduced-motion renders a static indicator instead of a live animation.

**MapShell (Leaflet).**
- Load Leaflet client-only (`dynamic` with `ssr: false`) behind a skeleton of the same
  dimensions; no layout shift.
- Replace default marker images with custom `divIcon` markers that use token colors, so
  there are no broken-marker issues and no off-brand pins. User location uses a distinct
  accent dot.
- Restyle zoom controls, popups, and attribution with tokens. Keep OSM attribution visible
  and legible. Dark mode: darken the tile pane with a CSS filter (or equivalent) so the map
  does not glare; verify marker and label contrast in both themes.
- Results list beside the map (desktop) or in a bottom sheet (mobile) with distance, drive
  estimate, a call action, and navigate. Cards are solid, not glass.
- **Location fallback:** when the app is using the fallback coordinates rather than real
  GPS, show a persistent inline notice ("Showing facilities near an approximate location.
  Enable location for accurate results") so users never mistake it for their position.
  Handle permission denied, timeout, and Overpass failure with clear recovery actions.
- **Offline:** when facilities come from `localStorage`, show a quiet banner ("You're
  offline. Showing saved facilities"), and show the saved-at time only if it is already
  stored. Do not add new storage fields.

**PDF export (jsPDF + autotable).** Do not change the report content or logic. You may align
fonts, colors, and table styling with the brand via a single `pdf-theme.ts` that mirrors
the light-theme tokens (PDFs are always light, never glass). Add loading and success/failure
feedback to the export button.

## Data visualization
One accent hue plus neutrals, light gridlines, labeled axes, tooltips with exact values, a
text alternative, and both themes verified. No rainbow palettes or 3D.

## Required states for every page and data component
- **Loading:** layout-matched skeletons, no layout shift.
- **Empty:** icon, one-sentence explanation, one primary action (for example "No assessments
  yet. Start your first assessment").
- **Error:** what happened in plain language, how to fix it, a recovery action. No raw
  errors or stack traces.
- **Offline / permission-denied / slow:** handled wherever the feature can reach them.

## Responsive
Mobile-first. Verify at 360, 768, 1024, and 1440px, with no horizontal page scroll. Touch
targets >= 44px. Re-layout at each breakpoint rather than shrinking the desktop design.
Performance matters for users on slow connections: lazy-load heavy client code (Leaflet,
jsPDF) where this does not change behavior, self-host the font via `next/font`, and avoid
layout shift.

## Dark mode
A designed theme, not an inversion: layered surfaces (app < surface < raised), desaturated
brand colors, no pure #000 or #FFF, and re-verified status colors, charts, map, and
waveform. Glass in dark mode has a visible edge highlight and no muddy gray.

## Anti-patterns (reject on sight)
Default component-library look; mixed radii; glass on content or dense text; stacked glass;
neon glows; decorative gradients; colored card backgrounds for variety; oversized in-app
headings; placeholder-only labels; spinners where skeletons belong; icon-only buttons
without a label or tooltip; default Leaflet markers; fake data; chat-bubble AI styling.

## Definition of Done (verify with evidence)
1. Every color, size, space, and radius in components resolves to a token; no arbitrary
   values where a scale step exists.
2. Both themes pass contrast for text, borders, focus rings, status colors, map labels, and
   text over glass.
3. Glass has solid fallbacks (no backdrop-filter, reduced transparency).
4. Every route has loading, empty, and error states (`loading.tsx` / `error.tsx` /
   Suspense where applicable).
5. The RedFlagBanner renders independently of AI loading and error states.
6. Layouts verified at 360 / 768 / 1024 / 1440 with no overflow.
7. Keyboard-only walkthrough of the assessment, results, hospitals, and settings flows works
   with visible focus.
8. One icon library, one type family, spacing from the scale only.
9. `tsc --noEmit`, lint, and `next build` pass; no API, schema, safety-engine, or Supabase
   code changed.
10. Final review: list anything that still looks amateur and fix it.

## Deliverables
1. Design system summary (type, color, glass, spacing, motion) and why.
2. Files changed, grouped by tokens / primitives / shell / domain components / pages.
3. Verification results with evidence and build output.
4. Known limitations.
5. Up to 5 prioritized next steps.