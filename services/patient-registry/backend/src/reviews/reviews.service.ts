import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Database, EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { toPatientDto } from "../patients/patients.service";
import type { PatientRow } from "../patients/patients.repository";

interface ReviewRow {
  id: string;
  patient_id: string;
  candidate_id: string;
  reason: string;
  status: "Pending" | "Merged" | "KeptSeparate";
  reported_by_id: string;
  reported_at: Date;
  resolved_by_id: string | null;
  resolved_at: Date | null;
  resolution_note: string | null;
  survivor_id: string | null;
}

// The System Administrator's Identity Review (UC-08 extension 4b, UC-01 6a).
// A merge never deletes anything: the other record gets merged_into pointing
// at the survivor and stays readable, and the merge is written to
// patient_merges. Other services keep the IDs they hold; asking the registry
// for the old ID shows where it went.
//
// This is the one place the System Administrator sees patient identity, and
// only the identity fields of the two records being compared.
@Injectable()
export class ReviewsService {
  constructor(
    private readonly database: Database,
    private readonly bus: EventBus,
  ) {}

  async list(status: string | undefined) {
    const reviews = await this.database.query<ReviewRow>(
      `SELECT * FROM identity_reviews WHERE ($1::text IS NULL OR status = $1) ORDER BY reported_at DESC LIMIT 200`,
      [status ?? null],
    );
    const ids = [...new Set(reviews.flatMap((review) => [review.patient_id, review.candidate_id]))];
    const patients = ids.length
      ? await this.database.query<PatientRow>("SELECT * FROM patients WHERE id = ANY($1::text[])", [ids])
      : [];
    const byId = new Map(patients.map((patient) => [patient.id, toPatientDto(patient)]));
    return reviews.map((review) => ({
      id: review.id,
      reason: review.reason,
      status: review.status,
      reportedById: review.reported_by_id,
      reportedAt: review.reported_at.toISOString(),
      resolvedById: review.resolved_by_id,
      resolvedAt: review.resolved_at?.toISOString() ?? null,
      resolutionNote: review.resolution_note,
      survivorId: review.survivor_id,
      patient: byId.get(review.patient_id) ?? null,
      candidate: byId.get(review.candidate_id) ?? null,
    }));
  }

  async merge(reviewId: string, survivorId: string | undefined, note: string, admin: AuthUser) {
    if (!survivorId) throw new BadRequestException("Pick which record stays.");
    const result = await this.database.transaction(async (client) => {
      const review = await this.lockPending(client, reviewId);
      if (survivorId !== review.patient_id && survivorId !== review.candidate_id) {
        throw new BadRequestException("The record that stays has to be one of the two under review.");
      }
      const sourceId = survivorId === review.patient_id ? review.candidate_id : review.patient_id;
      const { rows } = await client.query<{ id: string; merged_into: string | null; philhealth_pin: string | null }>(
        "SELECT id, merged_into, philhealth_pin FROM patients WHERE id = ANY($1::text[]) FOR UPDATE",
        [[sourceId, survivorId]],
      );
      if (rows.some((row) => row.merged_into)) throw new ConflictException("One of these records was already merged.");
      const sourcePin = rows.find((row) => row.id === sourceId)?.philhealth_pin ?? null;
      const survivorPin = rows.find((row) => row.id === survivorId)?.philhealth_pin ?? null;
      // two different PINs are two different PhilHealth members
      if (sourcePin && survivorPin && sourcePin !== survivorPin) {
        throw new ConflictException("These records have different PhilHealth PINs, so they can't be the same person.");
      }

      // The merged record gives up its PIN (PINs are unique); the survivor
      // takes it if it had none. Either way the survivor is shared with WAH
      // Systems again.
      await client.query("UPDATE patients SET merged_into = $2, philhealth_pin = NULL, updated_at = now() WHERE id = $1", [
        sourceId,
        survivorId,
      ]);
      await client.query(
        `UPDATE patients SET philhealth_pin = coalesce(philhealth_pin, $2), updated_at = now(),
                             exchange_status = 'Pending', exchange_error = NULL
          WHERE id = $1`,
        [survivorId, sourcePin],
      );
      await client.query(
        `INSERT INTO patient_merges (source_id, target_id, review_id, reason, merged_by_id) VALUES ($1, $2, $3, $4, $5)`,
        [sourceId, survivorId, reviewId, note.trim(), admin.id],
      );
      await this.close(client, reviewId, "Merged", note, admin, survivorId);
      return { sourceId, targetId: survivorId };
    });

    this.bus.publish(EVENT_TYPES.patientMerged, { ...result, reviewId }, admin);
    this.bus.publish(EVENT_TYPES.identityReviewResolved, { reviewId, outcome: "Merged" }, admin);
    return { reviewId, outcome: "Merged" as const, ...result };
  }

  async keepSeparate(reviewId: string, note: string, admin: AuthUser) {
    await this.database.transaction(async (client) => {
      await this.lockPending(client, reviewId);
      await this.close(client, reviewId, "KeptSeparate", note, admin, null);
    });
    this.bus.publish(EVENT_TYPES.identityReviewResolved, { reviewId, outcome: "KeptSeparate" }, admin);
    return { reviewId, outcome: "KeptSeparate" as const };
  }

  private async lockPending(client: Parameters<Parameters<Database["transaction"]>[0]>[0], reviewId: string) {
    const { rows } = await client.query<ReviewRow>("SELECT * FROM identity_reviews WHERE id = $1 FOR UPDATE", [reviewId]);
    const review = rows[0];
    if (!review) throw new NotFoundException(`No review ${reviewId}`);
    if (review.status !== "Pending") throw new ConflictException("Someone already resolved this review.");
    return review;
  }

  private async close(
    client: Parameters<Parameters<Database["transaction"]>[0]>[0],
    reviewId: string,
    status: "Merged" | "KeptSeparate",
    note: string,
    admin: AuthUser,
    survivorId: string | null,
  ) {
    await client.query(
      `UPDATE identity_reviews
          SET status = $2, resolved_by_id = $3, resolved_at = now(), resolution_note = $4, survivor_id = $5
        WHERE id = $1`,
      [reviewId, status, admin.id, note.trim(), survivorId],
    );
  }
}
