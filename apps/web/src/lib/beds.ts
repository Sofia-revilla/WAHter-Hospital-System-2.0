import type { Ward } from "@/types";

// "W-003" + index 4 → "W003-05". Short enough for the bed grid tooltips and
// the patients table, and unique across wards.
export function bedLabel(ward: Pick<Ward, "id">, bedIndex: number) {
  return `${ward.id.replace("-", "")}-${String(bedIndex + 1).padStart(2, "0")}`;
}

export function wardLabel(ward: Pick<Ward, "name" | "type">) {
  // two wards are both "General Ward", so the type is part of the label
  return ward.type === "Specialized" || ward.type === "Children"
    ? ward.name
    : `${ward.name} (${ward.type})`;
}
