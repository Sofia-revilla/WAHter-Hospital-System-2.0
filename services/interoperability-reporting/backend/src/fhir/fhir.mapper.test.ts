import { describe, expect, it } from "vitest";
import { retryDelaySeconds } from "../exchange/exchange.service";
import { toFhirPatient, validateFhirPatient, type PatientRecord } from "./fhir.mapper";

const patient: PatientRecord = {
  id: "WAH-2026-00100",
  name: "Juan Santos Dela Cruz Jr.",
  givenName: "Juan",
  middleName: "Santos",
  familyName: "Dela Cruz",
  suffix: "Jr.",
  sex: "Male",
  birthDate: "1980-04-12",
  civilStatus: "Married",
  contactNumber: "09171234567",
  address: { street: "123 Rizal St.", barangay: "San Nicolas", municipality: "Concepcion", province: "Tarlac" },
  philhealthPin: "190000000100",
  mergedInto: null,
  merges: [{ sourceId: "WAH-2026-00099", targetId: "WAH-2026-00100" }],
};

describe("FHIR R4 Patient for WAH Systems (UC-01 step 9)", () => {
  const resource = toFhirPatient(patient);

  it("carries the MPI number and the PhilHealth PIN as identifiers", () => {
    expect(resource.identifier.map((identifier) => identifier.value)).toEqual(["WAH-2026-00100", "190000000100"]);
  });

  it("splits the name the FHIR way", () => {
    expect(resource.name[0]).toMatchObject({ family: "Dela Cruz", given: ["Juan", "Santos"], suffix: ["Jr."] });
  });

  it("says which old record a merge replaced", () => {
    expect(resource.link).toEqual([{ other: { reference: "Patient/WAH-2026-00099" }, type: "replaces" }]);
  });

  it("passes validation when complete", () => {
    expect(validateFhirPatient(resource)).toEqual([]);
  });

  it("is refused before sending when the address is missing (UC-09 3a)", () => {
    const problems = validateFhirPatient(toFhirPatient({ ...patient, address: {} }));
    expect(problems).toContain("no municipality or province");
  });
});

describe("retrying when WAH Systems is down (UC-01 9a)", () => {
  it("waits longer each time, up to ten minutes", () => {
    expect(retryDelaySeconds(1)).toBe(15);
    expect(retryDelaySeconds(2)).toBe(30);
    expect(retryDelaySeconds(3)).toBe(60);
    expect(retryDelaySeconds(20)).toBe(600);
  });
});
