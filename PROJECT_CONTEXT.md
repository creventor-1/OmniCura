# OmniCura: project context and handoff

> **For AI agents and new contributors: read this first.** It describes what exists,
> how the pieces connect, how to run and verify them, and which documents must be kept.
> Last updated **14 Nov 2026**, at commit `66a3d0f` on `main` (pushed to GitHub).
> If you change architecture, endpoints, env vars or operations, update this file too.

---

## 1. TL;DR

**OmniCura** (repo folder `TriageAI`) is a Next.js healthcare triage app built for a
privacy hackathon:

- AI symptom triage with deterministic red-flag screening, plus image, medication,
  hospital and PDF tools.
- **Tamper-evident records and consent history on the Zcash testnet.** Each assessment's
  SHA-256 fingerprint, and every consent change (share, request, approve, deny, grant,
  revoke, restore), is written into the encrypted memo of a shielded self-transfer from a
  notary wallet. No health data goes on-chain.
- **Patient-controlled sharing with clinicians** through a QR code or link that works
  across devices. The patient approves, denies or revokes; the clinician's view unlocks
  or locks live.
- **In-app proof:** an explorer link (the transaction exists, and in which block), a
  tamper check (the record still matches its fingerprint), and a memo check (the
  transaction's decrypted memo carries that fingerprint).

**Where it runs today**

| Piece | Where |
|---|---|
| Web app (production) | Vercel project `creventor/triage-ai`. Aliases: `omnicura-ai.vercel.app` (primary), `omnicura-app.vercel.app`, `omnicura-health.vercel.app`, `triage-ai-flame.vercel.app` |
| Source | GitHub `creventor-1/OmniCura`, branch `main` |
| Database and auth | Supabase (URL and keys in env) |
| Zcash notary | Docker container `omnicura-notary-notary-1` **on the owner's Windows PC** |
| Notary's public URL | Cloudflare quick tunnel, container `omnicura-notary-tunnel-1`. **The URL changes on every restart** |
| Chain | Zcash **testnet**, via lightwalletd `testnet.zec.rocks:443`, reached over the Nym mixnet |

**Vercel is NOT connected to GitHub.** Pushing does not deploy. Production is deployed
from this folder with the Vercel CLI (`npx vercel deploy --prod --yes`, or
`npm run notary:vercel`). The current production deployment was built from the same
files as commit `66a3d0f`.

---

## 2. Ground rules for agents (read before changing anything)

1. **Do not delete or rename documents** listed under "Keep" in §6. Several look like
   duplicates; leave them unless the owner explicitly asks.
2. **Secrets never get printed, committed or pasted into chat.** `.env.local` and
   `.env.notary` are git-ignored (`.env*` in `.gitignore`).
   - `.env.notary` holds the wallet **seed phrase**.
   - `.env.local` holds the notary token, a Gemini key, Supabase keys and a legacy
     private key.
   - When checking values, print names, lengths or masks only.
   - Before committing, scan the diff for actual secret values; this was done for every
     commit so far.
3. **Next.js 16 differs from your training data.** AGENTS.md (auto-managed block) says to
   read `node_modules/next/dist/docs/` before writing Next code. Config has
   `cacheComponents: true` and `partialPrefetching: true`.
4. **Commit, push and production deploys only when the owner asks.** The owner works
   directly on `main` and has asked for pushes to `origin/main` before; ask again each
   time.
5. **Anchors cost real testnet funds.** Each anchor pays a 10,000-zat (0.0001 TAZ) fee;
   the 1,000-zat self-output returns to the wallet. Balance is about 0.197 TAZ; see the
   notary card on Data Ownership. Don't loop anchors in tests.
6. **Never run `zingo-cli` against the live wallet (`/data`) while the notary runs.** The
   notary serializes all zingo-cli calls through a queue. For manual commands, copy the
   wallet file and unset the seed variable; see §11.
7. **Windows quirks.**
   - Shell tools are Git Bash and PowerShell 5.1.
   - In Git Bash, prefix `docker exec` commands that contain paths with
     `MSYS_NO_PATHCONV=1`.
   - Inside the notary container, `ZINGO_SEED` is set in the environment. Use
     `env -u ZINGO_SEED zingo-cli …`, or zingo-cli tries to restore from seed and asks
     for a birthday.
8. **Be honest about verification.** Never fabricate txids, block heights or "verified"
   states. The code is built so that every on-chain state comes from the chain.

---

## 3. Tech stack

- **Next.js 16.4.6** (App Router, Turbopack), **React 19.3**, TypeScript (strict),
  **Tailwind CSS v4**.
- UI: shadcn-style components on `@base-ui/react`. The `cn` helper comes from the `cn`
  package. Icons from `lucide-react`. Themes from `next-themes`.
- **Gemini** through `@google/genai`. Flash model fallback list in
  `src/services/gemini/client.ts`.
- **Supabase**: auth plus Postgres with RLS (`@supabase/ssr`, `@supabase/supabase-js`).
- Maps: Leaflet + OpenStreetMap / Overpass. PDF: `jspdf` + `jspdf-autotable`. QR codes:
  `qrcode`. Validation: `zod` v4. State: `zustand` in places, plus localStorage.
- **Zcash**: `zingo-cli` (zingolib), built in Docker, with `nym-proxy` for mixnet
  transport. Chain status from SoChain v3 (`ZECTEST`).
- Deploys: Vercel CLI (`vercel` is a devDependency). Tunnel: `cloudflare/cloudflared`
  image.
- Lint rule worth knowing: React 19's `react-hooks/set-state-in-effect`. Calling
  something that sets state synchronously inside `useEffect` fails lint. The access page
  wraps its initial load in `setTimeout` for this reason.

---

## 4. Repository map (what lives where)

```
src/app/
  page.tsx                     Single-page app; views switch by hash (#home, #triage, #history, #ownership, …)
  access/[token]/page.tsx      Clinician page for a share link/QR (request → wait → report / revoked)
  api/ai/{triage,image,medication}/route.ts   Gemini endpoints
  api/hospitals/route.ts       Nearby facilities (Overpass, with fallback data)
  api/records/anchor/route.ts  Zcash anchoring: POST start, GET ?hash= progress, GET ?txid= chain status, GET ?memo=&hash= memo check
  api/zcash/status/route.ts    Notary/wallet status for the UI card
  api/records/verify/route.ts  Integrity check API (NOT called by the UI; kept for API demos)
  api/records/permissions/route.ts  Grant/revoke hash API (NOT called by the UI; kept for API demos)
src/components/
  dashboard/dashboard-view.tsx   Switches views; shell/nav-config.ts lists the nav items
  sharing/share-with-doctor-modal.tsx, qr-display.tsx   Patient's share/manage-access dialog
  ownership/patient-ownership-panel.tsx   Data Ownership page (grants, pending requests, notary card, audit trail)
  ownership/audit-timeline.tsx   Audit trail; per-event AnchorChip + "Verify memo"
  ownership/zcash-notary-card.tsx   Notary status/balance card
  verification/verification-badge.tsx   Record badge + "View Proof" panel (fingerprint, tx, memo check)
  verification/anchor-chip.tsx   "Block #N · tx:…" chip (live chain status)
  verification/memo-check.tsx    Memo decryption check UI (full + compact)
  ui/dialog.tsx                  Base dialog (has grid-cols-[minmax(0,1fr)] so long content can't widen it)
src/features/
  triage/components/symptom-chat.tsx   Chat → assessment → save → anchor (runAnchor, resume)
  triage/components/assessment-history-view.tsx   History list/details; resumes interrupted record anchors
  authentication/, health-profile/, safety/, vision/, dashboard/
src/services/
  crypto/record-hasher.ts      Canonical JSON + SHA-256 for assessments and consent events
  zcash/anchor.ts              Server: memo format, start/poll anchoring, memo check, chain status
  zcash/notary-client.ts       Server: HTTP client for the notary (Bearer token). Never import client-side
  zcash/anchor-client.ts       Browser: start + poll anchors, memo check, useAnchorStatus, local record updates
  zcash/chain.ts, status.ts, config.ts   SoChain lookups, notary status, env config
  zcash/wallet.ts              LEGACY transparent-address key utils (unused by the app)
  ownership/ownership-service.ts   Grants, audit events, share invitations, consent anchoring, resume logic (localStorage)
  sharing/share-relay.ts       Browser: Supabase RPC client for cross-device share invitations
  database/supabase/{client,server}.ts, gemini/*, hospitals/*, pdf/*
scripts/
  zcash-notary-sidecar.mjs     THE NOTARY: HTTP service wrapping zingo-cli (runs in Docker)
  vercel-notary-env.mjs        npm run notary:vercel: tunnel URL + token → Vercel env, then prod deploy
  test-local-verification.mjs  Hashing tests (node scripts/test-local-verification.mjs: passes)
  test-zcash-attestation.mjs, verify-red-flags.ts   Need a TS loader (see §13)
  generate-notary-wallet.mjs   LEGACY transparent keypair generator (unused)
notary/  Dockerfile (+ .dockerignore), docker-compose.yml (services: notary, tunnel [profile "tunnel"])
supabase/  schema.sql (base schema) + migrations/20261114_zcash_anchoring.sql, 20261115_share_invitations.sql
.claude/launch.json   Dev-server config "omnicura-dev" (npm run dev, port 3000) used by the preview tooling
.vercel/project.json  Links this folder to the Vercel project (keep)
```

---

## 5. Architecture

```
 Patient browser (localStorage: records, grants, audit events, invitations)
   │  fetch /api/*                         │ supabase.rpc(share_invite_*)  (anon key)
   ▼                                       ▼
 Next.js on Vercel ───────────────► Supabase Postgres (auth, assessments, profiles,
   │  Bearer ZCASH_NOTARY_SIDECAR_TOKEN     contacts, share_invitations via RPC only)
   ▼
 Cloudflare quick tunnel  https://<random>.trycloudflare.com   (HTTP/2)
   ▼
 Notary sidecar (Docker, owner's PC, port 8737 bound to 127.0.0.1)
   │  queue → zingo-cli --nym-proxy …
   ▼
 Nym mixnet → lightwalletd testnet.zec.rocks:443 → Zcash testnet
 Chain status for the UI: Next.js → SoChain API (public)
```

Locally, `npm run dev` talks to the notary directly at `http://127.0.0.1:8737`
(`.env.local`). In production, Vercel uses the tunnel URL from its env.

---

## 6. Document map: what to keep and what's current

**Keep all of these.** None is safe to delete without the owner's say-so.

| File | Status | Purpose |
|---|---|---|
| `PROJECT_CONTEXT.md` | **Current: start here** | This handoff |
| `AGENTS.md` | Current | Auto-managed Next.js rules block (`next dev` rewrites only that block) plus a pointer here |
| `ZCASH_NOTARY_SETUP.md` | **Current, canonical ops doc** | Notary setup, Docker, funding, split, DB migrations, memo proof, Vercel hosting, troubleshooting |
| `OMNICURA_EXPLANATION.txt` | Current, judge-facing | Product and architecture write-up; §6 lists the first 8 real transactions |
| `README.md` | Partly outdated | Overview and setup. Its "Development Status" list is stale (phases 5–6 unchecked though done) and it doesn't cover Zcash or sharing. Update rather than replace |
| `PROJECT_SPEC.md` = `Project Specification.md` | Historical spec | Byte-identical copies: the original TriageAI spec |
| `ARCHITECTURE.md` = `TriageAI-Architecture-Specification.md` | Historical spec | Byte-identical copies: original architecture plan |
| `DEVELOPMENT_RULES.md` = `TriageAI - Development Rules and Coding Standards.md` | Still relevant | Byte-identical copies: coding standards |
| `ROADMAP.md` = `TriageAI - Development Roadmap.md` | Historical | Byte-identical copies: original phase plan |
| `UI-REDESIGN.md`, `OmniCura Redisign.md`, `Production-Grade UIUX Redesign.md`, `ui-ux-review.md` | Historical design briefs | Inputs to the UI redesign (`eb8a56e` and earlier) |
| `.env.example`, `.env.notary.example` | Current | Env templates (no secrets). Keep in sync when adding vars |
| `supabase/schema.sql`, `supabase/migrations/*.sql` | Current | DB schema. Migrations must be **run manually** in the Supabase SQL editor; all are idempotent |
| `notary/*`, `scripts/*` | Current | See §4 |

---

## 7. Feature areas in detail

### 7.1 Triage (core product)
- **Red flags** (`src/lib/red-flags/*`) run deterministically on the device before any
  AI call; emergencies trigger the SOS UI (112).
- **Chat** (`symptom-chat.tsx`) asks follow-ups through `/api/ai/triage` and ends with a
  structured assessment (zod schema in `src/schemas/triage.ts`).
- **Guests:** records go to localStorage `omnicura_guest_assessments`.
- **Signed-in users:** records go to the Supabase `assessments` table.
- Results view, PDF export, history, hospital map, image symptom analysis and medication
  scanner all exist and work.

### 7.2 Fingerprints (`src/services/crypto/record-hasher.ts`)
- **Assessment:** SHA-256 of canonical JSON (keys sorted) with these fields:
  - `patientId` (`"guest"` for guests; the user id for signed-in users)
  - `symptoms`, `severity`, `recommendedAction`, `possibleConditions`, `firstAidSteps`,
    `warningSigns`
  - `timestamp` (ISO)
  - `schemaVersion: "omnicura-v1"`
- **Consent event:** SHA-256 of canonical JSON with `recordId`, `userId`,
  `granteeEntity` (trimmed), `accessLevel`, `action`, `timestamp` (ISO) and
  `schemaVersion: "omnicura-ownership-v1"`.
- **The server recomputes every hash** in `/api/records/anchor`; client-sent hashes are
  never trusted.

### 7.3 Zcash anchoring (asynchronous)

**Memo format:** `omnicura:v1:<assessment|consent>:<sha256>:<ISO timestamp>`, at most
512 bytes. The sidecar validates it against `MEMO_RE`.

**Flow:**
1. The browser calls `requestAnchor` / `requestConsentAnchor`
   (`anchor-client.ts` → `anchorAndWait`).
2. `POST /api/records/anchor` recomputes the hash.
3. `startAnchorTransaction` calls the notary's `POST /anchor` with `{wait:false}`, which
   answers **202 "sending"** at once. An already-anchored hash returns its txid
   immediately.
4. The browser polls `GET /api/records/anchor?hash=<hash>` every 8 seconds, until the
   status is `pending` (txid known, awaiting confirmations) or `failed`.

**Why asynchronous:** a send takes 1.5–5 minutes over the mixnet. Vercel functions stop
after about 5 minutes, and Cloudflare tunnels cut a request after 100 seconds.

**Idempotent:** the notary de-duplicates by hash, using its ledger and an in-flight map.
Retries and resumes never pay twice.

**Resilience** (commit `66a3d0f`):
- A non-JSON or gateway error from the tunnel counts as a temporary
  `sidecar_unreachable`, not as a failed send.
- Starting an anchor retries with backoff for about 1.5 minutes.
- Polling tolerates about 5 minutes without contact and waits up to 25 minutes, because
  the notary sends one transaction at a time and the queue can back up.

**Resume:**
- Consent events in the `requested` or `failed` state that have a saved `anchorPayload`
  are re-sent when Data Ownership mounts (`resumePendingConsentAnchors`).
- Local records with `verification_status: "pending"` and no `zcash_txid` are resumed
  from History and Data Ownership (`resumePendingRecordAnchors`). It **asks the notary by
  hash first** (no second payment), and stores a txid only when the returned fingerprint
  matches the record's.
- The chat also resumes an anchor in state `requested` or `failed` after a reload.

**UI states:** "Anchoring on Zcash…", then "In mempool / Broadcast", then
"Block #N · tx:…". "Anchor failed" carries a reason, and "Not anchored" means no notary
is configured. Report views are hashed and logged but deliberately **not** anchored.

**Memo check** (commit `bf266e0`):
1. The notary indexes the memos its wallet decrypts from its own transactions
   (`zingo-cli --nosync messages`) and serves them at `GET /memo/:txid`.
2. `GET /api/records/anchor?memo=<txid>&hash=<expected>` returns `match`, `mismatch`,
   `indexing`, `not_found` or `unavailable`.
3. The UI shows it in **View Proof** ("Check the memo inside this transaction") and as
   **Verify memo** under each audit event. For consent events, the expected hash is
   recomputed from the saved payload.
4. The first lookup after the notary starts takes about a minute while the index builds.

### 7.4 Data ownership and consent (`ownership-service.ts`, localStorage)
- Grants, audit events and invitations are stored **per browser** in localStorage
  (keys in §9). Note: the Supabase table `record_access_grants` exists but is **unused**
  by the app.
- **Anchored actions:** `share_invite`, `request`, `approve`, `deny`, `revoke`, `grant`
  (direct grants and restores). Each anchor updates its audit event, and the related
  grant, with the real txid.
- Revoking a grant from Data Ownership also invalidates the share link behind it (fixed
  in `81cf909`).
- **Same-browser sync:** `BroadcastChannel("omnicura_sharing_sync")` plus a localStorage
  `storage` event.

### 7.5 Cross-device sharing (commit `81cf909`)

**Problem it fixed:** invitations used to live only in the patient's localStorage, so a
QR code scanned on a phone showed "Invalid or Expired Invitation".

**Relay:** Supabase table `public.share_invitations`.
- RLS is on with **no policies** and table grants are revoked, so the table is reachable
  only through SECURITY DEFINER RPC functions (§8.3).
- The browser calls them directly with the anon key (`share-relay.ts`), and falls back
  to the local-only flow if Supabase or the migration is missing.

**Security model:**
- Tokens are `inv_` + 128-bit random (base64url).
- The patient's browser holds a random **owner key**; only its SHA-256 hash is stored.
  Approve, deny and revoke require that key.
- A clinician can only move an invitation from `pending_request` to `awaiting_approval`,
  and only once.
- **No clinical snapshot is stored until approval.** It's uploaded at approval time and
  set to NULL on deny or revoke.
- "Emergency Only" approval uploads a reduced snapshot (`snapshotForAccessLevel`): red
  flags, care pathway, severity and safety-critical profile. No reasoning, differential
  or first aid.
- Unclaimed invitations expire after 7 days.

**Flow:**
1. The patient opens Share with Doctor. The invite is created and registered, and the
   modal shows "Ready to scan on any phone or computer". On localhost it warns that
   phones can't open localhost links.
2. The clinician opens `/access/<token>`, which reads the server copy first, then falls
   back to the local copy, and submits a request.
3. The patient's open modal and the Data Ownership page poll the relay (every 4–5 s),
   then log and anchor the request using the **server's timestamp**, so both devices
   compute the same hash.
4. The patient approves. The decision is queued (`relayPending`) and pushed with the
   owner key; failed pushes are retried on the next sync.
5. The clinician's page polls (every 3 s while waiting, every 10 s while approved) and
   unlocks. The first view is reported back with `share_invite_mark_viewed`.
6. A revoke shows on the clinician's page within about 10 seconds.

**Layout fix:** a long deployed URL widened the dialog's grid track, causing sideways
scrolling and a clipped left edge on phones. Fixed in `ui/dialog.tsx` with
`grid-cols-[minmax(0,1fr)]`, plus `min-w-0` on the URL box.

**Dev setting:** `next.config.ts` has
`allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*"]`, so phones on the LAN and
127.0.0.1 can load dev scripts. Testing tip: two hostnames for the same site
(localhost vs 127.0.0.1, or two Vercel aliases) have separate localStorage, which
simulates two devices.

---

## 8. API reference

### 8.1 Next.js routes
| Route | Purpose |
|---|---|
| `POST /api/records/anchor` | Body `{record:{user_id?,symptoms,created_at,assessment_result}}` or `{consentEvent:{recordId,userId,granteeEntity,accessLevel,action,timestamp}}`. Returns `{status: pending\|sending\|unanchored\|failed, recordHash, txid?, explorerUrl?, reason?, message?}`. Rate-limited in memory: 6 per minute per IP, 60 per hour overall, per instance |
| `GET /api/records/anchor?hash=<64hex>` | Progress of a send (same shape), or `{status:"not_found"}` |
| `GET /api/records/anchor?txid=<64hex>` | Chain status from SoChain: `confirmed\|pending\|not_found\|unknown`, confirmations, blockHeight, blockTime |
| `GET /api/records/anchor?memo=<txid>&hash=<64hex>` | Memo check (see §7.3) |
| `GET /api/zcash/status` | Config plus wallet state: `not_configured\|offline\|wallet_not_ready\|needs_funds\|confirming\|ready\|unknown_balance`, balances |
| `/api/ai/triage`, `/api/ai/image`, `/api/ai/medication` | Gemini |
| `GET /api/hospitals?lat=&lon=` | Facilities |
| `/api/records/verify`, `/api/records/permissions` | Not used by the UI |

### 8.2 Notary sidecar (`scripts/zcash-notary-sidecar.mjs`)
Every endpoint except `/health` needs `Authorization: Bearer <ZCASH_NOTARY_SIDECAR_TOKEN>`.

| Endpoint | Purpose |
|---|---|
| `GET /health` | `{ok, ready, chain, notaryAddress, ownsNotaryAddress, reason}` |
| `GET /status` | Cached balance (`spendableZats`, `pendingZats`), height, `anchorsSent` |
| `POST /anchor` `{recordHash, memo, wait?}` | `wait:false` returns 202 `{status:"sending"}`. A known hash returns 200 `{txid}` |
| `GET /anchor/hash/:hash` | `sent` (txid) / 202 `sending` / `failed` / 404 |
| `GET /anchor/:txid` | Ledger entry (the notary's own record of what it sent) |
| `GET /memo/:txid` | Memo decrypted by the wallet: 200 `found` / 202 `indexing` / 404 |
| `POST /split` `{notes}` | Splits the balance into N notes so several anchors can go out back to back |

The ledger is at `/data/omnicura-anchors.jsonl` inside the `notary-wallet` Docker volume,
next to the wallet file `/data/zingo-wallet.dat`.

### 8.3 Supabase RPC functions (`supabase/migrations/20261115_share_invitations.sql`)
| Function | Caller | Rule |
|---|---|---|
| `share_invite_create(p_token, p_owner_key, p_record_id, p_patient_name)` | Patient | Idempotent for the same token and key. A different key for an existing token is rejected |
| `share_invite_get(p_token)` | Anyone with the link | NULL if unknown or expired. Snapshot only while approved |
| `share_invite_request(p_token, p_requester_name, p_requester_facility, p_requester_role)` | Clinician | Only from `pending_request`, once. Server sets `requested_at` |
| `share_invite_owner_update(p_token, p_owner_key, p_status, p_access_level, p_snapshot)` | Patient | `approved` (needs a snapshot), `denied`, `revoked` (clears the snapshot) |
| `share_invite_mark_viewed(p_token)` | Clinician | Sets the first `viewed_at` |

Helpers `share_invite_json` and `share_invite_key_hash` are revoked from `anon` and
`authenticated`. These were probed against the live database: the table can't be listed,
a wrong owner key is rejected, and an existing token can't be hijacked.

---

## 9. Data storage

**Supabase tables:**
- Used: `assessments` (with anchoring columns `record_hash`, `verification_status`,
  `zcash_txid`, `zcash_block_height`, `verified_at`), `health_profiles`,
  `emergency_contacts`, `share_invitations` (RPC only).
- Unused: `record_access_grants`.
- Both migrations have been run on the owner's Supabase project.

**localStorage keys (browser):**

| Key | Contents |
|---|---|
| `omnicura_guest_assessments` | Guest records (with `record_hash`, `verification_status`, `zcash_txid`) |
| `omnicura_ownership_audit_events` | Audit events (`eventHash`, `zcashTxid`, `anchorState`, `anchorPayload`) |
| `omnicura_access_grants` | Grants |
| `omnicura_share_invitations` | Invitations (`ownerKey`, `relay`, `relayPending`, snapshot) |
| `omnicura_sharing_sync_event` | Cross-tab sync ping |
| `omnicura_active_chat_session`, `omnicura_triage_draft` | Chat state |
| `omnicura_active_profile` | Profile context |
| `omnicura_cached_hospitals`, `omnicura_cached_coords` | Map cache |
| `omnicura_sidebar_collapsed` | UI preference |

---

## 10. Environment variables (names only, never values)

**`.env.local`** (Next.js app; compose also reads it, but passes only the listed
`ZCASH_*` variables and the token into the notary container):
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER`
- `ZCASH_NETWORK` (testnet), `ZCASH_LIGHTWALLETD_URL`, `ZCASH_NOTARY_ADDRESS`
- `ZCASH_NOTARY_SIDECAR_URL` (local: `http://127.0.0.1:8737`)
- `ZCASH_NOTARY_SIDECAR_TOKEN` (64 hex characters)
- Legacy and unused: `ZCASH_NOTARY_PRIVATE_KEY`, `ZCASH_NOTARY_TRANSPARENT_FALLBACK`.
  Don't delete them without asking.

**`.env.notary`** (notary only): `ZINGO_SEED` (only needed for the first restore),
`ZCASH_NOTARY_BIRTHDAY`, plus optional `ZINGO_CLI_PATH` / `ZINGO_DATA_DIR` for non-Docker
runs, and `ZCASH_ANCHOR_AMOUNT_ZATS` (default 1000).

**Vercel Production env:**
- `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER`
- `ZCASH_NETWORK`, `ZCASH_LIGHTWALLETD_URL`, `ZCASH_NOTARY_ADDRESS`,
  `ZCASH_NOTARY_TRANSPARENT_FALLBACK`
- **`ZCASH_NOTARY_SIDECAR_URL`** (the current tunnel URL) and
  **`ZCASH_NOTARY_SIDECAR_TOKEN`** (Secret)
- Env changes take effect only after a new deployment.

The notary address is public:
`utest19d569wa8aaggfuvmvuf26808wdhvx74c7ava3ggxqxzd43hsm4ter3zltvumx463wq5rwy4jnd89klc0pgv7rp2u8498wmanhyhc5m79`.
The wallet's birthday height is 4,611,710.

---

## 11. Operations runbook

```bash
npm run dev               # local app on :3000 (preview tooling: .claude/launch.json "omnicura-dev")
npm run notary:docker     # build + start the notary (keeps the wallet volume; rebuild is quick)
npm run notary:logs       # follow notary logs
npm run notary:tunnel     # start the Cloudflare tunnel (opt-in compose profile)
npm run notary:vercel     # tunnel URL + token → Vercel Production env, then deploy production
npm run notary:stop       # stop notary + tunnel
```

**After a reboot, or if the site says "Zcash notary service is offline":**
1. Start Docker Desktop. It's installed per user at
   `%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe`, and it doesn't start
   automatically.
2. Both containers restart on their own (`restart: unless-stopped`). Opening the wallet
   can take a few minutes.
3. The tunnel URL changed, so run `npm run notary:vercel` (the owner runs it, because it
   handles the token). If only the URL needs updating, the non-secret steps are:
   ```bash
   U=$(docker logs omnicura-notary-tunnel-1 2>&1 | grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" | tail -1)
   printf '%s' "$U" | npx vercel env add ZCASH_NOTARY_SIDECAR_URL --environment production --force --no-sensitive --yes
   npx vercel deploy --prod --yes
   ```

**Health checks:**
- `curl https://omnicura-ai.vercel.app/api/zcash/status` should show `"state":"ready"`.
- `docker logs` lines from before a container restart are still shown. Filter with
  `--since "$(docker inspect -f '{{.State.StartedAt}}' omnicura-notary-notary-1)"`.

**Split notes before a demo:** `POST /split {"notes":8}` (curl command in
ZCASH_NOTARY_SETUP.md). Change from a send isn't spendable until it confirms.

**Manual zingo-cli** (safe: works on a copy, without the seed), for example exporting the
viewing key:
```bash
MSYS_NO_PATHCONV=1 docker exec omnicura-notary-notary-1 sh -c 'rm -rf /tmp/v && mkdir /tmp/v && cp /data/zingo-wallet.dat /tmp/v/ && env -u ZINGO_SEED zingo-cli --chain testnet --data-dir /tmp/v --server https://testnet.zec.rocks:443 --nym-proxy /usr/local/bin/nym-proxy --nosync export_ufvk; rm -rf /tmp/v'
```
Replace `export_ufvk` with `messages` to list decrypted memos. A verifier with the
viewing key can run
`zingo-cli --chain testnet --server https://testnet.zec.rocks:443 --viewkey <UFVK> --birthday 4611710 --data-dir ./viewer`.

---

## 12. History of recent work (newest first)

| Commit | What |
|---|---|
| `66a3d0f` | Survive tunnel hiccups (transient vs failed), longer retries and polling, HTTP/2 tunnel, resume interrupted record anchors, History refresh, single "record anchored" event |
| `bf266e0` | Async anchoring (start + poll), Cloudflare tunnel service, `notary:tunnel` / `notary:vercel`, memo index + memo check UI, docs |
| `81cf909` | Cross-device share invitations (Supabase relay + RPC security model), Emergency-Only snapshot scoping, revoke-by-grant fix, 128-bit tokens, dialog overflow fix, `allowedDevOrigins` |
| `189a57c` | (Owner) test suite updated for the notary interface |
| `1f91723` | Zcash anchoring: notary sidecar + Docker, server-side hashing for assessments and consent, live chain status, removed fake demo data and txids, resume of interrupted consent anchors, fix for an access-page view loop, migration, evidence |
| `eb8a56e` | Production-grade "Clinical Calm" UI redesign across all views |
| earlier | Phases 1–6: foundation, triage, accounts, utilities, polish, vision and medication |

---

## 13. Verification status and evidence

- `npx tsc --noEmit`, `npx eslint` (whole repo) and `npx next build`: all passing at
  `66a3d0f`.
- `node scripts/test-local-verification.mjs` passes. `scripts/test-zcash-attestation.mjs`
  and `scripts/verify-red-flags.ts` **fail under plain Node 24**, because `src/` uses
  extensionless and directory imports; they need a TypeScript loader. This predates the
  recent work and is unfixed.
- A full live test on production passed in two separate browsers (14 Nov):
  assessment → anchor → share QR → request from the "other device" → approve → report
  unlocks → memo check on both sides → revoke → clinician locked out.

**Real testnet transactions** (verify at `https://sochain.com/tx/ZECTEST/<txid>`):

| Block | What | txid |
|---|---|---|
| 4618838–4618951 | First 8 (assessments, grant, split, share, approve, request, revoke) | listed in `OMNICURA_EXPLANATION.txt` §6 |
| 4619185 | Local cross-device test: revoke | `aa2a840ac98b7a1b8fba9cfa9c34799cd964d99529e0c77aef70fad1be456805` |
| 4619232 | Live site: grant to Memorial Urgent Care ER | `edb9710f347601f8361f8cd2196bba7d55541ab33a1251154c8255b78e886762` |
| 4619664 | Live: assessment | `76c0e197bd770bde742b9d186c6a3b854671e30179cfbbe8cf17c15512c7789e` |
| 4619693 | Live: share invite | `89bafc450b8024e1560697e5b4eaffe6a622b4f2b5a2ba3f0808459bc8e811e1` |
| 4619695 | Live: clinician request (from the second device) | `288ff1934e348282cc0e2e436516781a71de83e7afedd3dffe19a5f076b1efbc` |
| 4619697 | Live: approval | `b2e5cb832c7683936c0b028f0ee770a49a212b342faea4dced328bba76104dee` |
| 4619699 | Live: revoke | `a7c75b872a334478dbf550338ed6f41c513231d63b3c94c7667aa542ad8d47a6` |

---

## 14. Known limitations, gotchas, open items

- **No patient signatures.** The chain proves *when* a decision was recorded and that it
  hasn't changed, not that the patient personally made it; the notary sends everything.
  The planned fix is per-user passkeys (WebAuthn) that sign each consent event.
- **Consent hashes aren't salted.** Their fields are guessable, so anyone holding the
  viewing key could brute-force them. Add a random salt per event.
- **Proofs need the shared viewing key**, which reveals all notary memos (hashes and
  times). A per-event "proof bundle" download was proposed but not built. The full event
  payload exists only in the patient's browser (`anchorPayload`).
- **Ownership data is per browser** (localStorage); only share invitations are relayed.
  The signed-in Supabase path for anchoring is **untested end to end**.
- **Infrastructure:**
  - The notary runs on the owner's PC through a quick tunnel whose URL changes on
    restart; Docker Desktop doesn't auto-start.
  - Sends are serialized at 1.5–5 minutes each, so concurrent users queue. Batching with
    a Merkle root is the scaling plan.
  - The in-memory rate limit is per Vercel instance.
- **Leftover test data:** one orphaned invite in Supabase, stuck in `awaiting_approval`
  from a test whose browser storage was wiped. It holds no clinical data.
- **Legacy and unused, but don't delete without asking:** `src/services/zcash/wallet.ts`,
  `scripts/generate-notary-wallet.mjs`, the env vars `ZCASH_NOTARY_PRIVATE_KEY` and
  `ZCASH_NOTARY_TRANSPARENT_FALLBACK`, the Upstash vars in `.env.example`,
  `/api/records/verify`, `/api/records/permissions`.
- **README is stale** (status list, no Zcash or sharing sections). Candidate update.
- Production ideas, discussed with the owner but not started: passkey signing, Merkle
  batching, salted fingerprints, proof bundles, hosted notary on a fixed domain with a
  secrets manager, mainnet.
