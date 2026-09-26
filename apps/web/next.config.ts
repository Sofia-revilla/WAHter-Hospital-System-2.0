import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

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
};

export default nextConfig;
