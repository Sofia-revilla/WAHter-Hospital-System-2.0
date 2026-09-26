import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "@wahter/shared";
import { PatientsRepository, type CensusRow } from "./patients.repository";

function ageOn(birthDate: Date, today = new Date()) {
  let age = today.getFullYear() - birthDate.getFullYear();
  const hadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

// Same shape as the web app's Patient type, so the dashboard and patient list
// don't need a mapping layer
function toCensusEntry(row: CensusRow) {
  return {
    id: row.id,
    name: row.name,
    age: ageOn(row.birth_date),
    gender: row.sex,
    department: row.department,
    status: row.condition,
    mewsScore: row.latest_mews ?? 0,
    admittedAt: row.admitted_at.toISOString(),
    // TODO(Phase 8): serve avatars locally instead of sending names to dicebear.com
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.name)}`,
  };
}

@ApiTags("census")
@ApiBearerAuth()
@Controller("patients")
export class PatientsController {
  constructor(private readonly patients: PatientsRepository) {}

  @Roles("Doctor", "Nurse")
  @Get()
  async census() {
    return (await this.patients.census()).map(toCensusEntry);
  }
}
