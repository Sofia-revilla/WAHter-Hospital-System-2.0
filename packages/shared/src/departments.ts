// The hospital's clinical departments, in one place: ward setup, scheduling,
// the census, and the dashboard risk chart all use this list, so they can't
// disagree. Pure data, so the web app imports it too ("@wahter/shared/departments").
export const DEPARTMENTS = ["Internal Medicine", "Pediatrics", "Surgical Suite", "ICU", "ER"] as const;

export type Department = (typeof DEPARTMENTS)[number];
