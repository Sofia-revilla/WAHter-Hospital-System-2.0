import { defineConfig } from "vitest/config";

// Unit tests for business logic: plain functions next to the code they test
// (*.test.ts). No database, no network. The gateway and end-to-end tests need
// the Docker stack and run separately (npm run test:gateway, npm run test:e2e).
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "services/*/backend/src/**/*.test.ts"],
    environment: "node",
  },
});
