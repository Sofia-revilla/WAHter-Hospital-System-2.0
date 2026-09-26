import { Controller, Get, Header, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Database, Roles } from "@wahter/shared";
import { searchBundle, toFhirEncounter, toFhirPatient, type AdmissionRow, type PatientRow } from "./fhir.mapper";

// UC-14 read and search. Writes and the retry queue for outbound exchange
// with other WAH systems come in Phase 7b.
// TODO(Phase 7b): client-credential tokens for external WAH systems, scoped
// per resource type (UC-14 BR: scope-enforced access).
@ApiTags("fhir r4")
@ApiBearerAuth()
@Controller("fhir")
export class FhirController {
  constructor(private readonly database: Database) {}

  @Roles("Doctor", "Nurse")
  @Header("Content-Type", "application/fhir+json")
  @ApiQuery({ name: "identifier", required: false, description: "MPI number or PhilHealth PIN" })
  @Get("Patient")
  async searchPatients(@Query("identifier") identifier?: string) {
    const rows = await this.database.query<PatientRow>(
      `SELECT * FROM patients
        WHERE ($1::text IS NULL OR id = $1 OR philhealth_pin = $1)
        ORDER BY id`,
      [identifier ?? null],
    );
    return searchBundle(rows.map(toFhirPatient));
  }

  @Roles("Doctor", "Nurse")
  @Header("Content-Type", "application/fhir+json")
  @Get("Patient/:id")
  async readPatient(@Param("id") id: string) {
    const row = await this.database.one<PatientRow>("SELECT * FROM patients WHERE id = $1", [id]);
    if (!row) throw new NotFoundException({ resourceType: "OperationOutcome", issue: [{ code: "not-found" }] });
    return toFhirPatient(row);
  }

  @Roles("Doctor", "Nurse")
  @Header("Content-Type", "application/fhir+json")
  @ApiQuery({ name: "patient", required: false })
  @Get("Encounter")
  async searchEncounters(@Query("patient") patientId?: string) {
    const rows = await this.database.query<AdmissionRow>(
      `SELECT * FROM admissions WHERE ($1::text IS NULL OR patient_id = $1) ORDER BY admitted_at DESC`,
      [patientId ?? null],
    );
    return searchBundle(rows.map(toFhirEncounter));
  }
}
