// UC-08 Administer System Access and System Audit (US-41 to US-43), plus the
// paper's authentication flow. Runs against the local Docker stack.

import { expect, test } from "@playwright/test";
import { LOGINS, api, apiSignIn, openTab, signIn, uniqueName } from "./helpers";

interface Account {
  id: string;
  username: string;
  role: string;
  status: string;
  isLocked: boolean;
}

test("the public login page has no sign-up and no Try Demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "System Access" })).toBeVisible();
  await expect(page.getByText("Create New Staff Account")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try Demo" })).toHaveCount(0);
  await expect(page.getByText(/System Administrator creates your account/)).toBeVisible();
});

test("signing in takes a password and then an emailed access key", async ({ page }) => {
  await signIn(page, LOGINS.admin);
  await expect(page.getByRole("heading", { name: "Users and Roles", level: 2 })).toBeVisible();
});

test("a wrong access key is refused", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Nurse.s Portal/ }).click();
  await page.getByPlaceholder(/^e\.g\./).fill(LOGINS.nurse.username);
  await page.getByPlaceholder("Enter your password").fill(LOGINS.nurse.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel("6-digit access key").fill("000000");
  await page.getByRole("button", { name: /Verify Access Key/ }).click();
  await expect(page.getByText(/doesn't match|expired/)).toBeVisible();
});

test("the System Administrator creates an account that can then sign in", async ({ page }) => {
  const username = uniqueName("e2e");
  const name = `Test Nurse ${username}`;
  await signIn(page, LOGINS.admin);
  await page.getByRole("button", { name: "Create Staff Account" }).click();
  const dialog = page.getByRole("dialog", { name: "Create Staff Account" });
  await dialog.locator("input").nth(0).fill(name);
  await dialog.locator("select").selectOption("Nurse");
  await dialog.getByPlaceholder("e.g. Internal Medicine").fill("Medical Ward");
  await dialog.getByPlaceholder("e.g. sjohnson").fill(username);
  await dialog.getByPlaceholder("sjohnson@wahter.local").fill(`${username}@wahter.local`);
  await dialog.getByPlaceholder("At least 8 characters").fill("temp-pass-2026");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Created ${name}'s account (${username}).`)).toBeVisible();

  const token = await apiSignIn({ role: "Nurse", username, password: "temp-pass-2026" });
  expect(token).toBeTruthy();
});

test("a role change waits for a second administrator", async ({ browser }) => {
  const admin = await apiSignIn(LOGINS.admin);
  const username = uniqueName("e2erole");
  const created = await api<Account>(admin, "POST", "/access-provider-registry/accounts", {
    name: `Role Change ${username}`,
    role: "Nurse",
    department: "Medical Ward",
    username,
    email: `${username}@wahter.local`,
    temporaryPassword: "temp-pass-2026",
  });
  expect(created.status).toBe(201);

  // first admin asks
  const first = await browser.newPage();
  await signIn(first, LOGINS.admin);
  const row = first.getByRole("row", { name: new RegExp(username) });
  await row.getByRole("button", { name: /Change role/ }).click();
  const dialog = first.getByRole("dialog");
  await dialog.locator("select").selectOption("Pharmacist");
  await dialog.locator("textarea").fill("Moved to the pharmacy");
  await dialog.getByRole("button", { name: "Ask for approval" }).click();
  await expect(first.getByText(/Another System Administrator has to approve it/)).toBeVisible();
  // the requester sees no Approve button on their own request
  const request = first.getByRole("listitem").filter({ hasText: `Role Change ${username}` });
  await expect(request.getByRole("button", { name: "Approve" })).toHaveCount(0);

  // the second admin approves
  const second = await browser.newPage();
  await signIn(second, LOGINS.secondAdmin);
  await second
    .getByRole("listitem")
    .filter({ hasText: `Role Change ${username}` })
    .getByRole("button", { name: "Approve" })
    .click();
  await expect(second.getByText(/^Approved APR-/)).toBeVisible();

  const accounts = await api<Account[]>(admin, "GET", "/access-provider-registry/accounts");
  expect(accounts.body.find((account) => account.username === username)?.role).toBe("Pharmacist");
});

test("five failed sign-ins lock the account until an administrator unlocks it", async ({ page }) => {
  const admin = await apiSignIn(LOGINS.admin);
  const username = uniqueName("e2elock");
  await api(admin, "POST", "/access-provider-registry/accounts", {
    name: `Lockout ${username}`,
    role: "Nurse",
    department: "Medical Ward",
    username,
    email: `${username}@wahter.local`,
    temporaryPassword: "temp-pass-2026",
  });
  for (let attempt = 0; attempt < 5; attempt++) {
    await fetch("http://localhost:8080/api/access-provider-registry/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "Nurse", username, password: "wrong-password" }),
    });
  }
  // locked even with the right password
  await expect(apiSignIn({ role: "Nurse", username, password: "temp-pass-2026" })).rejects.toThrow(/locked/);

  await signIn(page, LOGINS.admin);
  const row = page.getByRole("row", { name: new RegExp(username) });
  await expect(row.getByText("Locked")).toBeVisible();
  await row.getByRole("button", { name: /Unlock/ }).click();
  await expect(page.getByText(`Unlocked Lockout ${username}.`)).toBeVisible();
  expect(await apiSignIn({ role: "Nurse", username, password: "temp-pass-2026" })).toBeTruthy();
});

test("the audit log searches by user and action, pages, and exports a CSV", async ({ page }) => {
  await signIn(page, LOGINS.admin);
  await openTab(page, "Audit Log");
  await expect(page.getByRole("heading", { name: "Audit Log", level: 2 })).toBeVisible();

  await page.getByPlaceholder("Name or staff ID").fill("Alex Reyes");
  await page.locator("select").selectOption("LOGIN");
  await page.getByRole("button", { name: "Search" }).click();
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toContainText("Alex Reyes");
  await expect(rows.first()).toContainText("LOGIN");
  await expect(page.getByText(/Page 1 of \d+/)).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export CSV/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^wahter-audit-\d{4}-\d{2}-\d{2}\.csv$/);
  await expect(page.getByText(/export itself is now in the audit log/)).toBeVisible();
});

test("a nurse can't open administration routes (Kong refuses the role)", async () => {
  const nurse = await apiSignIn(LOGINS.nurse);
  const accounts = await api(nurse, "GET", "/access-provider-registry/accounts");
  expect(accounts.status).toBe(403);
  const audit = await api(nurse, "GET", "/audit-log/entries");
  expect(audit.status).toBe(403);
});
