# TriageAI - System Architecture Specification

## 1. Architecture Overview

TriageAI will be built as a modern full-stack web application using a single Next.js codebase, deployed as an installable mobile-first PWA.

The architecture is designed around:

- A mobile-first frontend experience.
- Server-side AI integration.
- A deterministic safety layer that does not depend on the AI.
- Secure handling of sensitive user information.
- Modular and maintainable code structure.
- Responsible AI usage through safety layers.
- Operation entirely within free service tiers.
- Graceful degradation when the AI service is unavailable.
- Rapid development suitable for a hackathon while maintaining production-quality practices.

The application follows a layered architecture:

```
User Interface Layer
        |
Application Logic Layer
        |
AI and External Services Layer
        |
Data Storage Layer
```

---

# 2. High-Level System Architecture

```
                 User
                  |
          Next.js Frontend (PWA)
                  |
        ---------------------------------
        |                               |
 Client Components                Server Components
 (chat, map, voice,                     |
  PDF generation,                       |
  client-side red-flag check)           |
        |                               |
 Next.js API Routes / Server Actions ---
        |
 Rate Limiter (Upstash)
        |
 Safety Layer (server-side red-flag check, runs first)
        |
 ------------------------------------------------
 |                |                |             |
AI Service     Database       External APIs
 |                |                |
Gemini API     Supabase       Overpass /
               (Postgres,     OpenStreetMap
                Auth,
                Storage)
```

---

# 3. Technology Architecture

## Frontend

Technology:

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Zustand or React Context
- React Hook Form
- Zod validation
- Leaflet (map)
- `browser-image-compression` (image uploads)
- `@react-pdf/renderer` or `jsPDF` + `jspdf-autotable` (PDF export)

Responsibilities:

- User interface rendering.
- User interaction.
- Form handling.
- Chat interface.
- Assessment display.
- Dashboard.
- Profile management.
- Voice input (browser speech recognition).
- Client-side red-flag check for instant emergency display.
- Client-side image compression before upload.
- Client-side PDF generation.
- Responsive design, light and dark modes, accessibility.
- Persistent disclaimer banner and persistent emergency button.

---

## Backend

Technology:

- Next.js Server Actions.
- Next.js API Routes.

Responsibilities:

- Secure AI requests.
- Server-side red-flag enforcement before every AI call.
- Rate limiting.
- Database operations.
- Authentication session handling.
- Hospital search proxying and caching.
- Image validation.
- Server-side validation of all inputs.

The Gemini API key must never be exposed to the browser.

All AI requests must pass through server-side routes.

---

# 4. Application Folder Structure

Recommended structure:

```
src/

app/
│
├── page.tsx
├── dashboard/
├── assessment/
├── history/
├── profile/
├── settings/
│
├── api/
│   ├── ai/
│   │   ├── chat/
│   │   ├── assess/
│   │   ├── image/
│   │   └── medication/
│   ├── assessments/
│   └── hospitals/

components/

├── ui/
├── chat/
├── assessment/
├── emergency/
├── map/
├── dashboard/
├── profile/
└── shared/

features/

├── authentication/
├── triage/
├── safety/
├── hospitals/
├── reports/
└── health-profile/

services/

├── gemini/
├── database/
├── hospitals/
├── pdf/
└── rate-limit/

lib/

├── red-flags/
├── validations/
├── utils/
├── constants/

types/

schemas/

hooks/
```

---

# 5. User Authentication Architecture

Authentication will use:

- Supabase Auth (email/password, optionally Google sign-in).

Supported flows:

- Account creation.
- Login.
- Logout.
- Password recovery.
- Session persistence.

Authentication is optional. Requiring login before someone with urgent symptoms can get help would be poor design.

## Guest Users

Guests can:

- Start symptom assessment immediately.
- Receive AI assessment.
- View results.
- Locate nearby healthcare facilities.

Guest assessment data is held in memory or session storage only. It is never written to the database.

On the results screen, guests are offered "Sign up to save this assessment and export it." If they register, the assessment they just completed is saved to their new account.

---

## Registered Users

Registered users can:

- Save assessments.
- View assessment history.
- Store health profile information.
- Manage emergency contacts.
- Export reports.
- Delete their saved data and account.

---

# 6. AI Architecture

## AI Provider

- Google Gemini API through Google AI Studio (free tier), using the official `@google/genai` SDK or the Vercel AI SDK.
- A free-tier-eligible Flash model must be used. Pro models are not available on the free tier.
- Gemini is the only AI provider. There is no secondary AI fallback.

The AI layer handles:

- Symptom conversations.
- Follow-up questions.
- Structured assessments.
- Image analysis.
- Medication identification.

AI requests must always happen server-side.

## Free-Tier Considerations

- Rate limits apply per project, not per API key, and exact per-model limits must be checked in the AI Studio console before the demo.
- Each follow-up question is a separate AI request, so the 5-8 question cap also protects quota.
- Retry with exponential backoff on rate-limit (429) errors.
- Free-tier requests may be used by the provider to improve its products. The app must tell users not to enter real personal medical details in the prototype, and this must appear in the privacy note.

