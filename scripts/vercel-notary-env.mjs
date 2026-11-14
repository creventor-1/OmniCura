#!/usr/bin/env node
/**
 * Points the Vercel production deployment at this computer's Zcash notary.
 *
 *   npm run notary:tunnel   # once: starts the Cloudflare tunnel next to the notary
 *   npm run notary:vercel   # sets the Vercel env vars and redeploys production
 *
 * Run notary:vercel again whenever the tunnel restarts (its URL changes).
 *
 * What it does:
 *   1. Reads the tunnel's public URL (https://<random>.trycloudflare.com) from its logs.
 *   2. Checks that the notary answers through it, and that the token is accepted.
 *   3. Sets ZCASH_NOTARY_SIDECAR_URL and ZCASH_NOTARY_SIDECAR_TOKEN (stored as a
 *      Secret) for Production. The token is read from .env.local and passed to the
 *      Vercel CLI on stdin, so it never appears in your terminal or shell history.
 *   4. Deploys this folder to production (skip with --no-deploy).
 *
 * The anchoring flow needs the notary, the tunnel and this computer to stay on.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const deploy = !args.has("--no-deploy");
const isWin = process.platform === "win32";

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function readEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split(/\r?\n/)
        .filter((l) => /^[A-Z0-9_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
    );
  } catch {
    return {};
  }
}

// 1. Tunnel URL
let logs = "";
try {
  logs = execFileSync(
    "docker",
    ["compose", "--env-file", ".env.local", "--env-file", ".env.notary", "-f", "notary/docker-compose.yml", "--profile", "tunnel", "logs", "tunnel"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
} catch {
  fail("Could not read the tunnel's logs. Start it first with: npm run notary:tunnel");
}
const urls = logs.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g);
if (!urls?.length) fail("The tunnel has not printed its URL yet. Wait a few seconds and run this again (npm run notary:tunnel starts it).");
const tunnelUrl = urls[urls.length - 1];
console.log(`• Tunnel URL: ${tunnelUrl}`);

// 2. Reachability + token check
const env = readEnvFile(".env.local");
const token = env.ZCASH_NOTARY_SIDECAR_TOKEN;
if (!token) fail("ZCASH_NOTARY_SIDECAR_TOKEN is missing from .env.local.");

async function check() {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const health = await fetch(`${tunnelUrl}/health`, { signal: AbortSignal.timeout(10_000) });
      if (health.ok) {
        const h = await health.json();
        const authed = await fetch(`${tunnelUrl}/anchor/hash/${"0".repeat(64)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (authed.status === 401) fail("The notary rejected the token in .env.local. Is the container using the same .env.local?");
        console.log(`• Notary reachable through the tunnel (wallet ${h.ready ? "ready" : `not ready yet: ${h.reason}`}).`);
        return;
      }
    } catch {
      // DNS for a new quick tunnel can take a few seconds to propagate.
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  fail(`The notary does not answer at ${tunnelUrl}. Is the notary container running (npm run notary:docker)?`);
}
await check();

// 3. Vercel env vars (value on stdin, never on the command line)
function vercel(argv, input) {
  const r = spawnSync(isWin ? "npx.cmd" : "npx", ["vercel", ...argv], {
    input,
    encoding: "utf8",
    stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    shell: isWin,
  });
  if (r.status !== 0) fail(`vercel ${argv.slice(0, 3).join(" ")} failed.`);
}

console.log("• Setting ZCASH_NOTARY_SIDECAR_URL for Production …");
vercel(["env", "add", "ZCASH_NOTARY_SIDECAR_URL", "--environment", "production", "--force", "--no-sensitive", "--yes"], tunnelUrl);
console.log("• Setting ZCASH_NOTARY_SIDECAR_TOKEN for Production (as a Secret) …");
vercel(["env", "add", "ZCASH_NOTARY_SIDECAR_TOKEN", "--environment", "production", "--force", "--sensitive", "--yes"], token);

// 4. Redeploy so the new values take effect
if (deploy) {
  console.log("• Deploying to production (env changes only apply to new deployments) …");
  vercel(["deploy", "--prod", "--yes"]);
  console.log("\n✓ Done. Anchoring on the deployed site now goes through your notary.");
} else {
  console.log("\n✓ Env vars set. Redeploy production for them to take effect: npx vercel deploy --prod");
}
console.log("  Keep this computer, Docker, the notary and the tunnel running while the site is in use.");
