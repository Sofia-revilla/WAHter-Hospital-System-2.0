import { describe, expect, it } from "vitest";
import { skipsAccessKey } from "./auth.service";

const hosted = "^https://wahter-hospital-system(-[a-z0-9-]+)?\.vercel\.app$";

describe("skipsAccessKey", () => {
  it("keeps the access key by default", () => {
    expect(skipsAccessKey("http://localhost:8080", {})).toBe(false);
    expect(skipsAccessKey(undefined, {})).toBe(false);
  });

  it("skips it everywhere when ACCESS_KEY_REQUIRED=false", () => {
    expect(skipsAccessKey("http://localhost:8080", { ACCESS_KEY_REQUIRED: "false" })).toBe(true);
  });

  it("skips it only for the listed sites", () => {
    const env = { ACCESS_KEY_SKIP_ORIGINS: hosted };
    expect(skipsAccessKey("https://wahter-hospital-system-git-syste-f79c4d-sofia-revillas-projects.vercel.app", env)).toBe(true);
    expect(skipsAccessKey("http://localhost:8080", env)).toBe(false);
    expect(skipsAccessKey("https://wahter-hospital-system.vercel.app.evil.com", env)).toBe(false);
    expect(skipsAccessKey(undefined, env)).toBe(false);
  });

  it("a broken pattern keeps the key", () => {
    expect(skipsAccessKey("http://localhost:8080", { ACCESS_KEY_SKIP_ORIGINS: "([" })).toBe(false);
  });
});
