import type { StaffRole } from "@/types";

// Applies the Dr./RN prefix the ward staff expect to see on screen. Checks the
// raw name first so someone who typed "Dr. Reyes" doesn't become "Dr. Dr. Reyes".
export function formatDisplayName(rawName: string, role: StaffRole) {
  const name = rawName.trim();
  if (role === "Doctor" && !name.toLowerCase().startsWith("dr.")) return `Dr. ${name}`;
  if (role === "Nurse" && !name.toLowerCase().startsWith("rn ")) return `RN ${name}`;
  return name;
}
