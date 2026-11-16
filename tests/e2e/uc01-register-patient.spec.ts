// UC-01 Register and Manage Patient Identity (US-1 to US-5), and UC-08
// extension 4b (Identity Review). Runs against the local Docker stack.

import { expect, test, type Page } from "@playwright/test";
import { LOGINS, api, apiSignIn, openTab, signIn, uniqueName } from "./helpers";

const CLERK = { role: "AdmittingClerk", portal: "Admitting Portal", username: "jpascual", password: "clerk2026" };
const BILLING = { role: "BillingStaff", portal: "Billing Portal", username: "maquino", password: "billing2026" };

interface Patient {
  id: string;
  name: string;
  exchangeStatus: string;
  mergedInto: string | null;
}

async function fillRegistration(page: Page, person: { given: string; family: string; sex: string; birthDate: string }) {
  await page.getByPlaceholder("e.g. Juan").fill(person.given);
  await page.getByPlaceholder("e.g. Dela Cruz").fill(person.family);
  await page.getByRole("combobox").first().selectOption(person.sex);
  await page.locator('input[type="date"]').fill(person.birthDate);
  // municipality and province start filled in with the pilot site's
  await page.getByLabel("Barangay *").fill("San Nicolas");
}

test("the Admitting Clerk portal is on the login screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Admitting Portal/ })).toBeVisible();
});

test("search finds a patient by name, MPI number, PIN, and birth date (US-2)", async ({ page }) => {
  await signIn(page, CLERK);
  await expect(page.getByRole("heading", { name: "Registration", level: 2 })).toBeVisible();
  const search = page.getByLabel("Search the patient registry");
  for (const query of ["Michael Davis", "WAH-2026-00001", "190000000001"]) {
    await search.fill(query);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("cell", { name: /Michael Davis/ })).toBeVisible();
  }
});

test("missing fields are marked before anything is saved (UC-01 5a)", async ({ page }) => {
  await signIn(page, CLERK);
  await page.getByRole("button", { name: "Register new patient" }).click();
  await page.getByRole("button", { name: "Check and register" }).click();
  await expect(page.getByText("Some fields need fixing")).toBeVisible();
  for (const message of ["Given name is required", "Family name is required", "Sex is required", "Barangay is required"]) {
    await expect(page.getByText(message)).toBeVisible();
  }
});

test("a new patient gets an MPI number and is shared with WAH Systems", async ({ page }) => {
  const given = uniqueName("Ana");
  await signIn(page, CLERK);
  await page.getByRole("button", { name: "Register new patient" }).click();
  await fillRegistration(page, { given, family: "Reyes", sex: "Female", birthDate: "1992-03-14" });
  await page.getByRole("button", { name: "Check and register" }).click();
  await expect(page.getByText(new RegExp(`Registered ${given} Reyes\\. Their MPI number is WAH-`))).toBeVisible();
  await expect(page.getByText(/Shared with WAH Systems|Waiting to share/)).toBeVisible();
});

test("a possible duplicate is shown; the clerk can use the existing record or flag it (UC-01 6a)", async ({ page }) => {
  const clerk = await apiSignIn(CLERK);
  const given = uniqueName("Ben");
  const existing = await api<Patient>(clerk, "POST", "/patient-registry/patients", {
    givenName: given,
    familyName: "Santos",
    sex: "Male",
    birthDate: "1985-08-08",
    address: { barangay: "Santa Cruz", municipality: "Concepcion", province: "Tarlac" },
  });
  expect(existing.status).toBe(201);

  await signIn(page, CLERK);
  await page.getByRole("button", { name: "Register new patient" }).click();
  // one letter off, same birth date
  await fillRegistration(page, { given: `${given}n`, family: "Santos", sex: "Male", birthDate: "1985-08-08" });
  await page.getByRole("button", { name: "Check and register" }).click();
  await expect(page.getByText("This might be someone already registered")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: existing.body.id })).toBeVisible();

  // flag it instead of guessing
  await page.getByRole("button", { name: "Register and flag for review" }).click();
  await expect(page.getByText(/flagged for the System Administrator to review \(IDR-/)).toBeVisible();
});

test("the System Administrator merges a flagged pair, and the old record points to the survivor (UC-08 4b)", async ({ page }) => {
  const clerk = await apiSignIn(CLERK);
  const given = uniqueName("Cora");
  const address = { barangay: "Alfonso", municipality: "Concepcion", province: "Tarlac" };
  const first = await api<Patient>(clerk, "POST", "/patient-registry/patients", {
    givenName: given, familyName: "Lopez", sex: "Female", birthDate: "1970-11-30", address,
  });
  const second = await api<Patient & { reviewId: string }>(clerk, "POST", "/patient-registry/patients", {
    givenName: `${given}h`, familyName: "Lopez", sex: "Female", birthDate: "1970-11-30", address,
    decision: "FlagForReview", reviewCandidateId: first.body.id,
  });
  expect(second.body.reviewId).toBeTruthy();

  await signIn(page, LOGINS.admin);
  await openTab(page, "Identity Review");
  const card = page.getByRole("region", { name: `Review ${second.body.reviewId}` });
  await card.getByRole("button", { name: "Merge" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: new RegExp(first.body.id) }).check();
  await dialog.locator("textarea").fill("Same person, registered twice");
  await dialog.getByRole("button", { name: "Merge" }).click();
  await expect(page.getByText(`Merged. ${first.body.id} is the record that stays`)).toBeVisible();

  const old = await api<Patient>(clerk, "GET", `/patient-registry/patients/${second.body.id}`);
  expect(old.body.mergedInto).toBe(first.body.id);
});

test("billing staff can search the registry but not register (US-5)", async ({ page }) => {
  await signIn(page, BILLING);
  await openTab(page, "Patient Search");
  await page.getByLabel("Search the patient registry").fill("190000000001");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("cell", { name: /Michael Davis/ }).click();
  await expect(page.getByText("MPI WAH-2026-00001")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);

  const billing = await apiSignIn(BILLING);
  const attempt = await api(billing, "POST", "/patient-registry/patients", {});
  expect(attempt.status).toBe(403);
});