## Graceful Degradation (when the AI is unavailable or rate-limited)

Because there is no fallback AI provider, the app must fail safely:

- Show a clear, friendly message that the assistant is temporarily busy, with an option to retry.
- Advise the user to seek professional care if they are worried about their symptoms.
- Everything that does not depend on the AI keeps working: the red-flag emergency screen, emergency contacts, the hospital locator, saved history and PDF export of existing assessments.
- Never show a partial or unvalidated assessment.

---

# 7. AI Assessment Flow

The complete assessment pipeline:

```
User submits symptom description (text or voice)

        |

Client-side red-flag check (instant)
+ Server-side red-flag check (enforced before any AI call)

        |

Emergency?
        |
       Yes -----> Emergency screen displayed, assessment stopped
        |
       No

        |

Short one-time disclaimer displayed (single tap to acknowledge)

        |

AI conversation begins

        |

AI asks one follow-up question at a time
(red-flag check runs again on every user answer)

        |

Responses collected

        |

AI generates structured assessment (JSON schema)

        |

Assessment displayed to user

        |

Hospital map offered; save/export offered
```

The API routes are stateless. The client sends the conversation history with each request. Registered users' conversations are persisted to the database on completion.

---

# 8. Emergency Safety Architecture

Safety must not depend only on AI.

A deterministic safety layer runs before Gemini.

Purpose:

- Detect obvious emergency symptoms.
- Prevent AI delays during critical situations.
- Provide immediate emergency guidance.

Examples of red flags:

- Severe chest pain, especially with shortness of breath.
- Difficulty breathing.
- Stroke symptoms.
- Severe bleeding.
- Loss of consciousness.
- Severe allergic reaction / anaphylaxis.
- Suicidal statements.

---

## Red Flag Detector

Implementation:

Rule-based keyword and pattern matching, shared as one module so the browser and server use the same rules.

Example:

Input:

"I can't breathe and my chest hurts."

System:

```
Detect emergency keywords

↓

Trigger emergency state

↓

Skip AI assessment

↓

Show emergency guidance
```

---

The detector should:

