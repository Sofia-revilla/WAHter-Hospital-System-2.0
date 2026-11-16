import type { Ward } from "@/types";

export function wardLabel(ward: Pick<Ward, "name" | "type">) {
  // two wards are both "General Ward", so the type is part of the label
  return ward.type === "Specialized" || ward.type === "Children"
    ? ward.name
    : `${ward.name} (${ward.type})`;
}
