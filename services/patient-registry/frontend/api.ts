import { apiGet } from "@/lib/api";

// Calls to the Patient Registry (services/patient-registry/backend). Every
// other service only holds patient IDs; this is where they become names.

export interface PatientIdentity {
  id: string;
  name: string;
  sex: "Male" | "Female";
  birthDate: string;
  philhealthPin: string | null;
}

// IDs go in the query string, so we split very long lists to keep URLs short
const IDS_PER_REQUEST = 100;

export async function fetchPatientsByIds(ids: string[]) {
  const unique = [...new Set(ids)];
  const batches: string[][] = [];
  for (let start = 0; start < unique.length; start += IDS_PER_REQUEST) {
    batches.push(unique.slice(start, start + IDS_PER_REQUEST));
  }
  const results = await Promise.all(
    batches.map((batch) =>
      apiGet<PatientIdentity[]>("patient-registry", `/patients?ids=${batch.map(encodeURIComponent).join(",")}`),
    ),
  );
  return results.flat();
}
