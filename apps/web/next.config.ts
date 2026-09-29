import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// On Vercel, the demo tunnel address comes from demo-tunnel.json in the repo,
// which `npm run tunnel` updates and pushes. That way a new tunnel address
// only needs a push, not a trip to the Vercel dashboard. Local and Docker
// builds ignore it and keep using NEXT_PUBLIC_API_URL.
function demoTunnelApiUrl() {
  if (process.env.VERCEL !== "1") return undefined;
  const file = fileURLToPath(new URL("./demo-tunnel.json", import.meta.url));
  if (!existsSync(file)) return undefined;
  const { apiUrl } = JSON.parse(readFileSync(file, "utf8")) as { apiUrl?: string };
  return apiUrl || undefined;
}

const demoApiUrl = demoTunnelApiUrl();

const nextConfig: NextConfig = {
  // This app sits in apps/web of the monorepo. Without an explicit root, Next
  // walks up and picks whatever lockfile it finds first (on our machines that
  // was the old WAH4E checkout), so we pin it to the monorepo root.
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  // the dev-only "N" badge sat on top of the sidebar's Profile item
  devIndicators: { position: "bottom-right" },
  experimental: {
    // the tab screens are in services/<name>/frontend, next to each service's
    // backend, so Next has to compile TSX from outside apps/web
    externalDir: true,
  },
  env: demoApiUrl ? { NEXT_PUBLIC_DEMO_API_URL: demoApiUrl } : {},
};

export default nextConfig;
