import { defineConfig, devices } from "@playwright/test";

// End-to-end tests, one or more per use case, against the local Docker stack
// (docker compose up -d first). They read access keys from the local Mailpit
// inbox, so they only work on localhost. One worker: every test shares the
// same database, and some (lockout, approvals) would trip over each other.
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // E2E_CHANNEL=chrome uses an installed Google Chrome (with its own throwaway
  // profile) instead of Playwright's downloaded Chromium
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL } }],
});
