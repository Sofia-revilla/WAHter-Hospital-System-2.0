import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // This app sits in apps/web of the monorepo. Without an explicit root, Next
  // walks up and picks whatever lockfile it finds first (on our machines that
  // was the old WAH4E checkout), so we pin it to the monorepo root.
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
};

export default nextConfig;
