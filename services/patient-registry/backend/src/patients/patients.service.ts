import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Database, EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { findMatches, parseSearch, type IdentityFields } from "./matching";
import { PatientsRepository, type PatientRow } from "./patients.repository";
import type { PatientDemographicsDto, RegisterPatientDto, ReportDuplicateDto, UpdatePatientDto } from "./patients.dto";

// Postgres error code for a unique index violation
const UNIQUE_VIOLATION = "23505";

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

// What every caller gets. Other services and most screens only use id, name,
// sex, and birthDate; the registration screens use the rest.
export function toPatientDto(row: PatientRow) {
  return {
    id: row.id,
    name: row.name,
    givenName: row.given_name,
    middleName: row.middle_name,
    familyName: row.family_name,
    suffix: row.suffix,
    sex: row.sex,
    birthDate: isoDate(row.birth_date),
    civilStatus: row.civil_status,
    contactNumber: row.contact_number,
    address: row.address,
    philhealthPin: row.philhealth_pin,
    mergedInto: row.merged_into,
    exchangeStatus: row.exchange_status,
    exchangeError: row.exchange_error,
    registeredAt: row.created_at.toISOString(),
  };
}

function identityOf(row: PatientRow): IdentityFields & { row: PatientRow } {
  return {
    id: row.id,
    givenName: row.given_name,
    familyName: row.family_name,
    sex: row.sex,
    birthDate: isoDate(row.birth_date),
    philhealthPin: row.philhealth_pin,
    row,
  };
}

