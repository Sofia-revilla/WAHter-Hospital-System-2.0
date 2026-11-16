import { NotFoundException } from "@nestjs/common";
import { ServiceClient, ServiceUnavailableError } from "./service-client";

// For orders (prescriptions, lab requests): refuse an ID the Patient Registry
// says doesn't exist. If the registry itself is down, let the order through:
// staff are ordering from a census that already came from the registry, and
// objective 2 says one service being down mustn't stop another.
// Admission is stricter and checks on its own (UC-02 includes UC-01).
export async function requireKnownPatient(services: ServiceClient, patientId: string) {
  try {
    const patient = await services.get("patient-registry", `/patients/${encodeURIComponent(patientId)}`);
    if (!patient) throw new NotFoundException(`No patient ${patientId} in the Patient Registry`);
  } catch (error) {
    if (!(error instanceof ServiceUnavailableError)) throw error;
  }
}
