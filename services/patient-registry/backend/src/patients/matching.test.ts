import { describe, expect, it } from "vitest";
import { findMatches, nameSimilarity, parseSearch, type IdentityFields } from "./matching";

const juan: IdentityFields = {
  id: "WAH-2026-00100",
  givenName: "Juan",
  familyName: "Dela Cruz",
  sex: "Male",
  birthDate: "1980-04-12",
  philhealthPin: "190000000100",
};

describe("MPI matching (UC-01 step 6, extension 6a)", () => {
  it("the same PhilHealth PIN is a sure match, whatever the name", () => {
    const [match] = findMatches({ ...juan, id: undefined, givenName: "Pedro", familyName: "Penduko" }, [juan]);
    expect(match.certainty).toBe("Sure");
    expect(match.reason).toBe("Same PhilHealth PIN");
  });

  it("a small spelling difference with the same birth date is a possible match", () => {
    const [match] = findMatches(
      { givenName: "Juan", familyName: "Dela Kruz", sex: "Male", birthDate: "1980-04-12" },
      [juan],
    );
    expect(match.certainty).toBe("Possible");
    expect(match.reason).toMatch(/Same birth date, similar name/);
  });

  it("notes when the possible match was recorded with a different sex", () => {
    const [match] = findMatches({ givenName: "Juan", familyName: "Dela Cruz", sex: "Female", birthDate: "1980-04-12" }, [juan]);
    expect(match.reason).toMatch(/different sex/);
  });

  it("the exact same name with another birth date is still worth a look", () => {
    const [match] = findMatches({ givenName: "Juan", familyName: "Dela Cruz", sex: "Male", birthDate: "1980-12-04" }, [juan]);
    expect(match.reason).toBe("Same name, different birth date");
  });

  it("someone else born the same day isn't a match", () => {
    expect(findMatches({ givenName: "Maria", familyName: "Santos", sex: "Female", birthDate: "1980-04-12" }, [juan])).toHaveLength(0);
  });

  it("a record never matches itself (editing it)", () => {
    expect(findMatches(juan, [juan])).toHaveLength(0);
  });

  it("ignores case, accents, and punctuation in names", () => {
    expect(nameSimilarity("José Dela-Cruz", "jose dela cruz")).toBe(1);
  });
});

describe("what the search box means (US-2)", () => {
  it("reads MPI numbers, PINs, dates, and names", () => {
    expect(parseSearch("wah-2026-00001")).toEqual({ kind: "mpi", value: "WAH-2026-00001" });
    expect(parseSearch("19-000000001-0")).toEqual({ kind: "pin", value: "190000000010" });
    expect(parseSearch("1980-04-12")).toEqual({ kind: "birthDate", value: "1980-04-12" });
    expect(parseSearch("dela cruz")).toEqual({ kind: "name", value: "dela cruz" });
  });
});
