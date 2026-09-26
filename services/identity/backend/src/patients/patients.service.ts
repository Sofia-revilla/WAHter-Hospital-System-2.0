import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { PatientsRepository, type PatientRow } from "./patients.repository";
import type { MatchPatientDto, RegisterPatientDto } from "./patients.dto";

// Two names this close (after lowercasing and dropping punctuation) count as
// a possible duplicate, e.g. "Ma. Santos" vs "Maria Santos" doesn't, but
// "Jon Garcia" vs "John Garcia" does. Tune with real CDH data later.
const NAME_SIMILARITY_THRESHOLD = 0.8;

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
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

function nameSimilarity(a: string, b: string) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  const longest = Math.max(left.length, right.length);
  return longest === 0 ? 1 : 1 - levenshtein(left, right) / longest;
}

export function toPatientDto(row: PatientRow) {
  return {
    id: row.id,
    name: row.name,
    sex: row.sex,
    birthDate: row.birth_date.toISOString().slice(0, 10),
    philhealthPin: row.philhealth_pin,
  };
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly patients: PatientsRepository,
    private readonly bus: EventBus,
  ) {}

  async list() {
    return (await this.patients.findAll()).map(toPatientDto);
  }

  async get(id: string) {
    const row = await this.patients.findById(id);
    if (!row) throw new NotFoundException(`No patient ${id}`);
    return toPatientDto(row);
  }

  // MPI matching (UC-01 step 3): an exact PhilHealth PIN is a sure match;
  // otherwise same sex + birth date + a similar name is a possible one.
  async match({ name, sex, birthDate, philhealthPin }: MatchPatientDto) {
    if (philhealthPin) {
      const byPin = await this.patients.findByPin(philhealthPin);
      if (byPin) return [{ patient: toPatientDto(byPin), score: 1, reason: "Same PhilHealth PIN" }];
    }
    const candidates = await this.patients.findBySexAndBirthDate(sex, birthDate);
    return candidates
      .map((row) => ({ row, score: nameSimilarity(row.name, name) }))
      .filter((candidate) => candidate.score >= NAME_SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .map(({ row, score }) => ({
        patient: toPatientDto(row),
        score: Math.round(score * 100) / 100,
        reason: "Same sex and birth date, similar name",
      }));
  }

  async register(body: RegisterPatientDto, actor: AuthUser) {
    const matches = await this.match(body);
    const hasSurePinMatch = matches.some((candidate) => candidate.score === 1 && body.philhealthPin);
    // a PIN match is never overridable: that person already has an MPI record
    if (hasSurePinMatch || (matches.length > 0 && !body.confirmedNotDuplicate)) {
      throw new ConflictException({ message: "Possible duplicate patient", matches });
    }

    const row = await this.patients.create({
      name: body.name.trim(),
      sex: body.sex,
      birthDate: body.birthDate,
      philhealthPin: body.philhealthPin ?? null,
    });
    const patient = toPatientDto(row!);
    this.bus.publish(EVENT_TYPES.patientRegistered, { ...patient, patientId: patient.id }, actor);
    return patient;
  }
}
