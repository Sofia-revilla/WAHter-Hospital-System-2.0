import { Controller, Get, Header, NotFoundException, Param, Query, ServiceUnavailableException } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Roles, ServiceClient, ServiceUnavailableError } from "@wahter/shared";
import { searchBundle, toFhirEncounter, toFhirPatient, type AdmissionRecord, type PatientRecord } from "./fhir.mapper";

// UC-09 read and search. The data comes live from the owning services; this
// service only reshapes it into FHIR R4.
// TODO(Phase 10): export/import for all six resources, validation, the retry
// queue, and client credentials for external WAH systems (UC-09, US-46).
@ApiTags("fhir r4")
@ApiBearerAuth()
@Controller("fhir")
export class FhirController {
  constructor(private readonly services: ServiceClient) {}

  // A FHIR client gets an OperationOutcome-style 503, not a stack trace
  private async fetch<T>(service: string, path: string) {
    try {
      return await this.services.get<T>(service, path);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw new ServiceUnavailableException({
          resourceType: "OperationOutcome",
          issue: [{ severity: "error", code: "transient", diagnostics: `${error.service} is unavailable` }],
        });
      }
      throw error;
    }
  }

  @Roles("Physician", "Nurse")
  @Header("Content-Type", "application/fhir+json")
  @ApiQuery({ name: "identifier", required: false, description: "MPI number or PhilHealth PIN" })
  @Get("Patient")
  async searchPatients(@Query("identifier") identifier?: string) {
    const query = identifier ? `?identifier=${encodeURIComponent(identifier)}` : "";
    const patients = (await this.fetch<PatientRecord[]>("patient-registry", `/patients${query}`)) ?? [];
    return searchBundle(patients.map(toFhirPatient));
  }

  @Roles("Physician", "Nurse")
  @Header("Content-Type", "application/fhir+json")
  @Get("Patient/:id")
  async readPatient(@Param("id") id: string) {
    const patient = await this.fetch<PatientRecord>("patient-registry", `/patients/${encodeURIComponent(id)}`);
    if (!patient) throw new NotFoundException({ resourceType: "OperationOutcome", issue: [{ code: "not-found" }] });
    return toFhirPatient(patient);
  }

  @Roles("Physician", "Nurse")
  @Header("Content-Type", "application/fhir+json")
  @ApiQuery({ name: "patient", required: false })
  @Get("Encounter")
  async searchEncounters(@Query("patient") patientId?: string) {
    const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
    const admissions = (await this.fetch<AdmissionRecord[]>("patient-flow", `/admissions/history${query}`)) ?? [];
    return searchBundle(admissions.map(toFhirEncounter));
  }
}
