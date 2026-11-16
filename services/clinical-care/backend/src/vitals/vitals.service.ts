import { Injectable, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
import { calculateMews, implausibleReadings } from "@wahter/shared/mews";
import { EncountersRepository } from "../encounters/encounters.repository";
import type { RecordVitalsDto } from "./vitals.dto";
import { VitalsRepository, type VitalsRow } from "./vitals.repository";

// pg returns numeric columns as strings, so they're converted back here
export function toVitalsRecord(row: VitalsRow) {
  return {
    id: row.id,
    patientId: row.patient_id,
    recordedAt: row.recorded_at.toISOString(),
    recordedById: row.recorded_by_id,
    vitals: {
      respiratoryRate: Number(row.respiratory_rate),
      oxygenSaturation: Number(row.oxygen_saturation),
      temperature: Number(row.temperature),
      systolicBp: Number(row.systolic_bp),
      heartRate: Number(row.heart_rate),
      consciousness: row.consciousness,
    },
    mewsScore: row.mews_score,
    risk: row.risk,
    hadImplausibleReading: row.had_implausible_reading,
  };
}

@Injectable()
export class VitalsService {
  constructor(
    private readonly vitals: VitalsRepository,
    private readonly encounters: EncountersRepository,
    private readonly bus: EventBus,
  ) {}

  async list(patientId: string | undefined, limit: number) {
    return (await this.vitals.list(patientId, limit)).map(toVitalsRecord);
  }

  async record({ patientId, vitals, confirmedImplausible }: RecordVitalsDto, user: AuthUser) {
    const encounter = await this.encounters.findOpenForPatient(patientId);
    if (!encounter) throw new NotFoundException(`${patientId} has no open inpatient encounter`);

    const implausible = implausibleReadings(vitals);
    if (implausible.length > 0 && !confirmedImplausible) {
      throw new UnprocessableEntityException({
        message: "Some readings are outside the plausible range. Confirm them to save.",
        implausible,
      });
    }

    // MEWS is computed here, from what was saved, never taken from the client
    const { score, risk } = calculateMews(vitals);
    const row = await this.vitals.record({
      patientId,
      encounterId: encounter.id,
      vitals,
      mewsScore: score,
      risk,
      hadImplausibleReading: implausible.length > 0,
      recordedById: user.id,
    });
    const record = toVitalsRecord(row);

    // Both publishes are fire-and-forget: if RabbitMQ is down the vitals are
    // already saved and the events go out when it's back (objective 2)
    this.bus.publish(EVENT_TYPES.vitalsRecorded, { vitalsId: record.id, patientId, mewsScore: score, risk }, user);
    if (risk !== "Low") {
      this.bus.publish(
        EVENT_TYPES.mewsAlert,
        { vitalsId: record.id, patientId, mewsScore: score, risk, raisedAt: record.recordedAt },
        user,
      );
    }
    return record;
  }
}
