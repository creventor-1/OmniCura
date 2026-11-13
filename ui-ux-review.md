# TriageAI — UI/UX Hackathon Review

> [!IMPORTANT]
> This review is written as if judging a hackathon finalist. The goal is first place. Praise is given only where genuinely earned. Everything else is honest critique.

---

## Scores

| Category | Score | Verdict |
|---|---|---|
| **Overall Design** | 66 / 100 | Promising foundation, inconsistent execution |
| **Visual Hierarchy** | 70 / 100 | Strong in places, weak in others |
| **UX** | 52 / 100 | Fundamental navigation problems undercut everything |
| **Accessibility** | 40 / 100 | Significant gaps across the board |
| **Responsiveness** | 63 / 100 | Functional but not polished on mobile |
| **Professionalism** | 60 / 100 | Feels like a strong prototype, not a launchable product |

**Composite: 58.5 / 100**

This is not first-place material in its current state. The hero section and assessment results page punch above their weight, but critical UX and accessibility failures drag the overall score down hard. A hackathon judge who clicks the back button once and nothing happens will immediately notice.

---

## Critical Issues

These would likely cost you the win against a polished competitor.

### 1. No URL-Based Routing — Back Button is Broken

All navigation is `useState`-driven tab switching inside `DashboardView`. There are no URL changes, no route segments, no browser history entries.

**Impact:**
- Pressing the browser back button navigates *away from the entire app*, not to the previous tab.
- No deep linking. A judge cannot bookmark or share a specific view.
- No `popstate` handling whatsoever.
- This is the single most damaging UX problem in the application.

For a hackathon demo where judges are clicking around quickly, this will feel broken. It violates a fundamental web UX expectation.

### 2. Duplicate Navigation — Two Nav Systems Visible Simultaneously

When `showTabsHeader` is true, both the top `Navbar` (with 7 items) and the inner `DashboardView` tab bar render at the same time. The user sees **two rows of navigation** doing essentially the same thing.

Additionally, the "Contacts" tab exists only in the dashboard tab bar — it's missing from the navbar entirely. This creates a discoverability gap.

**Impact:**
- Confusing and visually cluttered.
- Judges will wonder which nav to use.
- Inconsistent item sets between the two navs breaks user mental models.

### 3. Text is Too Small Throughout

The application uses `text-[10px]`, `text-[11px]`, and `text-xs` extensively:

- Trust card descriptions: `text-[11px]` — borderline illegible on mobile
- Chat timestamps: `text-[10px]` — requires squinting
- Various labels and metadata: `text-xs` — consistently undersized
- Hospital popup content: small raw HTML text

WCAG recommends a minimum body text size equivalent to 16px. Much of the supporting text here is 60-70% of that. On a phone screen, this content becomes decorative rather than informative.

**Impact:**
- Judges on phones (common at hackathon demos) will struggle to read secondary content.
- Undermines the "professional healthcare product" positioning — medical apps must prioritize readability.

---

## Major Issues

These won't immediately disqualify you but will noticeably hurt your score.

### 4. Form Labels Lack `htmlFor`/`id` Associations

In `health-profile-form.tsx`, `<label>` elements are rendered but aren't programmatically linked to their inputs via `htmlFor` and `id` attributes. The one exception is the AI consent checkbox, which does this correctly — making the inconsistency more visible.

**Impact:**
- Clicking a label doesn't focus its input — a basic usability expectation.
- Screen readers can't associate labels with fields.
- Any accessibility-focused judge will flag this immediately.

### 5. No `aria-live` Regions for Dynamic Content

Chat messages, loading states, facility list updates, and assessment results all inject content dynamically without `aria-live` announcements.

**Impact:**
- Screen reader users get no notification when new chat messages arrive, when loading completes, or when hospital results update.
- For a healthcare application, this is a particularly bad look.

### 6. Mobile Menu Doesn't Trap Focus

The mobile navigation drawer opens over content but doesn't implement focus trapping. A keyboard user can tab through the drawer and into the content behind it.

**Impact:**
- Keyboard-only users can interact with hidden content.
- Standard accessibility requirement for modal/drawer overlays.

### 7. No Page Transition Animations

Tab switches are instant content swaps with no animation. The redesign spec explicitly requested smooth transitions. Currently there's a jarring flash when switching between views.

**Impact:**
- Makes the app feel less polished than competitors.
- Breaks the "calm healthcare aesthetic" the redesign spec targets.

### 8. `confirm()` for Destructive Actions

Deleting an emergency contact uses the browser's native `confirm()` dialog. This is an unstyled OS-level modal that completely breaks the visual design language.

**Impact:**
- Looks like a developer tool, not a product feature.
- Inconsistent with the rest of the UI.
- A custom confirmation dialog takes 20 minutes to build and dramatically improves perceived quality.

### 9. Footer is an Afterthought

The footer is 2 lines — a copyright notice and a disclaimer. Compare this to the heavily polished hero section above it. The contrast makes the footer feel like it was forgotten.

**Impact:**
- Judges who scroll to the bottom see an abrupt drop in quality.
- A proper footer with links, branding, and structure signals completeness.

