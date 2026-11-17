import { describe, expect, it } from "vitest";
import { accessKeyMode } from "./auth.service";

const hosted = String.raw`^https://wahter-hospital-system(-[a-z0-9-]+)?\.vercel\.app$`;
const vercel = "https://wahter-hospital-system-git-syste-f79c4d-sofia-revillas-projects.vercel.app";

describe("accessKeyMode", () => {
  it("emails the key by default", () => {
    expect(accessKeyMode("http://localhost:8080", {})).toBe("email");
    expect(accessKeyMode(undefined, {})).toBe("email");
  });

  it("skips it everywhere when ACCESS_KEY_REQUIRED=false", () => {
    expect(accessKeyMode("http://localhost:8080", { ACCESS_KEY_REQUIRED: "false" })).toBe("skip");
  });

  it("uses the given code only for the hosted site", () => {
    const env = { ACCESS_KEY_HOSTED_ORIGINS: hosted, ACCESS_KEY_HOSTED_CODE: "34187" };
    expect(accessKeyMode(vercel, env)).toBe("given");
    expect(accessKeyMode("http://localhost:8080", env)).toBe("email");
    expect(accessKeyMode("https://wahter-hospital-system.vercel.app.evil.com", env)).toBe("email");
    expect(accessKeyMode(undefined, env)).toBe("email");
  });

  it("skips it for the hosted site when no usable code is set", () => {
    expect(accessKeyMode(vercel, { ACCESS_KEY_HOSTED_ORIGINS: hosted })).toBe("skip");
    expect(accessKeyMode(vercel, { ACCESS_KEY_HOSTED_ORIGINS: hosted, ACCESS_KEY_HOSTED_CODE: "abc" })).toBe("skip");
  });

  it("a broken pattern keeps the emailed key", () => {
    expect(accessKeyMode(vercel, { ACCESS_KEY_HOSTED_ORIGINS: "([", ACCESS_KEY_HOSTED_CODE: "34187" })).toBe("email");
  });
});
