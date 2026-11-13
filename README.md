# Omnicura

> **Autonomous Clinical Emergency Triage & Decision-Support Intelligence**

Omnicura is an intelligent healthcare triage and first-aid platform. It enables patients to evaluate symptom urgency with deterministic client-side safety screening, multimodal vision analysis, medication scanning, and real-time hospital geolocation routing.

> **IMPORTANT MEDICAL DISCLAIMER**: Omnicura provides educational guidance and preliminary urgency classification for general reference only. It does not formulate definitive diagnoses, prescribe medication, or replace evaluation by licensed physicians. In life-threatening emergencies, always dial your local emergency services (112 / 911) immediately.

---

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router) & [React](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theming**: [next-themes](https://github.com/pacocoursey/next-themes) (Light / Dark mode support)
- **Form Handling & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (minimal client state)
- **AI Integration**: [Google Gemini API](https://ai.google.dev/) via `@google/genai` (Server-side only)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **Rate Limiting**: [Upstash Redis](https://upstash.com/) (Free-tier protection)

---

## Project Structure

The project follows a modular, feature-oriented architecture:

```text
src/
├── app/                  # Next.js App Router pages and API routes
├── components/           # Reusable UI components
│   ├── ui/               # shadcn/ui primitives (Button, Card, Input, Alert, Dialog, etc.)
│   ├── chat/             # Chat interface components
│   ├── assessment/       # Assessment result presentation components
│   ├── emergency/        # Emergency guidance & red-flag screens
│   ├── map/              # Facility locator components
│   ├── dashboard/        # Registered user dashboard components
│   ├── profile/          # Health profile management
│   └── shared/           # Cross-cutting UI components (ThemeToggle, header, footer)
├── features/             # Business domain feature modules
│   ├── triage/           # Core symptom assessment & questioning logic
│   ├── safety/           # Rule-based red-flag detection system
│   ├── authentication/   # Supabase auth hooks & flows
│   ├── hospitals/        # Nearby facility search
│   ├── reports/          # Client-side PDF export
│   └── health-profile/   # User health metrics & consent management
├── services/             # External service wrappers & clients
│   ├── gemini/           # Gemini API client & structured prompts
│   ├── database/         # Supabase client & data access layer
│   ├── hospitals/        # Overpass/OSM hospital search
│   ├── pdf/              # Report generation utilities
│   └── rate-limit/       # Upstash Redis rate limiting
├── lib/                  # Shared utilities & configurations
│   ├── constants/        # Application-wide constants & disclaimers
│   ├── red-flags/        # Deterministic emergency patterns & keyword rules
│   ├── utils.ts          # Tailwind cn utility
│   └── validations/      # Shared validation helpers
├── types/                # TypeScript type definitions
├── schemas/              # Zod validation schemas
└── hooks/                # Custom React hooks
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [npm](https://www.npmjs.com/) (v10+)
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/creventor-1/Triage-AI.git
   cd Triage-AI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Populate the required credentials in `.env.local` (see below).

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Refer to `.env.example` for the complete list:

| Variable | Description | Exposure |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key | Server only |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public client/server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key | Public client/server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Server only |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Server only |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token | Server only |

> **Security Rule**: API keys must never be exposed to the browser. All Gemini AI calls are made strictly through server-side routes.

---

## Development Status

- [x] **Phase 1: Project Foundation** — Next.js, TypeScript strict mode, Tailwind CSS v4, shadcn/ui components, light/dark mode theme system, architecture scaffolding, `.env.example`, and Git repository setup.
- [x] **Phase 2: Core AI Triage Experience** — Deterministic red-flag emergency screening (client & server), one-time disclaimer system, persistent emergency SOS button (112), adaptive symptom questioning with interactive quick options, Gemini Flash structured assessment pipeline (Zod-validated), and comprehensive result display.
- [x] **Phase 3: User Accounts & Health Data** — Optional guest flow with seamless conversion, Supabase Auth integration, health profiles with AI consent toggle, assessment history viewer, and emergency contacts manager with Row Level Security.
- [x] **Phase 4: Healthcare Utilities** — Interactive Healthcare Facility Locator (Leaflet & OpenStreetMap with automatic geolocation and curated Lagos fallback) and client-side Medical Report PDF Export.
- [ ] **Phase 5: Product Polish** — UI enhancements, animations, mobile responsiveness, and hackathon demo flows.
- [ ] **Phase 5: Product Polish** — UI enhancements, mobile responsiveness, and branding.
- [ ] **Phase 6: Extended Features** — Voice input, multimodal image analysis, and medication scanner.
