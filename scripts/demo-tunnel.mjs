// Demo day in one command (npm run tunnel):
//   1. starts a Cloudflare quick tunnel to the local stack on :8080, as its
//      own background process so closing this terminal doesn't stop it
//   2. waits until the new public address actually answers
//   3. writes it to apps/web/demo-tunnel.json and pushes that one file, so
//      Vercel rebuilds pointing at it (no dashboard steps)
//
// Needs cloudflared (github.com/cloudflare/cloudflared/releases). Set
// CLOUDFLARED_PATH in .env if it isn't on your PATH.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TUNNEL_FILE = fileURLToPath(new URL("../apps/web/demo-tunnel.json", import.meta.url));
const LOG_FILE = fileURLToPath(new URL("../.tunnel.log", import.meta.url));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cloudflaredPath() {
  const envFile = fileURLToPath(new URL("../.env", import.meta.url));
  if (existsSync(envFile)) {
    const match = readFileSync(envFile, "utf8").match(/^CLOUDFLARED_PATH=(.+)$/m);
    if (match) return match[1].trim();
  }
  return "cloudflared";
}

async function localStackIsUp() {
  try {
    const response = await fetch("http://127.0.0.1:8080/api/identity/health", { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

if (!(await localStackIsUp())) {
  console.error("The local stack isn't answering on :8080. Run `docker compose up -d` first.");
  process.exit(1);
}

// 127.0.0.1, not localhost: cloudflared tried IPv6 (::1) first and got refused
if (existsSync(LOG_FILE)) rmSync(LOG_FILE);
const tunnel = spawn(
  cloudflaredPath(),
  ["tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:8080", "--logfile", LOG_FILE],
  { detached: true, stdio: "ignore", windowsHide: true },
);
tunnel.unref();
console.log("Starting the tunnel...");

let url = null;
for (let second = 0; second < 60 && !url; second++) {
  await sleep(1000);
  if (existsSync(LOG_FILE)) url = readFileSync(LOG_FILE, "utf8").match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];
}
if (!url) {
  console.error(`No tunnel address after 60s. See ${LOG_FILE}.`);
  process.exit(1);
}

// a brand-new quick tunnel takes ~30s before Cloudflare routes to it
console.log(`Tunnel address: ${url}\nWaiting for it to go live...`);
let isLive = false;
for (let attempt = 0; attempt < 30 && !isLive; attempt++) {
  await sleep(3000);
  try {
    isLive = (await fetch(`${url}/api/identity/health`, { signal: AbortSignal.timeout(10000) })).ok;
  } catch {
    // not routed yet
  }
}
if (!isLive) {
  console.error("The tunnel started but never answered. Try `npm run tunnel` again.");
  process.exit(1);
}

writeFileSync(TUNNEL_FILE, `${JSON.stringify({ apiUrl: `${url}/api` }, null, 2)}\n`);
const git = (...args) => execFileSync("git", args, { cwd: ROOT, stdio: "inherit" });
git("add", "apps/web/demo-tunnel.json");
git("commit", "-m", "Point the Vercel demo at the current tunnel", "--", "apps/web/demo-tunnel.json");
git("push", "origin", "HEAD:main");

console.log(`\nLive at ${url}. Vercel is redeploying; the site uses it in about a minute.`);
console.log("The tunnel keeps running in the background. Stop it with: taskkill /IM cloudflared.exe /F");
