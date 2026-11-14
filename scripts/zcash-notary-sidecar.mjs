#!/usr/bin/env node
/**
 * OmniCura Zcash Notary Sidecar
 * ---------------------------------------------------------------------------
 * A tiny HTTP service that owns the shielded notary wallet (utest1…) and is the
 * ONLY component that can spend from it. The Next.js app never sees the seed.
 *
 * It wraps zingo-cli (https://github.com/zingolabs/zingolib) in command mode:
 *   zingo-cli --chain testnet --data-dir <dir> --server <lightwalletd> --waitsync <command>
 *
 * Safety properties:
 *   • Binds to 127.0.0.1 by default and requires a bearer token.
 *   • Can only send to ZCASH_NOTARY_ADDRESS (a self-send) with a memo matching
 *     `omnicura:v1:(assessment|consent):<sha256>:<iso-timestamp>`. It cannot pay arbitrary addresses.
 *   • Idempotent: a record hash is anchored at most once (append-only ledger).
 *   • zingo-cli calls are serialised (one wallet process at a time).
 *   • A send that fails only because change from the previous send is still
 *     confirming waits for it instead of failing. POST /split breaks the balance
 *     into several notes (all to the notary address) so bursts don't wait at all.
 *
 * Configuration is read from the environment, then from `.env.notary` and
 * `.env.local` in the project root (existing environment variables win):
 *   ZCASH_NOTARY_ADDRESS        (required) utest1… address that receives anchors
 *   ZCASH_NOTARY_SIDECAR_TOKEN  (required) shared secret with the Next.js app
 *   ZCASH_NETWORK               testnet | mainnet            (default testnet)
 *   ZCASH_LIGHTWALLETD_URL      indexer URL                  (default https://testnet.zec.rocks:443)
 *   ZINGO_CLI_PATH              path to zingo-cli            (default "zingo-cli")
 *   ZINGO_DATA_DIR              wallet directory             (default ~/.omnicura-notary-wallet)
 *   ZINGO_SEED                  seed phrase, ONLY needed for the first run (restore)
 *   ZCASH_NOTARY_BIRTHDAY       block height the wallet was created at (restore)
 *   ZCASH_ANCHOR_AMOUNT_ZATS    amount sent to self per anchor (default 1000 = 0.00001)
 *   ZCASH_NOTARY_SIDECAR_HOST   bind address                 (default 127.0.0.1)
 *   ZCASH_NOTARY_SIDECAR_PORT   port                         (default 8737)
 *
 * Run:  npm run notary:sidecar
 */

