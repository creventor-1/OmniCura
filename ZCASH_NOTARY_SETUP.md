# Zcash notary setup (shielded `utest1…` address)

OmniCura anchors each assessment's SHA-256 fingerprint on the Zcash testnet by sending a
**shielded self-transfer** from the notary wallet to the notary address, with the memo:

```
omnicura:v1:assessment:<sha256-of-record>:<iso-timestamp>
```

No health data goes on-chain. The memo is encrypted; the transaction, its block and its
timestamp are public.

```
Browser ──POST /api/records/anchor──▶ Next.js server ──(hash recomputed here)──▶ Notary sidecar ──zingo-cli quicksend──▶ Zcash testnet
   ▲                                       │                                       (holds the utest1 seed)
   └── badge polls GET /api/records/anchor?txid=… ◀── SoChain (confirmations, block height)
```

The Next.js app never holds the spending key. Sending from a shielded address needs the
wallet's seed and zero-knowledge proofs that only Zcash's Rust wallet software can produce, so a
small sidecar (`scripts/zcash-notary-sidecar.mjs`) wraps **zingo-cli** and is the only thing
that can spend notary funds. It can only send to the notary address itself, with a memo in
the format above.

---

## Quick start with Docker (recommended on Windows)

Docker Desktop builds zingo-cli and runs the notary in one container; no Linux setup is needed.

1. **Put your seed phrase in `.env.notary`** (already created, gitignored). Open it in an
   editor and fill in `ZINGO_SEED=` with the recovery phrase of the wallet that owns the
   `utest1…` address, words separated by single spaces, no quotes. Save.
2. **Start Docker Desktop**, then in a terminal in the project folder run:
   ```bash
   npm run notary:docker
   ```
   The first run builds the image (20–40 min), then restores and syncs the wallet.
3. **Watch it come up:**
   ```bash
   npm run notary:logs
   ```
   Wait for `[notary] Wallet open …`, then press Ctrl+C (the notary keeps running).
4. **Run the app** (`npm run dev`), open **Data Ownership**, and click **Refresh** on the
   notary card. It should show your balance and **Funded & anchoring**.

Stop it with `npm run notary:stop`. The wallet is kept in a Docker volume, so restarts don't
re-sync from scratch. Once it reports "Wallet open", you can delete the seed from
`.env.notary`; it is only needed for the first restore.

The rest of this guide covers running zingo-cli directly (WSL/Linux/macOS) instead of Docker.

## What you need (manual setup)

- The **seed phrase** of the wallet that owns `ZCASH_NOTARY_ADDRESS` (the `utest1…` address),
  and ideally the block height it was created at (its "birthday").
- WSL (Ubuntu) on Windows, or any Linux/macOS machine, to build and run zingo-cli.

> If you don't have that seed, the `utest1…` address can never be spent from. Create a new
> testnet wallet with zingo-cli instead (step 2b), and put its address in `ZCASH_NOTARY_ADDRESS`.

## 1. Build zingo-cli (once, in WSL Ubuntu)

```bash
sudo apt update && sudo apt install -y build-essential gcc libsqlite3-dev git curl pkg-config
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && source ~/.cargo/env
cargo install cargo-make
git clone https://github.com/zingolabs/zingolib.git ~/zingolib
cd ~/zingolib && makers run-cli --build-only
~/zingolib/target/release/zingo-cli --version
```

This builds `zingo-cli` and `nym-proxy` side by side in `target/release/`. Keep them together:
current zingo-cli goes online only through the Nym mixnet, so a `--nakednet` build is offline-only
and cannot sync or send.
If the build asks for `protoc`, run `sudo apt install -y protobuf-compiler` and rebuild.

## 2. Configure the sidecar

```bash
cd /mnt/c/Users/HomePC/Desktop/TriageAI
cp .env.notary.example .env.notary
```

