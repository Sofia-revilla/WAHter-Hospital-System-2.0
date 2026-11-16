// UC-02 Admit Patient and Assign Bed (US-6 to US-9, US-44): the bed board,
// admission with field checks, the taken-bed alternatives (6a/6b), the
// nurse's transfer, scheduling and the queue, and the admin's ward setup.
// Runs against the local Docker stack.

import { expect, test, type Page } from "@playwright/test";
import { LOGINS, api, apiSignIn, openTab, signIn, uniqueName } from "./helpers";

const CLERK = { role: "AdmittingClerk", portal: "Admitting Portal", username: "jpascual", password: "clerk2026" };

interface BoardBed {
  id: string;
  code: string;
  status: string;
}
interface BoardWard {
  rooms: { beds: BoardBed[] }[];
}

let clerkToken = "";
let physicianId = "";

test.beforeAll(async () => {
  clerkToken = await apiSignIn(CLERK);
  const providers = await api<{ id: string; role: string }[]>(clerkToken, "GET", "/access-provider-registry/providers");
  physicianId = providers.body.find((provider) => provider.role === "Physician")!.id;
});

async function registerPatient(given: string) {
  const created = await api<{ id: string }>(clerkToken, "POST", "/patient-registry/patients", {
    givenName: given,
    familyName: "Villanueva",
    sex: "Male",
    birthDate: "1966-02-11",
    address: { barangay: "Cristo Rey", municipality: "Capas", province: "Tarlac" },
    decision: "ConfirmedNew",
  });
  expect(created.status).toBe(201);
  return created.body.id;
}

async function freeBeds() {
  const board = await api<BoardWard[]>(clerkToken, "GET", "/patient-flow/bed-board");
  return board.body.flatMap((ward) => ward.rooms.flatMap((room) => room.beds.filter((bed) => bed.status === "Available")));
}

async function admitByApi(patientId: string, bedId: string) {
  return api<{ admissionId: string; bedCode: string }>(clerkToken, "POST", "/patient-flow/admissions", {
    patientId,
    attendingPhysicianId: physicianId,
    bedId,
    admissionType: "Direct admit",
    admittingDiagnosis: "Dengue fever",
  });
}

async function pickPatient(page: Page, patientId: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Search the patient registry").fill(patientId);
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await dialog.getByRole("cell", { name: new RegExp(patientId) }).click();
}

test("the clerk sees the bed board by ward and room (US-9)", async ({ page }) => {
  await signIn(page, CLERK);
  await openTab(page, "Bed Management");
  await expect(page.getByRole("heading", { name: "Bed Board", level: 2 })).toBeVisible();
  await expect(page.getByText("Total Beds")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Bed .+, Occupied, / }).first()).toBeVisible();
});