import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
function loadEnvFile(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadEnvFile(".env.notary");
loadEnvFile(".env.local");

const cfg = {
  notaryAddress: (process.env.ZCASH_NOTARY_ADDRESS || "").trim(),
  token: (process.env.ZCASH_NOTARY_SIDECAR_TOKEN || "").trim(),
  chain: (process.env.ZCASH_NETWORK || "testnet").trim(),
  server: (process.env.ZCASH_LIGHTWALLETD_URL || "https://testnet.zec.rocks:443").trim(),
  cli: (process.env.ZINGO_CLI_PATH || "zingo-cli").trim(),
  nymProxy: (process.env.ZINGO_NYM_PROXY || "").trim(), // nym-proxy (mixnet transport), if not beside zingo-cli
  dataDir: path.resolve((process.env.ZINGO_DATA_DIR || path.join(os.homedir(), ".omnicura-notary-wallet")).trim()),
  seed: (process.env.ZINGO_SEED || "").trim(),
  birthday: (process.env.ZCASH_NOTARY_BIRTHDAY || "").trim(),
  amountZats: Number(process.env.ZCASH_ANCHOR_AMOUNT_ZATS || 1000),
  host: (process.env.ZCASH_NOTARY_SIDECAR_HOST || "127.0.0.1").trim(),
  port: Number(process.env.ZCASH_NOTARY_SIDECAR_PORT || 8737),
};

function fatal(msg) {
  console.error(`[notary] FATAL: ${msg}`);
  process.exit(1);
}
if (!cfg.notaryAddress) fatal("ZCASH_NOTARY_ADDRESS is not set.");
if (!cfg.token || cfg.token.length < 24) fatal("ZCASH_NOTARY_SIDECAR_TOKEN must be set (24+ random characters).");
if (!/^(testnet|mainnet)$/.test(cfg.chain)) fatal(`ZCASH_NETWORK must be testnet or mainnet (got "${cfg.chain}").`);
if (!Number.isInteger(cfg.amountZats) || cfg.amountZats < 1) fatal("ZCASH_ANCHOR_AMOUNT_ZATS must be a positive integer.");

const LEDGER = path.join(cfg.dataDir, "omnicura-anchors.jsonl");
// Two anchor kinds: clinical assessments and consent / access-control events.
const MEMO_RE = /^omnicura:v1:(assessment|consent):([0-9a-f]{64}):\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

// ---------------------------------------------------------------------------
// zingo-cli runner (serialised)
// ---------------------------------------------------------------------------
let queue = Promise.resolve();
function runZingo(args, { timeoutMs = 600_000, withSeed = false } = {}) {
  const job = queue.then(
    () =>
      new Promise((resolve) => {
        const fullArgs = ["--chain", cfg.chain, "--data-dir", cfg.dataDir, "--server", cfg.server];
        if (cfg.nymProxy) fullArgs.push("--nym-proxy", cfg.nymProxy);
        if (withSeed && cfg.birthday) fullArgs.push("--birthday", cfg.birthday);
        fullArgs.push(...args);

        // Allow a .js/.mjs mock for local testing.
        const isScript = /\.(m?js)$/i.test(cfg.cli);
        const file = isScript ? process.execPath : cfg.cli;
        const argv = isScript ? [cfg.cli, ...fullArgs] : fullArgs;

        const env = { ...process.env };
        delete env.ZINGO_SEED;
        if (withSeed && cfg.seed) env.ZINGO_SEED = cfg.seed; // never passed on the command line

        execFile(file, argv, { env, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
          resolve({
            ok: !err,
            code: err?.code ?? 0,
            notFound: err?.code === "ENOENT",
            timedOut: Boolean(err?.killed),
            stdout: String(stdout || ""),
            stderr: String(stderr || ""),
          });
        });
      })
  );
  queue = job.catch(() => undefined);
  return job;
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** zingo-cli `balance` prints a Display impl, not JSON — parse defensively. */
function parseSpendableZats(text) {
  const json = extractJson(text);
  const lines = text.split(/\r?\n/);
  const pick = (re) => {
    for (const line of lines) {
      const m = line.match(re);
      if (m) {
        const raw = m[1].replace(/[_,\s]/g, "");
        if (raw.includes(".")) return Math.round(parseFloat(raw) * 1e8);
        return Number(raw);
      }
    }
    return null;
  };
  if (json && typeof json === "object") {
    for (const key of ["spendable_balance", "total_spendable", "spendable", "confirmed_balance", "total"]) {
      if (typeof json[key] === "number") return json[key];
    }
  }
  const total = pick(/total[^:=\n]*spendable[^:=\n]*[:=]\s*([\d_.,]+)/i) ?? pick(/spendable[^:=\n]*total[^:=\n]*[:=]\s*([\d_.,]+)/i);
  if (total !== null) return total;
  const sumLines = (re) => {
    let sum = null;
    for (const line of lines) {
      const m = line.match(re);
      if (m && !/total/i.test(line)) {
        const raw = m[1].replace(/[_,\s]/g, "");
        const v = raw.includes(".") ? Math.round(parseFloat(raw) * 1e8) : Number(raw);
        if (Number.isFinite(v)) sum = (sum ?? 0) + v;
      }
    }
    return sum;
  };
  // Per-pool "spendable_*" lines if the build prints them…
  const spendable = sumLines(/spendable[^:=\n]*[:=]\s*([\d_.,]+)/i);
  if (spendable !== null) return spendable;
  // …otherwise current zingo-cli prints confirmed_<pool>_balance for every pool
  // (ironwood, orchard, sapling, transparent). Confirmed funds are spendable.
  return sumLines(/^\s*confirmed_[a-z0-9]+_balance\s*[:=]\s*([\d_.,]+)/i);
}

/** Funds that exist but aren't spendable yet (change from a recent send awaiting confirmations). */
function parsePendingZats(text) {
  let sum = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*unconfirmed_[a-z0-9]+_balance\s*[:=]\s*([\d_.,]+)/i);
    if (!m) continue;
    const raw = m[1].replace(/[_,\s]/g, "");
    const v = raw.includes(".") ? Math.round(parseFloat(raw) * 1e8) : Number(raw);
    if (Number.isFinite(v)) sum = (sum ?? 0) + v;
  }
  return sum;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function classifyError(text) {
  const t = text.toLowerCase();
  if (/insufficient|not enough|balance/.test(t)) return "insufficient_funds";
  if (/connect|unavailable|dns|tls|transport|timed out|deadline/.test(t)) return "indexer_unreachable";
  if (/seed|mnemonic|wallet.*(not found|missing)/.test(t)) return "wallet_not_initialised";
  return "send_failed";
}

// ---------------------------------------------------------------------------
// Ledger (append-only, idempotency)
// ---------------------------------------------------------------------------
function readLedger() {
  if (!fs.existsSync(LEDGER)) return [];
  return fs
    .readFileSync(LEDGER, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
function appendLedger(entry) {
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  fs.appendFileSync(LEDGER, JSON.stringify(entry) + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// Wallet state
// ---------------------------------------------------------------------------
const state = {
  ready: false,
  ownsNotaryAddress: "unknown", // true | false | "unknown"
  reason: "starting",
  walletAddresses: [],
};

// Every zingo-cli call opens a mixnet session and syncs, which takes ~1–2 minutes.
// So the balance is refreshed in the background and /status answers from this cache.
const WALLET_REFRESH_MS = 3 * 60_000;
const walletCache = { data: null, checkedAt: 0, error: null, refreshing: null };

function refreshWalletStatus() {
  if (walletCache.refreshing) return walletCache.refreshing;
  walletCache.refreshing = (async () => {
    const bal = await runZingo(["--waitsync", "balance"]);
    if (!bal.ok) {
      walletCache.error = classifyError(bal.stderr + bal.stdout);
      console.error(`[notary] balance check failed (${walletCache.error})`);
      return;
    }
    const height = await runZingo(["--nosync", "height"]);
    const heightJson = extractJson(height.stdout);
    walletCache.data = {
      spendableZats: parseSpendableZats(bal.stdout),
      pendingZats: parsePendingZats(bal.stdout),
      balanceText: bal.stdout.trim().slice(0, 2000),
      walletHeight: typeof heightJson?.height === "number" ? heightJson.height : null,
    };
    walletCache.checkedAt = Date.now();
    walletCache.error = null;
    console.log(
      `[notary] balance: ${walletCache.data.spendableZats ?? "unparsed"} zats spendable` +
        (walletCache.data.pendingZats ? `, ${walletCache.data.pendingZats} confirming` : "") +
        ` at height ${walletCache.data.walletHeight ?? "?"}`
    );
  })().finally(() => {
    walletCache.refreshing = null;
  });
  return walletCache.refreshing;
}

// Requests for the same record hash that arrive while a send is in progress share it.
const inflightAnchors = new Map();

const FEE_HEADROOM_ZATS = 50_000;
const CONFIRM_WAIT_MS = 15 * 60_000;

/**
 * quicksend, returning { txid } or { error }. If the wallet's only funds are
 * change still awaiting confirmations, wait for them rather than failing.
 */
async function quicksend(sendArgs, label) {
  const deadline = Date.now() + CONFIRM_WAIT_MS;
  let transientRetries = 2;
  for (;;) {
    const result = await runZingo(["--waitsync", "quicksend", ...sendArgs]);
    const json = extractJson(result.stdout);
    const txid = Array.isArray(json?.txids) ? String(json.txids[0] || "") : "";
    if (result.ok && /^[0-9a-f]{64}$/i.test(txid)) return { txid: txid.toLowerCase() };

    const code = result.timedOut ? "send_timeout" : classifyError(result.stderr + result.stdout);
    // The mixnet occasionally can't reach lightwalletd; a fresh session usually can.
    if (code === "indexer_unreachable" && transientRetries > 0) {
      transientRetries -= 1;
      console.log(`[notary] ${label}: indexer unreachable over the mixnet; retrying in 20 s.`);
      await sleep(20_000);
      continue;
    }
    if (code !== "insufficient_funds") {
      console.error(`[notary] ${label} failed (${code}): ${(result.stderr || result.stdout).slice(0, 400)}`);
      return { error: code };
    }
    await refreshWalletStatus();
    const pending = walletCache.data?.pendingZats ?? 0;
    if (pending < cfg.amountZats + FEE_HEADROOM_ZATS) {
      console.error(`[notary] ${label} failed: wallet has no spendable or confirming funds.`);
      return { error: "insufficient_funds" };
    }
    if (Date.now() > deadline) {
      console.error(`[notary] ${label} gave up: ${pending} zats still confirming after ${CONFIRM_WAIT_MS / 60_000} min.`);
      return { error: "funds_confirming" };
    }
    console.log(`[notary] ${label}: ${pending} zats still confirming; retrying in 45 s (POST /split avoids this wait).`);
    await sleep(45_000);
  }
}

async function initWallet() {
  const firstRun = !fs.existsSync(cfg.dataDir) || fs.readdirSync(cfg.dataDir).filter((f) => !f.startsWith("omnicura-")).length === 0;
  if (firstRun && !cfg.seed) {
    state.reason = `No wallet in ${cfg.dataDir} and ZINGO_SEED is not set. Put the notary seed phrase in .env.notary for the first run.`;
    console.error(`[notary] ${state.reason}`);
    return;
  }
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  console.log(`[notary] ${firstRun ? "Restoring wallet from seed" : "Opening wallet"} (${cfg.chain}, ${cfg.server}) …`);

  const res = await runZingo(["--waitsync", "addresses"], { withSeed: firstRun, timeoutMs: 30 * 60_000 });
  if (res.notFound) {
    state.reason = `zingo-cli not found at "${cfg.cli}". Set ZINGO_CLI_PATH.`;
    console.error(`[notary] ${state.reason}`);
    return;
  }
  if (!res.ok) {
    state.reason = `zingo-cli failed to open the wallet (${classifyError(res.stderr + res.stdout)}).`;
    console.error(`[notary] ${state.reason}\n${res.stderr.slice(0, 600)}`);
    return;
  }
  state.walletAddresses = Array.from(new Set(res.stdout.match(/\b(?:utest1|u1|ztestsapling|zs|tm|t1)[0-9a-z]{20,}\b/gi) || []));
  state.ownsNotaryAddress = res.stdout.includes(cfg.notaryAddress) ? true : false;
  state.ready = true;
  state.reason = state.ownsNotaryAddress
    ? "Wallet open and controls the notary address."
    : "Wallet open, but ZCASH_NOTARY_ADDRESS is not among its listed addresses. Anchors are still sent to that address, but funds must be in THIS wallet.";
  console.log(`[notary] ${state.reason}`);

  refreshWalletStatus();
  setInterval(() => {
    if (inflightAnchors.size === 0) refreshWalletStatus();
  }, WALLET_REFRESH_MS).unref();
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}
function authorised(req) {
  const header = req.headers.authorization || "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(cfg.token);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 8192) {
        reject(new Error("body_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("invalid_json"));
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      ok: true,
      ready: state.ready,
      chain: cfg.chain,
      notaryAddress: cfg.notaryAddress,
      ownsNotaryAddress: state.ownsNotaryAddress,
      reason: state.reason,
    });
  }

  if (!authorised(req)) return send(res, 401, { error: "unauthorised" });

  try {
    if (req.method === "GET" && url.pathname === "/status") {
      if (!state.ready) return send(res, 503, { error: "wallet_not_ready", reason: state.reason });
      if (!walletCache.data) {
        refreshWalletStatus();
        return send(res, 503, {
          error: "wallet_not_ready",
          reason: walletCache.error
            ? `Balance check failed (${walletCache.error}); retrying.`
            : "Wallet open; first balance check in progress (about 1–2 minutes over the mixnet).",
        });
      }
      if (Date.now() - walletCache.checkedAt > WALLET_REFRESH_MS && inflightAnchors.size === 0) refreshWalletStatus();
      return send(res, 200, {
        ready: true,
        ownsNotaryAddress: state.ownsNotaryAddress,
        ...walletCache.data,
        checkedAt: new Date(walletCache.checkedAt).toISOString(),
        refreshing: Boolean(walletCache.refreshing),
        anchorAmountZats: cfg.amountZats,
        anchorsSent: readLedger().length,
      });
    }

    if (req.method === "POST" && url.pathname === "/anchor") {
      if (!state.ready) return send(res, 503, { error: "wallet_not_ready", reason: state.reason });
      const body = await readBody(req);
      const recordHash = String(body.recordHash || "");
      const memo = String(body.memo || "");
      const m = memo.match(MEMO_RE);
      if (!/^[0-9a-f]{64}$/.test(recordHash) || !m || m[2] !== recordHash || Buffer.byteLength(memo) > 512) {
        return send(res, 400, { error: "invalid_anchor_request" });
      }

      const existing = readLedger().find((e) => e.recordHash === recordHash);
      if (existing) return send(res, 200, { txid: existing.txid, memo: existing.memo, duplicate: true });

      let job = inflightAnchors.get(recordHash);
      if (!job) {
        job = (async () => {
          console.log(`[notary] anchoring ${recordHash.slice(0, 12)}… (mixnet + proof, usually 1–3 min)`);
          const sent = await quicksend([cfg.notaryAddress, String(cfg.amountZats), memo], `anchor ${recordHash.slice(0, 12)}…`);
          if (sent.error) return { error: sent.error };
          const entry = { txid: sent.txid, kind: m[1], recordHash, memo, createdAt: new Date().toISOString() };
          appendLedger(entry);
          console.log(`[notary] anchored ${recordHash.slice(0, 12)}… in tx ${entry.txid}`);
          refreshWalletStatus(); // balance changed by the fee
          return { entry };
        })().finally(() => inflightAnchors.delete(recordHash));
        inflightAnchors.set(recordHash, job);
      }

      const outcome = await job;
      if (outcome.error) return send(res, outcome.error === "insufficient_funds" ? 402 : 502, { error: outcome.error });
      return send(res, 200, { txid: outcome.entry.txid, memo: outcome.entry.memo });
    }

    // Split the balance into N notes at the notary address (self-send, no memo).
    // Each anchor then spends one note, so N anchors can go out back-to-back
    // without waiting for the previous send's change to confirm.
    if (req.method === "POST" && url.pathname === "/split") {
      if (!state.ready) return send(res, 503, { error: "wallet_not_ready", reason: state.reason });
      const body = await readBody(req);
      const notes = Math.min(20, Math.max(2, Number.parseInt(String(body.notes ?? 8), 10) || 8));
      await refreshWalletStatus();
      const spendable = walletCache.data?.spendableZats ?? 0;
      const pending = walletCache.data?.pendingZats ?? 0;
      const total = Math.max(spendable, pending); // if all funds are confirming, quicksend waits for them
      const fee = 5_000 * (notes + 2); // ZIP-317: 5,000 zats per action
      const each = Math.floor((total - fee) / (notes + 1)); // one share stays as change
      if (each < 100_000) return send(res, 400, { error: "balance_too_small", spendable, pending });
      const outputs = Array.from({ length: notes }, () => ({ address: cfg.notaryAddress, amount: each }));
      console.log(`[notary] splitting balance into ${notes} notes of ${each} zats (+ change) …`);
      const sent = await quicksend([JSON.stringify(outputs)], "split");
      if (sent.error) return send(res, sent.error === "insufficient_funds" ? 402 : 502, { error: sent.error });
      console.log(`[notary] split sent in tx ${sent.txid}`);
      refreshWalletStatus();
      return send(res, 200, { txid: sent.txid, notes, zatsPerNote: each });
    }

    const ledgerMatch = url.pathname.match(/^\/anchor\/([0-9a-f]{64})$/i);
    if (req.method === "GET" && ledgerMatch) {
      const entry = readLedger().find((e) => e.txid === ledgerMatch[1].toLowerCase());
      return entry ? send(res, 200, entry) : send(res, 404, { error: "not_found" });
    }

    return send(res, 404, { error: "not_found" });
  } catch (err) {
    return send(res, 400, { error: err instanceof Error ? err.message : "bad_request" });
  }
});

server.listen(cfg.port, cfg.host, () => {
  console.log(`[notary] listening on http://${cfg.host}:${cfg.port} — notary ${cfg.notaryAddress.slice(0, 14)}… on ${cfg.chain}`);
  initWallet();
});