- Run on the initial message and on EVERY subsequent user message, because dangerous symptoms may only be revealed during follow-up answers.
- Run client-side for instant display and server-side before every AI call, so it cannot be bypassed.
- Log triggered rule names internally (not the user's message text).
- Avoid unnecessary false positives where possible, while favoring caution.
- Never replace professional emergency evaluation.

The AI is also instructed by its system prompt to escalate to emergency guidance if it detects life-threatening symptoms, as a second layer of protection.

---

# 9. AI Conversation Architecture

The AI should behave like a triage assistant.

It should:

- Collect information gradually.
- Ask one question at a time.
- Avoid overwhelming the user.
- Stop when enough information exists.
- Never diagnose. Use "possible conditions" and "may be consistent with" language.
- Use the health profile only when the user has granted permission.

Maximum:

Approximately 5-8 follow-up questions.

---

## Question Types

Preferred:

- Yes/no buttons.
- Multiple choice.
- Severity slider.
- Short text responses.

Examples:

Severity:

```
Pain level:
1 2 3 4 5 6 7 8 9 10
```

Question:

```
Are you experiencing difficulty breathing?

[Yes] [No]
```

---

# 10. Structured AI Response Architecture

The AI returns structured JSON, enforced through the Gemini structured output (JSON schema) mode and validated with Zod on the server before use.

Example schema:

```json
{
  "possibleConditions": [],
  "severity": "non-urgent | urgent | emergency",
  "severityReasoning": "",
  "firstAidSteps": [],
  "warningSigns": [],
  "recommendedAction": "",
  "disclaimer": ""
}
```

If validation fails, retry once, then show a safe fallback message advising the user to seek professional care.

The frontend renders this into:

- Severity card.
- Condition cards.
- First aid section.
- Warning section.
- Action recommendation.

---

# 11. Database Architecture

Database:

- PostgreSQL through Supabase.

Row Level Security (RLS) must be enabled on every table so each user can only read and write their own rows.

Main entities:

---

## Users

Managed by Supabase Auth.

Fields:

- id
- email
- created_at

---

## Health Profiles

Stores optional user health information.

Fields:

- id
- user_id
- age
- sex
- allergies
- chronic_conditions
- medications
- blood_group
- height
- weight
- allow_ai_use (consent flag)

---

## Assessments

Stores completed assessments for registered users.

Fields:

- id
- user_id
- created_at
- symptoms
- severity
- assessment_result
- disclaimer

---

## Conversations

Stores AI assessment conversations.

Fields:

- id
- assessment_id
- role
- message
- timestamp

Roles:

- User
- AI

---

## Emergency Contacts

Fields:

- id
- user_id
- name
- relationship
- phone_number

---

# 12. Medical Report Architecture

PDF generation happens client-side, which needs no server cost and gives an instant download.

Flow:

```
User requests report

        |

App loads the assessment (from session for guests who sign up,
or from the database for registered users)

        |

PDF generator creates document in the browser

        |

User downloads file
```

Report includes:

- Date and time.
- Symptoms.
- Questions.
- Answers.
- Assessment.
- Severity.
- Recommendations.
- Profile summary (only if the user permits).
- Disclaimer footer (on every report).

Users control whether reports are stored.

---

# 13. Hospital Locator Architecture

Technology:

- Leaflet.
- OpenStreetMap tiles.
- Overpass API (free, no key).
- Browser Geolocation API.

Google Maps and Places APIs are not used, since they require a billing account.

Flow:

```
User grants location permission

        |

Application obtains coordinates

        |

/api/hospitals queries the Overpass API for
amenity=hospital, clinic, doctors within a radius
(results cached briefly)

        |

Distance calculated with the Haversine formula

        |

Display markers and a sorted list on the map
```

Each marker displays:

- Hospital name.
- Location.
- Distance.
- Directions (deep link to Google Maps directions, with the OSRM public server as an optional in-map route).

OpenStreetMap coverage can be patchy in some regions, including parts of Nigeria. A small hand-curated fallback list of facilities near the demo location must be included. If location permission is denied, allow manual location entry.

---

# 14. Voice Input Architecture

Purpose:

Allow users to describe symptoms verbally.

Flow:

```
User speaks

↓

Browser speech recognition (Web Speech API)

↓

Convert speech to text

↓

Text enters normal assessment flow
(including red-flag check)
```

Requirements:

- Speech recognition runs entirely in the browser. It uses no server resources and no AI quota.
- Feature detection, since support is strongest in Chrome and Android and partial in Safari.
- Text input always remains available.
- Failed speech recognition falls back gracefully to typing.
- Optional: read emergency instructions aloud using the browser's speech synthesis.

---

# 15. Image Analysis Architecture

Extended feature.

Flow:

```
User selects image

↓

Client-side validation and compression

↓

Server receives image

↓

Server-side validation (type, size)

↓

Gemini multimodal analysis, combined with the user's description

↓

Educational guidance returned with uncertainty wording
```

Supported examples:

- Rash.
- Burn.
- Cut.
- Swelling.
- Skin discoloration.

Requirements:

- Validate file size.
- Validate file type.
- Compress images client-side to reduce token usage.
- Process images in memory and do not store them by default. If a user explicitly saves one, use a private Supabase Storage bucket.
- Avoid definitive diagnosis.
- Include explicit uncertainty wording and advice on whether professional evaluation is recommended.

---

# 16. Medication Scanner Architecture

Extended feature. It reuses the same upload, validation and vision pipeline as image analysis, with a different prompt and output schema.

Flow:

```
User uploads medication image

↓

Client-side validation and compression

↓

Server-side validation

↓

Gemini image analysis

↓

Medication information returned
```

Output:

- Possible medication name.
- Common purpose.
- Typical uses.
- Safety information.
- Precautions.
- Common side effects.

The AI must express uncertainty when identification is unclear and tell users to verify against the packaging or with a pharmacist or healthcare professional.

---

# 17. Rate Limiting and Security

Required protections:

## API Rate Limiting

Implemented with Upstash Redis (free tier), keyed by user ID or IP address.

Prevent:

- Excessive Gemini requests.
- Abuse.
- Exhausting the free-tier quota during the demo.

Apply limits to:

- AI chat and assessment requests.
- Image and medication uploads.
- Hospital search requests.

Voice input needs no rate limiting, since it runs in the browser.

---

## Data Protection

Requirements:

- Never expose API keys.
- Validate all user input (Zod).
- Validate and sanitize uploaded files.
- Row Level Security on all tables.
- Private storage buckets.
- Use health profile data in AI context only with user permission.
- Use environment variables.
- Use secure authentication.
- Keep the Supabase service role key server-side only.
- Users can delete their saved assessments, profile data and account.
- Deleting an account removes all associated rows and stored files.

---

# 18. Deployment Architecture

Frontend and backend:

Single Next.js application.

Deployment:

- Vercel (free Hobby tier) with GitHub auto-deploy.

Database, auth and storage:

- Supabase (free tier). Free projects pause after inactivity, so open the project shortly before the presentation.

Environment variables:

```
GEMINI_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Secrets must never be committed.

Demo preparation:

- Check the actual Gemini free-tier limits in the AI Studio console before the demo.
- Prepare a cached or pre-recorded demo flow for the image and medication features in case rate limits are hit during the presentation. With no fallback AI provider, this is the main protection for the demo.
- Avoid heavy parallel testing from many devices during the presentation, since all traffic shares one project's quota.
- Test the hospital map at the actual demo location.

---

# 19. Architecture Principles

The application should follow:

- Separation of concerns.
- Reusable components.
- Strong TypeScript typing.
- Server-side security.
- Safety logic that is deterministic and independent of the AI.
- Graceful failure when external services are unavailable.
- Clear feature boundaries.
- Minimal duplication.
- Progressive feature implementation, in this priority order:
  1. Core loop: chat, adaptive follow-ups, structured assessment, red-flag screen.
  2. Hospital map.
  3. Accounts, history, PDF export.
  4. Health profile and emergency contacts.
  5. Image analysis, then medication scanner.
  6. Voice input and UI polish.

The priority is not maximum complexity, but a polished, reliable, and impressive hackathon-quality healthcare application.