test("missing admission details are marked before anything is sent (UC-02 8a)", async ({ page }) => {
  await signIn(page, CLERK);
  await openTab(page, "Bed Management");
  await page.getByRole("button", { name: "Admit Patient" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Admit", exact: true }).click();
  await expect(page.getByText("Some admission details are missing")).toBeVisible();
  for (const message of ["Pick the patient", "Pick the attending physician", "Pick a bed", "Write the admitting diagnosis"]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
});

test("the clerk admits a registered patient into a free bed (UC-02)", async ({ page }) => {
  const patientId = await registerPatient(uniqueName("Ramon"));
  await signIn(page, CLERK);
  await openTab(page, "Bed Management");
  await page.getByRole("button", { name: "Admit Patient" }).click();
  await pickPatient(page, patientId);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Bed/).selectOption({ index: 1 });
  await dialog.getByLabel("Attending physician").selectOption(physicianId);
  await dialog.getByPlaceholder("e.g. Community-acquired pneumonia").fill("Acute gastroenteritis");
  await dialog.getByRole("button", { name: "Admit", exact: true }).click();
  await expect(page.getByText(/Admitted .+ to bed .+ \(ADM-\d+\)\./)).toBeVisible();
});

test("a bed taken by someone else offers free ones instead (UC-02 6b)", async ({ page }) => {
  const mine = await registerPatient(uniqueName("Lito"));
  const theirs = await registerPatient(uniqueName("Pepe"));
  const [target] = await freeBeds();
  await signIn(page, CLERK);
  await openTab(page, "Bed Management");
  await page.getByRole("button", { name: `Bed ${target.code}, Available` }).click();
  await pickPatient(page, mine);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Attending physician").selectOption(physicianId);
  await dialog.getByPlaceholder("e.g. Community-acquired pneumonia").fill("Hypertensive urgency");
  // another user takes that bed while the form is open
  expect((await admitByApi(theirs, target.id)).status).toBe(201);
  await dialog.getByRole("button", { name: "Admit", exact: true }).click();
  await expect(dialog.getByText("Free beds that fit instead:")).toBeVisible();
  await dialog.getByRole("button", { name: /·/ }).first().click();
  await dialog.getByRole("button", { name: "Admit", exact: true }).click();
  await expect(page.getByText(/Admitted .+ to bed /)).toBeVisible();
});

test("the nurse transfers a patient to another bed with a reason (US-8)", async ({ page }) => {
  const given = uniqueName("Tonyo");
  const patientId = await registerPatient(given);
  const [first] = await freeBeds();
  expect((await admitByApi(patientId, first.id)).status).toBe(201);
  await signIn(page, LOGINS.nurse);
  await openTab(page, "Bed Management");
  await page.getByRole("button", { name: new RegExp(`^Bed ${first.code}, Occupied, ${given}`) }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("New bed").selectOption({ index: 1 });
  await dialog.getByLabel("Reason").fill("Needs isolation");
  await dialog.getByRole("button", { name: "Transfer", exact: true }).click();
  await expect(page.getByText(new RegExp(`Moved ${given} Villanueva from ${first.code} to `))).toBeVisible();
  await expect(page.getByRole("button", { name: `Bed ${first.code}, Available` })).toBeVisible({ timeout: 15_000 });
});

test("the physician's bed board is view only", async ({ page }) => {
  await signIn(page, LOGINS.physician);
  await openTab(page, "Bed Management");
  await expect(page.getByText("View only.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Admit Patient" })).toHaveCount(0);
});

test("the clerk books a free slot, checks the patient in, and sees the queue", async ({ page }) => {
  const patientId = await registerPatient(uniqueName("Berto"));
  await signIn(page, CLERK);
  await openTab(page, "Scheduling and Queue");
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await pickPatient(page, patientId);
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Physician").selectOption(physicianId);
  // the next day that isn't a Sunday, so there are always free times
  const day = new Date(Date.now() + 8 * 3_600_000 + 86_400_000);
  if (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);
  await dialog.getByLabel("Day").fill(day.toISOString().slice(0, 10));
  await dialog.getByRole("button", { name: /^\d{2}:\d{2}/ }).first().click();
  await dialog.getByPlaceholder("e.g. Elective admission for cholecystectomy").fill("Elective hernia repair");
  await dialog.getByRole("button", { name: "Book", exact: true }).click();
  await expect(page.getByText(/Booked .+ \(APT-\d+\)\./)).toBeVisible();
  await page.getByRole("button", { name: "Check in" }).first().click();
  await expect(page.getByText(/Checked in\. Queue number \d+\./)).toBeVisible();
});

test("the System Administrator sets up wards and takes a bed out (US-44)", async ({ page }) => {
  await signIn(page, LOGINS.admin);
  await openTab(page, "Wards, Rooms and Beds");
  await expect(page.getByRole("heading", { name: "Wards, Rooms and Beds", level: 2 })).toBeVisible();
  // no patient names on the admin's layout (RA 10173)
  await expect(page.getByRole("button", { name: "Bed Management" })).toHaveCount(0);
  await page.getByRole("button", { name: /Available$/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Set to").selectOption("Maintenance");
  await dialog.getByLabel("Reason").fill("Broken bed rail");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/is now Maintenance\./)).toBeVisible();
});