### 10. No Favicon or OG Metadata

The browser tab shows a generic Next.js favicon (or none). There are no Open Graph meta tags for social sharing previews.

**Impact:**
- When a judge shares the link or has multiple tabs open, TriageAI has no visual identity in the browser chrome.
- Small detail, but it's a telltale sign of prototype vs. product.

---

## Minor Polish

These are "last 10%" items that separate good from great.

### 11. Inconsistent Border Radius

Elements use `rounded-lg`, `rounded-xl`, `rounded-2xl`, and `rounded-3xl` with no clear system for which component gets which radius. Cards range from `rounded-lg` to `rounded-2xl`. Buttons and inputs are similarly inconsistent.

**Suggestion:** Define 2-3 standard radii in your design tokens and apply them consistently (e.g., `--radius-card`, `--radius-button`, `--radius-input`).

### 12. Hover Effects on Hero Cards Serve No Purpose on Mobile

The hero mockup cards have `hover:-translate-y-1` which only works with a mouse. On mobile (likely >50% of demo viewers), these are static — which is fine, but the interaction was designed for desktop only.

### 13. `animate-ping` in Empty States Ignores `prefers-reduced-motion`

The pulsing dot animation in empty states will be distracting for users with vestibular disorders. There's no `prefers-reduced-motion` media query check.

### 14. Hospital Map Popups Use Raw HTML Strings

Map popups are built with template literal HTML strings rather than React components. This means no React event handling, no consistent styling via Tailwind classes, and no accessibility attributes on popup content.

### 15. Trust Section 5-Column Layout Squeezes Content

On medium screens (~768-1024px), the 5-column grid for trust indicator cards compresses text to the point where descriptions wrap awkwardly. A 3-column or responsive grid would work better.

### 16. Dark Mode Has No Toggle

The CSS defines dark mode variables, but there's no visible UI control to switch themes. The app respects system preference only. For a demo, having a toggle demonstrates the feature to judges who might be in light mode.

---

## Things Done Well

Credit where it's genuinely earned.

### ✅ Custom SVG Logo

The `brand-logo.tsx` renders a distinctive, custom SVG logo with the cross/shield motif. It's not a stock icon — it's a real brand mark. This immediately signals more effort than 90% of hackathon projects.

### ✅ Design Token System

The `globals.css` color system using oklch values with semantic naming (`--primary`, `--destructive`, `--muted`, etc.) and proper light/dark mode support is well-architected. This is the right way to build a design system.

### ✅ Consistent Severity Color Coding

Green/amber/red semantic colors are applied consistently across urgency levels in assessments, triage results, badges, and alerts. Users build an intuitive understanding: green = safe, amber = caution, red = urgent. This is especially important for a healthcare app.

### ✅ Assessment Result Page

This is genuinely the visual high point. The information hierarchy is clear — urgency level → key findings → recommendations → actions. The card layout groups related information logically. If the entire app matched this page's quality, you'd be in strong contention.

### ✅ Skeleton Loaders and Empty States Everywhere

Consistent use of skeleton loaders during data fetching and meaningful empty states with CTAs when there's no data. This is a polish detail that most hackathon projects skip entirely. The `EmptyState` component is reusable and well-designed.

### ✅ Emergency Safety Architecture

The client-side red-flag keyword screening that triggers before any API call is smart engineering. It means even if the API is slow or down, life-threatening keyword detection still works. This is the kind of thoughtful safety design that judges appreciate when you explain it.

### ✅ Hospital Map Coordinate-Based Search

The Haversine deduplication and coordinate-based hospital lookup (after the Lagos fix) is solid. The map correctly uses the same coordinate source for centering and searching, which is the right architecture.

### ✅ Summary Cards with Live Data

The `DashboardSummaryCards` component pulling real metrics from Supabase with trend indicators gives the dashboard substance. It's not just placeholder numbers — it's live data that changes as the user interacts with the app.

---

## Verdict

**TriageAI has strong bones.** The design token system, the severity color language, the assessment results page, and the safety architecture are genuinely impressive for a hackathon. The hero section makes a strong first impression.

**But the UX fundamentals let it down.** The broken back button, duplicate navigation, tiny text, and accessibility gaps are the kind of problems that a technically literate judge will notice within 60 seconds of using the app. These aren't polish items — they're structural.

**To reach first place, prioritize in this order:**

1. **Fix routing** — even simple hash-based routing (`#triage`, `#hospitals`, `#profile`) would solve the back button problem
2. **Consolidate navigation** — one nav system, all items present, consistent everywhere
3. **Increase text sizes** — minimum 14px for any visible text, 16px for body content
4. **Add proper form label associations** — `htmlFor`/`id` on every label-input pair
5. **Replace `confirm()` with a styled dialog** — use your existing card/modal patterns
6. **Add page transitions** — even a simple 200ms fade would help
7. **Build a proper footer**
8. **Add a favicon and OG meta**

Items 1-3 would move the composite score from ~58 to ~72. Adding 4-8 would push it toward 80+. The design foundation is strong enough to support that jump — the gap is execution consistency, not vision.

