// MPI matching (UC-01 step 6, extension 6a). Plain functions so the rules
// can be unit tested without a database.
//
// A sure match (the same PhilHealth PIN) can't be overridden: that person
// already has a record. A possible match (same birth date and a similar name,
// or the same name with a different birth date, which is usually a typo) is
// shown to the clerk, who picks the existing record, confirms a new person,
// or flags it for the System Administrator.

// Two names this close (after lowercasing and dropping punctuation) count as
// similar: "Jon Garcia" vs "John Garcia" does, "Ma. Santos" vs "Maria Santos"
// doesn't. Tune with real CDH data later.
export const NAME_SIMILARITY_THRESHOLD = 0.8;

export interface IdentityFields {
  id?: string;
  givenName: string;
  familyName: string;
  sex: "Male" | "Female";
  birthDate: string;
  philhealthPin?: string | null;
}

export interface Match<T extends IdentityFields> {
  patient: T;
  score: number;
  certainty: "Sure" | "Possible";
  reason: string;
}

export function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

export function nameSimilarity(a: string, b: string) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - levenshtein(left, right) / longest;
}

export function fullName(person: Pick<IdentityFields, "givenName" | "familyName">) {
  return `${person.givenName} ${person.familyName}`;
}

export function findMatches<T extends IdentityFields>(incoming: IdentityFields, existing: T[]): Match<T>[] {
  const matches: Match<T>[] = [];
  for (const patient of existing) {
    if (incoming.id && patient.id === incoming.id) continue;
    if (incoming.philhealthPin && patient.philhealthPin === incoming.philhealthPin) {
      matches.push({ patient, score: 1, certainty: "Sure", reason: "Same PhilHealth PIN" });
      continue;
    }
    const similarity = nameSimilarity(fullName(patient), fullName(incoming));
    if (similarity < NAME_SIMILARITY_THRESHOLD) continue;
    const score = Math.round(similarity * 100) / 100;
    if (patient.birthDate === incoming.birthDate) {
      const sexNote = patient.sex === incoming.sex ? "" : " (recorded with a different sex)";
      matches.push({ patient, score, certainty: "Possible", reason: `Same birth date, similar name${sexNote}` });
    } else if (similarity === 1) {
      matches.push({ patient, score: 0.9, certainty: "Possible", reason: "Same name, different birth date" });
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}

// What the search box means (US-2): an MPI number, a PhilHealth PIN, a
// birth date, or otherwise part of a name
export type SearchTerm =
  | { kind: "mpi"; value: string }
  | { kind: "pin"; value: string }
  | { kind: "birthDate"; value: string }
  | { kind: "name"; value: string };

export function parseSearch(raw: string): SearchTerm {
  const value = raw.trim();
  if (/^WAH-\d{4}-\d{5}$/i.test(value)) return { kind: "mpi", value: value.toUpperCase() };
  const digits = value.replace(/[\s-]/g, "");
  if (/^\d{12}$/.test(digits)) return { kind: "pin", value: digits };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { kind: "birthDate", value };
  return { kind: "name", value };
}
