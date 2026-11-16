import { expect, type Page } from "@playwright/test";

// Shared steps for the end-to-end tests. Access keys come from Mailpit's API
// (http://localhost:8025), the local inbox that catches every WAHter email.

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

// the seeded prototype logins (services/access-provider-registry/backend/db/seed.sql)
export const LOGINS = {
  admin: { role: "SystemAdministrator", portal: "System Admin Portal", username: "areyes", password: "admin2026" },
  secondAdmin: { role: "SystemAdministrator", portal: "System Admin Portal", username: "blim", password: "admin2026" },
  physician: { role: "Physician", portal: "Physician's Portal", username: "amendoza", password: "doctor2026" },
  nurse: { role: "Nurse", portal: "Nurse's Portal", username: "cbautista", password: "nurse2026" },
} as const;

// A name nobody else in this run (or earlier runs) has. Random letters, not a
// timestamp: names made seconds apart look alike to the duplicate matcher
// (UC-01 6a), so tests run on a database with old runs' patients would trip it.
export function uniqueName(prefix: string) {
  const letters = Array.from({ length: 10 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  return `${prefix}${letters}`;
}

interface MailpitMessage {
  ID: string;
  Subject: string;
  To: { Address: string }[];
  Created: string;
}

// The newest access key sent to this address after `since`
export async function accessKeyFor(email: string, since: number) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`);
    const { messages } = (await response.json()) as { messages: MailpitMessage[] };
    const fresh = messages.find((message) => new Date(message.Created).getTime() >= since - 1000);
    const code = fresh?.Subject.match(/(\d{6})/)?.[1];
    if (code) return code;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No access key arrived for ${email}`);
}

// The paper's flow through the UI: portal → username/password → access key
export async function signIn(page: Page, login: { portal: string; username: string; password: string }) {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(login.portal.replace(/'/g, ".")) }).click();
  await page.getByPlaceholder(/^e\.g\./).fill(login.username);
  await page.getByPlaceholder("Enter your password").fill(login.password);
  await page.getByRole("checkbox").check();
  const sentAt = Date.now();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: "Access Key Verification" })).toBeVisible();
  const code = await accessKeyFor(`${login.username}@wahter.local`, sentAt);
  await page.getByLabel("6-digit access key").fill(code);
  await page.getByRole("button", { name: /Verify Access Key/ }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 20_000 });
}

// The same flow over the API, for setting up data a test needs
export async function apiSignIn(login: { role: string; username: string; password: string }) {
  const sentAt = Date.now();
  const start = await fetch(`${BASE}/api/access-provider-registry/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: login.role, username: login.username, password: login.password }),
  });
  if (!start.ok) throw new Error(`login failed: ${start.status} ${await start.text()}`);
  const { challengeId } = (await start.json()) as { challengeId: string };
  const code = await accessKeyFor(`${login.username}@wahter.local`, sentAt);
  const verify = await fetch(`${BASE}/api/access-provider-registry/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  });
  if (!verify.ok) throw new Error(`verify failed: ${verify.status} ${await verify.text()}`);
  return ((await verify.json()) as { accessToken: string }).accessToken;
}

export async function api<T>(token: string, method: string, path: string, body?: unknown) {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : null) as T };
}

export async function openTab(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).first().click();
}
