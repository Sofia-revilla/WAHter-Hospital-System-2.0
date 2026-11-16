import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Database, EVENT_TYPES, EventBus, ServiceClient, ServiceUnavailableError, type AuthUser } from "@wahter/shared";
import { BedUnavailableError, BedsRepository } from "../beds/beds.repository";
import { alternativeBeds } from "../flow-rules";
import type { AdmitPatientDto, TransferDto } from "./admissions.dto";

// Postgres error code for a unique index violation
const UNIQUE_VIOLATION = "23505";
// an admission charted late can be back-dated this far, never forward
const MAX_BACKDATE_HOURS = 72;

export interface AdmissionRow {
  id: string;
  patient_id: string;
  attending_physician_id: string;
  admission_type: string;
  admitting_diagnosis: string;
  admitted_at: Date;
  admitted_by_id: string;
  current_bed_id: string | null;
  status: "Admitted" | "ReadyForDischarge" | "Discharged";
  discharged_at: Date | null;
  bed_code: string | null;
  ward_id: string | null;
}

const SELECT_ADMISSION = `SELECT a.*, b.code AS bed_code, r.ward_id
                            FROM admissions a
                            LEFT JOIN beds b ON b.id = a.current_bed_id
                            LEFT JOIN rooms r ON r.id = b.room_id`;

export function toAdmission(row: AdmissionRow) {
  return {
    admissionId: row.id,
    patientId: row.patient_id,
    attendingPhysicianId: row.attending_physician_id,
    admissionType: row.admission_type,
    admittingDiagnosis: row.admitting_diagnosis,
    admittedAt: row.admitted_at.toISOString(),
    admittedById: row.admitted_by_id,
    bedId: row.current_bed_id,
    bedCode: row.bed_code,
    wardId: row.ward_id,
    status: row.status,
    dischargedAt: row.discharged_at?.toISOString() ?? null,
  };
}

// UC-02 Manage Patient Scheduling and Admission, the admission side
@Injectable()
export class AdmissionsService {
  constructor(
    private readonly database: Database,
    private readonly beds: BedsRepository,
    private readonly bus: EventBus,
    private readonly services: ServiceClient,
  ) {}

  async listActive() {
    const rows = await this.database.query<AdmissionRow>(`${SELECT_ADMISSION} WHERE a.status <> 'Discharged' ORDER BY a.admitted_at`);
    return rows.map(toAdmission);
  }

  // For Interoperability & Reporting (FHIR Encounter, reports)
  async history(filter: { patientId?: string; from?: string; to?: string }) {
    const rows = await this.database.query<AdmissionRow>(
      `${SELECT_ADMISSION}
        WHERE ($1::text IS NULL OR a.patient_id = $1)
          AND ($2::date IS NULL OR a.admitted_at >= $2::date)
          AND ($3::date IS NULL OR a.admitted_at < $3::date + 1)
        ORDER BY a.admitted_at DESC
        LIMIT 1000`,
      [filter.patientId ?? null, filter.from ?? null, filter.to ?? null],
    );
    return rows.map(toAdmission);
  }

