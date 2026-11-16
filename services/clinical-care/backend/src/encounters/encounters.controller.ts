import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "@wahter/shared";
import { EncountersRepository, type EncounterRow } from "./encounters.repository";

// The clinical half of a census row. The web app adds the name, age, and
// sex from the Patient Registry by patientId.
function toCensusEntry(row: EncounterRow) {
  return {
    patientId: row.patient_id,
    encounterId: row.id,
    department: row.department,
    status: row.condition,
    mewsScore: row.latest_mews ?? 0,
    admittedAt: row.admitted_at.toISOString(),
  };
}

@ApiTags("encounters")
@ApiBearerAuth()
@Controller("encounters")
export class EncountersController {
  constructor(private readonly encounters: EncountersRepository) {}

  @Roles("Physician", "Nurse", "System")
  @Get("open")
  async census() {
    return (await this.encounters.findOpen()).map(toCensusEntry);
  }
}
