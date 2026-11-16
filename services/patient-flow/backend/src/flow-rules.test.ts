import { describe, expect, it } from "vitest";
import { alternativeBeds, freeSlots, isSlotStart, type FreeBed } from "./flow-rules";

// 2026-11-18 is a Wednesday; "now" is the night before so every slot is ahead
const BEFORE = new Date("2026-11-17T12:00:00Z");

describe("freeSlots", () => {
  it("offers 08:00 to 16:30 Manila in 30-minute steps", () => {
    const slots = freeSlots("2026-11-18", [], BEFORE);
    expect(slots).toHaveLength(18);
    expect(slots[0]).toBe("2026-11-18T00:00:00.000Z");
    expect(slots.at(-1)).toBe("2026-11-18T08:30:00.000Z");
  });

  it("leaves out taken slots", () => {
    const slots = freeSlots("2026-11-18", ["2026-11-18T08:00:00+08:00"], BEFORE);
    expect(slots).toHaveLength(17);
    expect(slots).not.toContain("2026-11-18T00:00:00.000Z");
  });

  it("leaves out slots already past", () => {
    const slots = freeSlots("2026-11-18", [], new Date("2026-11-18T12:10:00+08:00"));
    expect(slots[0]).toBe("2026-11-18T04:30:00.000Z");
  });

  it("has nothing on Sunday or for a bad date", () => {
    expect(freeSlots("2026-11-22", [], BEFORE)).toEqual([]);
    expect(freeSlots("not-a-date", [], BEFORE)).toEqual([]);
  });
});

describe("isSlotStart", () => {
  it("accepts a slot start inside the hours", () => {
    expect(isSlotStart("2026-11-18T08:00:00+08:00")).toBe(true);
    expect(isSlotStart("2026-11-18T16:30:00+08:00")).toBe(true);
  });

  it("rejects off-grid, out-of-hours, Sunday, and garbage", () => {
    expect(isSlotStart("2026-11-18T08:15:00+08:00")).toBe(false);
    expect(isSlotStart("2026-11-18T17:00:00+08:00")).toBe(false);
    expect(isSlotStart("2026-11-18T07:30:00+08:00")).toBe(false);
    expect(isSlotStart("2026-11-22T09:00:00+08:00")).toBe(false);
    expect(isSlotStart("nope")).toBe(false);
  });
});

describe("alternativeBeds", () => {
  const bed = (bedId: string, wardId: string, department: string, wardType: string): FreeBed => ({
    bedId,
    code: bedId,
    roomCode: "Room 1",
    wardId,
    wardName: wardId,
    wardType,
    department,
  });
  const free = [
    bed("C-1", "W-3", "Pediatrics", "Children"),
    bed("B-1", "W-2", "Internal Medicine", "Female"),
    bed("A-2", "W-1", "Internal Medicine", "Male"),
    bed("D-1", "W-4", "Surgery", "Male"),
  ];

  it("ranks same ward, then same department, then same ward type", () => {
    const picks = alternativeBeds(free, { wardId: "W-1", department: "Internal Medicine", wardType: "Male" });
    expect(picks.map((item) => item.bedId)).toEqual(["A-2", "B-1", "D-1"]);
  });

  it("drops beds that fit in no way and respects the limit", () => {
    expect(alternativeBeds(free, { wardId: "W-9", department: "Obstetrics", wardType: "Isolation" })).toEqual([]);
    expect(alternativeBeds(free, { wardId: "W-1", department: "Internal Medicine", wardType: "Male" }, 1)).toHaveLength(1);
  });
});
