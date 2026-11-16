import { defineConfig } from "vitest/config";

// Kong role checks against the running stack (docker compose up first)
export default defineConfig({
  test: {
    include: ["tests/gateway/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
  },
});