  // UC-02 steps 2 to 10
  async admit(body: AdmitPatientDto, user: AuthUser) {
    const admittedAt = this.checkAdmittedAt(body.admittedAt);
    // UC-02 includes UC-01: the patient has to be in the registry, and the
    // attending physician in the provider registry. If either registry is
    // down we refuse rather than admit someone we can't identify.
    await this.requireRegistered("patient-registry", `/patients/${encodeURIComponent(body.patientId)}`, "patientId", "That patient isn't in the Patient Registry");
    await this.requirePhysician(body.attendingPhysicianId);

    const bed = await this.beds.findBed(body.bedId);
    if (!bed) throw new BadRequestException({ message: "That bed doesn't exist", fields: { bedId: "That bed doesn't exist" } });

    let admissionId: string;
    try {
      admissionId = await this.database.transaction(async (client) => {
        const {
          rows: [{ id }],
        } = await client.query<{ id: string }>("SELECT 'ADM-' || lpad(nextval('admission_number')::text, 5, '0') AS id");
        await this.beds.claim(client, bed.id, id);
        await client.query(
          `INSERT INTO admissions (id, patient_id, attending_physician_id, admission_type, admitting_diagnosis,
                                   admitted_at, admitted_by_id, current_bed_id, appointment_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            body.patientId,
            body.attendingPhysicianId,
            body.admissionType,
            body.admittingDiagnosis.trim(),
            admittedAt,
            user.id,
            bed.id,
            body.appointmentId ?? null,
          ],
        );
        await client.query(
          "INSERT INTO bed_assignments (admission_id, bed_id, assigned_at, assigned_by_id) VALUES ($1, $2, $3, $4)",
          [id, bed.id, admittedAt, user.id],
        );
        await this.beds.log(client, { bedId: bed.id, from: "Available", to: "Occupied", admissionId: id, reason: "Admitted", byId: user.id });
        if (body.appointmentId) {
          await client.query("UPDATE appointments SET status = 'Completed', updated_at = now() WHERE id = $1", [body.appointmentId]);
        }
        return id;
      });
    } catch (error) {
      if (error instanceof BedUnavailableError) throw await this.bedTaken(bed);
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException("This patient is already admitted. Use Transfer to move them.");
      }
      throw error;
    }

    const admitted = {
      patientId: body.patientId,
      admissionId,
      wardId: bed.ward_id,
      bedId: bed.id,
      department: bed.department,
      admissionType: body.admissionType,
      attendingPhysicianId: body.attendingPhysicianId,
    };
    // Clinical Care opens the encounter and Billing opens the account from this
    this.bus.publish(EVENT_TYPES.patientAdmitted, admitted, user);
    this.bus.publish(
      EVENT_TYPES.bedAssigned,
      { bedId: bed.id, bedCode: bed.code, wardId: bed.ward_id, patientId: body.patientId, admissionId },
      user,
    );
    return this.get(admissionId);
  }

  // US-8: move an admitted patient to another bed or ward, with a reason
  async transfer(admissionId: string, body: TransferDto, user: AuthUser) {
    const target = await this.beds.findBed(body.bedId);
    if (!target) throw new BadRequestException({ message: "That bed doesn't exist", fields: { bedId: "That bed doesn't exist" } });

    let fromBedId: string;
    let patientId: string;
    try {
      ({ fromBedId, patientId } = await this.database.transaction(async (client) => {
        const { rows } = await client.query<AdmissionRow>(
          "SELECT * FROM admissions WHERE id = $1 FOR UPDATE",
          [admissionId],
        );
        const admission = rows[0];
        if (!admission) throw new NotFoundException(`No admission ${admissionId}`);
        if (admission.status === "Discharged" || !admission.current_bed_id) {
          throw new ConflictException("This patient has been discharged.");
        }
        if (admission.current_bed_id === target.id) throw new BadRequestException("That's the bed they're already in.");
        const from = admission.current_bed_id;

        await this.beds.claim(client, target.id, admissionId);
        await this.beds.release(client, from);
        await client.query(
          `UPDATE bed_assignments SET ended_at = now(), end_reason = 'Transferred', transfer_reason = $2
            WHERE admission_id = $1 AND ended_at IS NULL`,
          [admissionId, body.reason.trim()],
        );
        await client.query("INSERT INTO bed_assignments (admission_id, bed_id, assigned_by_id) VALUES ($1, $2, $3)", [
          admissionId,
          target.id,
          user.id,
        ]);
        await client.query("UPDATE admissions SET current_bed_id = $2 WHERE id = $1", [admissionId, target.id]);
        await this.beds.log(client, { bedId: from, from: "Occupied", to: "Available", admissionId, reason: `Transferred out: ${body.reason.trim()}`, byId: user.id });
        await this.beds.log(client, { bedId: target.id, from: "Available", to: "Occupied", admissionId, reason: `Transferred in: ${body.reason.trim()}`, byId: user.id });
        return { fromBedId: from, patientId: admission.patient_id };
      }));
    } catch (error) {
      if (error instanceof BedUnavailableError) throw await this.bedTaken(target);
      throw error;
    }

    this.bus.publish(
      EVENT_TYPES.patientTransferred,
      { patientId, admissionId, fromBedId, toBedId: target.id, wardId: target.ward_id, department: target.department },
      user,
    );
    this.bus.publish(
      EVENT_TYPES.bedAssigned,
      { bedId: target.id, bedCode: target.code, wardId: target.ward_id, patientId, admissionId },
      user,
    );
    return this.get(admissionId);
  }

  async get(id: string) {
    const row = await this.database.one<AdmissionRow>(`${SELECT_ADMISSION} WHERE a.id = $1`, [id]);
    if (!row) throw new NotFoundException(`No admission ${id}`);
    return toAdmission(row);
  }

  // UC-02 6a and 6b: the bed is gone, so say so and offer the closest free ones
  private async bedTaken(bed: { ward_id: string; department: string; ward_type: string; code: string }) {
    const alternatives = alternativeBeds(await this.beds.freeBeds(), {
      wardId: bed.ward_id,
      department: bed.department,
      wardType: bed.ward_type,
    });
    return new ConflictException({
      message: `Bed ${bed.code} was just taken. Pick another one.`,
      alternatives,
    });
  }

  private checkAdmittedAt(raw?: string) {
    if (!raw) return new Date();
    const at = new Date(raw);
    const hoursAgo = (Date.now() - at.getTime()) / 3_600_000;
    if (hoursAgo < -0.1) {
      throw new BadRequestException({ message: "The admission can't be in the future", fields: { admittedAt: "The admission can't be in the future" } });
    }
    if (hoursAgo > MAX_BACKDATE_HOURS) {
      const text = `Admissions can be back-dated up to ${MAX_BACKDATE_HOURS} hours`;
      throw new BadRequestException({ message: text, fields: { admittedAt: text } });
    }
    return at;
  }

  private async requireRegistered(service: string, path: string, field: string, notFound: string) {
    let found: unknown;
    try {
      found = await this.services.get(service, path);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw new ServiceUnavailableException("The Patient Registry is unavailable, so the patient can't be verified.");
      }
      throw error;
    }
    if (!found) throw new BadRequestException({ message: notFound, fields: { [field]: notFound } });
    if ((found as { mergedInto?: string | null }).mergedInto) {
      const text = `That record was merged into ${(found as { mergedInto: string }).mergedInto}; admit that one`;
      throw new BadRequestException({ message: text, fields: { [field]: text } });
    }
  }

  private async requirePhysician(providerId: string) {
    let physicians: { id: string }[] | null;
    try {
      physicians = await this.services.get<{ id: string }[]>("access-provider-registry", "/providers?role=Physician");
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw new ServiceUnavailableException("The provider registry is unavailable, so the physician can't be verified.");
      }
      throw error;
    }
    if (!physicians?.some((physician) => physician.id === providerId)) {
      const text = "That attending physician isn't an active physician in the provider registry";
      throw new BadRequestException({ message: text, fields: { attendingPhysicianId: text } });
    }
  }
}