Edit `.env.notary` (it's gitignored):

```ini
ZINGO_SEED=word1 word2 … word24          # only needed for the first run
ZCASH_NOTARY_BIRTHDAY=<block height>      # wallet creation height
ZINGO_CLI_PATH=/home/<you>/zingolib/target/release/zingo-cli
ZINGO_DATA_DIR=/home/<you>/.omnicura-notary-wallet
```

`ZCASH_NOTARY_ADDRESS`, `ZCASH_NOTARY_SIDECAR_TOKEN` and `ZCASH_LIGHTWALLETD_URL` are read
from `.env.local`, which is already set up.

**2b. No seed for the `utest1…` address?** Create a fresh testnet wallet and use its address:

```bash
~/zingolib/target/release/zingo-cli --chain testnet --server https://testnet.zec.rocks:443 \
  --data-dir ~/.omnicura-notary-wallet --waitsync addresses
```

Put the printed `utest1…` address in `ZCASH_NOTARY_ADDRESS` (`.env.local`), back up the
wallet's seed, and leave `ZINGO_SEED` empty, since the wallet already exists in the data dir.

## 3. Run it

The sidecar needs Node 18+ inside WSL:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
cd /mnt/c/Users/HomePC/Desktop/TriageAI && npm run notary:sidecar
```

The first run restores the wallet and syncs it from its birthday; this can take several
minutes. Wait for:

```
[notary] Wallet open and controls the notary address.
```

WSL forwards `127.0.0.1:8737` to Windows, so the Next.js app (`npm run dev`) reaches it at
`ZCASH_NOTARY_SIDECAR_URL=http://127.0.0.1:8737`. Check it:

```bash
curl http://127.0.0.1:8737/health
```

## 4. Fund and verify

1. Open **Data Ownership** in the app. The notary card should say **Awaiting testnet funds**.
2. Copy the notary address and request TAZ from a faucet that supports unified addresses.
3. After one confirmation (blocks are about 75 seconds apart), click **Refresh**. The card
   switches to **Funded & anchoring** and shows the spendable balance.
4. Complete a symptom assessment. The result badge shows **Anchoring on Zcash**, then about
   1–3 minutes later **Anchored on Zcash · Block #…**. **View Proof → Explorer** opens the
   real transaction on SoChain.

Each anchor costs the network fee (about 0.0001 TAZ); the 1,000-zatoshi self-transfer comes
back to the same wallet.

### Split the balance once (recommended before a demo)

A faucet payment arrives as one note. Each anchor spends that note, and its change can't be
spent again until it has a few confirmations (roughly 3–5 minutes). A second anchor sent
before then waits automatically (the card shows **Funded · change confirming**), so a burst
of actions, such as an assessment, a grant and an approval, would go out one every few
minutes. Splitting the balance into several notes lets them go out back-to-back:

```bash
curl -X POST -H "Authorization: Bearer $ZCASH_NOTARY_SIDECAR_TOKEN"   -H "Content-Type: application/json" -d '{"notes":8}' http://127.0.0.1:8737/split
```

This is one self-send to the notary address with 8 equal outputs, costing about 0.0005 TAZ in
fees. Wait about 5 minutes for it to confirm, then up to 8 anchors can be sent without waiting.
Each note's change replaces it, so you only need to do this once per funding.

## 5. Database (signed-in users)

In the Supabase dashboard open **SQL Editor → New query**, paste the whole of
`supabase/migrations/20261114_zcash_anchoring.sql`, and click **Run**. It adds the anchoring
columns and the access-grants table, and lets an owner record the txid on their own
assessment (only the anchoring columns are updatable). It's safe to run more than once.
Until then, signed-in assessments are still saved, just without anchoring fields.

## Proving the memo to a judge

The transaction is public, but the memo is encrypted. To let someone verify that a
transaction contains a specific record hash, give them the notary's **unified full viewing
key** (UFVK). It can read the notary's transactions but cannot spend. Export it from the
wallet (run `zingo-cli help` inside the prompt to find the export command for your build),
then a verifier can open a watch-only wallet with:

```bash
zingo-cli --chain testnet --server https://testnet.zec.rocks:443 \
  --viewkey <UFVK> --birthday <height> --data-dir /tmp/omnicura-viewer
```

and list its transactions and memos from that prompt.

The sidecar also keeps an append-only ledger of everything it anchored:
`$ZINGO_DATA_DIR/omnicura-anchors.jsonl`.

## Hosting

Vercel's serverless functions can't run zingo-cli. For a hosted demo, run the sidecar on a
small VM (or keep it on your laptop), expose it over HTTPS (for example with a Cloudflare
Tunnel), set `ZCASH_NOTARY_SIDECAR_URL` and `ZCASH_NOTARY_SIDECAR_TOKEN` in Vercel, and keep
the sidecar's host bound to `127.0.0.1` behind the tunnel. The anchor endpoint is
rate-limited (6 per minute per IP, 60 per hour overall) to protect notary funds.

## Troubleshooting

| Badge / card says | Meaning | Fix |
| --- | --- | --- |
| Not configured | `ZCASH_NOTARY_SIDECAR_URL` or token missing in `.env.local` | Set both, restart `npm run dev` |
| Notary service offline | App can't reach the sidecar | Start `npm run notary:sidecar` |
| Wallet syncing / not set up | No wallet yet, or first sync running | Set `ZINGO_SEED` + birthday; wait for "Wallet open" |
| Awaiting testnet funds | Wallet ready, zero spendable | Fund the notary address |
| Funded · change confirming | All funds are change from the last anchor, still confirming | Nothing to do: new anchors wait for it. Use `/split` to avoid the wait |
| Fingerprinted · Anchoring failed | Send failed (see sidecar log) | Usually funds or indexer; the record stays fingerprinted |
| Anchor not found | A txid that never reached the chain (e.g. older made-up txids) | None. New records anchor for real |
| "Not owned by the connected wallet" | The seed doesn't control `ZCASH_NOTARY_ADDRESS` | Use the matching seed, or switch the address (2b) |