function cleaned(body: PatientDemographicsDto) {
  const optional = (value: string | undefined) => value?.trim() || null;
  return {
    givenName: body.givenName.trim(),
    middleName: optional(body.middleName),
    familyName: body.familyName.trim(),
    suffix: optional(body.suffix),
    sex: body.sex,
    birthDate: body.birthDate,
    civilStatus: body.civilStatus ?? null,
    contactNumber: optional(body.contactNumber),
    address: {
      street: body.address.street?.trim() || undefined,
      barangay: body.address.barangay.trim(),
      municipality: body.address.municipality.trim(),
      province: body.address.province.trim(),
    },
    philhealthPin: body.philhealthPin ?? null,
  };
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly patients: PatientsRepository,
    private readonly database: Database,
    private readonly bus: EventBus,
  ) {}

  async list(filter: { ids?: string[]; identifier?: string }) {
    const rows = filter.ids
      ? await this.patients.findByIds(filter.ids)
      : filter.identifier
        ? await this.patients.findByIdentifier(filter.identifier)
        : await this.patients.findAll();
    return rows.map(toPatientDto);
  }

  // US-2 and US-5: by MPI number, PhilHealth PIN, birth date, or name
  async search(query: string) {
    if (query.trim().length < 2) throw new BadRequestException("Type at least two characters to search.");
    return (await this.patients.search(parseSearch(query))).map(toPatientDto);
  }

  // The profile: the record plus its merge history (UC-01 "track merges")
  async get(id: string) {
    const row = await this.patients.findById(id);
    if (!row) throw new NotFoundException(`No patient ${id}`);
    const merges = await this.patients.mergesInvolving(id);
    return {
      ...toPatientDto(row),
      merges: merges.map((merge) => ({
        sourceId: merge.source_id,
        targetId: merge.target_id,
        reason: merge.reason,
        mergedById: merge.merged_by_id,
        mergedAt: merge.merged_at.toISOString(),
      })),
    };
  }

  // UC-01 step 6
  async match(body: PatientDemographicsDto) {
    const incoming = cleaned(body);
    const candidates = await this.patients.findMatchCandidates(incoming);
    return findMatches(incoming, candidates.map(identityOf)).map((match) => ({
      patient: toPatientDto(match.patient.row),
      score: match.score,
      certainty: match.certainty,
      reason: match.reason,
    }));
  }

  // UC-01 steps 4 to 11
  async register(body: RegisterPatientDto, actor: AuthUser) {
    const incoming = cleaned(body);
    const matches = await this.match(body);
    const sure = matches.find((match) => match.certainty === "Sure");
    // a PIN match is never overridable: that person already has an MPI record
    if (sure) {
      throw new ConflictException({
        message: `This PhilHealth PIN already belongs to ${sure.patient.name} (${sure.patient.id}). Use that record.`,
        matches,
        canOverride: false,
      });
    }
    if (matches.length > 0 && !body.decision) {
      throw new ConflictException({ message: "Possible duplicate patient", matches, canOverride: true });
    }
    if (body.decision === "FlagForReview") {
      if (!body.reviewCandidateId || !matches.some((match) => match.patient.id === body.reviewCandidateId)) {
        throw new BadRequestException("Pick which of the possible matches this might be.");
      }
    }

    let created: PatientRow;
    let reviewId: string | null = null;
    try {
      ({ created, reviewId } = await this.database.transaction(async (client) => {
        const row = await this.patients.create(client, { ...incoming, createdById: actor.id });
        if (body.decision !== "FlagForReview") return { created: row, reviewId: null };
        const review = await client.query<{ id: string }>(
          `INSERT INTO identity_reviews (id, patient_id, candidate_id, reason, reported_by_id)
           VALUES ('IDR-' || lpad(nextval('identity_review_number')::text, 4, '0'), $1, $2, $3, $4)
           RETURNING id`,
          [row.id, body.reviewCandidateId, "Flagged at registration: couldn't tell if this is the same person", actor.id],
        );
        return { created: row, reviewId: review.rows[0].id };
      }));
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException("That PhilHealth PIN is already on another record.");
      }
      throw error;
    }

    // just the ID: other services look the rest up here instead of copying it
    this.bus.publish(EVENT_TYPES.patientRegistered, { patientId: created.id }, actor);
    if (reviewId) {
      this.bus.publish(
        EVENT_TYPES.identityReviewFlagged,
        { reviewId, patientId: created.id, candidateId: body.reviewCandidateId! },
        actor,
      );
    }
    return { ...toPatientDto(created), reviewId };
  }

  // UC-01 3a: update permitted demographic information
  async update(id: string, body: UpdatePatientDto, actor: AuthUser) {
    const existing = await this.patients.findById(id);
    if (!existing) throw new NotFoundException(`No patient ${id}`);
    if (existing.merged_into) {
      throw new ConflictException(`This record was merged into ${existing.merged_into}. Update that one.`);
    }
    const fields = Object.entries(body)
      .filter(([, value]) => value !== undefined)
      .map(([field]) => field);
    let updated: PatientRow | null;
    try {
      updated = await this.patients.update(id, body as Record<string, unknown>);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException("That PhilHealth PIN is already on another record.");
      }
      throw error;
    }
    if (!updated) throw new NotFoundException(`No patient ${id}`);
    if (fields.length > 0) this.bus.publish(EVENT_TYPES.patientUpdated, { patientId: id, fields }, actor);
    return toPatientDto(updated);
  }

  // US-3 and US-4: staff who spot two records for one person flag them; the
  // System Administrator decides (UC-08 4b)
  async reportDuplicate(id: string, body: ReportDuplicateDto, actor: AuthUser) {
    const [patient, other] = await Promise.all([
      this.patients.findById(id),
      this.patients.findById(body.otherPatientId.trim()),
    ]);
    if (!patient || !other) throw new NotFoundException("Both records have to exist.");
    if (patient.id === other.id) throw new BadRequestException("Pick a different record.");
    if (patient.merged_into || other.merged_into) throw new ConflictException("One of these records was already merged.");
    try {
      const review = await this.database.one<{ id: string }>(
        `INSERT INTO identity_reviews (id, patient_id, candidate_id, reason, reported_by_id)
         VALUES ('IDR-' || lpad(nextval('identity_review_number')::text, 4, '0'), $1, $2, $3, $4)
         RETURNING id`,
        [patient.id, other.id, body.reason.trim(), actor.id],
      );
      this.bus.publish(
        EVENT_TYPES.identityReviewFlagged,
        { reviewId: review!.id, patientId: patient.id, candidateId: other.id },
        actor,
      );
      return { reviewId: review!.id };
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException("These two records are already waiting for review.");
      }
      throw error;
    }
  }
}
