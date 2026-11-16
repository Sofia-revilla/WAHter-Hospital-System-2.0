import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { EVENT_TYPES, EventBus, ServiceClient, ServiceUnavailableError, type AuthUser } from "@wahter/shared";
import { WardsRepository } from "../wards/wards.repository";
import type { AssignBedDto } from "./admissions.dto";
import { AdmissionsRepository, BedTakenError, type AdmissionRow } from "./admissions.repository";

// Same shape as the web app's BedAssignment
function toBedAssignment(row: AdmissionRow) {
  return {
    admissionId: row.id,
    patientId: row.patient_id,
    wardId: row.ward_id,
    bedIndex: row.bed_index,
    admissionType: row.admission_type,
    attendingPhysicianId: row.attending_physician_id,
    assignedById: row.assigned_by_id,
    assignedAt: row.assigned_at.toISOString(),
    endedAt: row.ended_at?.toISOString() ?? null,
  };
}

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly admissions: AdmissionsRepository,
    private readonly wards: WardsRepository,
    private readonly bus: EventBus,
    private readonly services: ServiceClient,
  ) {}

  async history(filter: { patientId?: string; from?: string; to?: string }) {
    return (await this.admissions.findHistory(filter)).map(toBedAssignment);
  }

  async listActive() {
    return (await this.admissions.findActive()).map(toBedAssignment);
  }

  // UC-02 includes UC-01: an admission needs a real registry record. If the
  // registry is down we refuse rather than admit someone we can't identify.
  private async requireRegisteredPatient(patientId: string) {
    let patient: unknown;
    try {
      patient = await this.services.get("patient-registry", `/patients/${encodeURIComponent(patientId)}`);
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw new ServiceUnavailableException("The Patient Registry is unavailable, so the patient can't be verified.");
      }
      throw error;
    }
    if (!patient) throw new NotFoundException(`${patientId} isn't in the Patient Registry`);
  }

  async assign(body: AssignBedDto, user: AuthUser) {
    await this.requireRegisteredPatient(body.patientId);
    const ward = await this.wards.findById(body.wardId);
    if (!ward) throw new NotFoundException(`No ward ${body.wardId}`);
    if (body.bedIndex >= ward.capacity) throw new BadRequestException("That bed doesn't exist in this ward.");
    if (body.bedIndex < ward.census_occupied) {
      throw new ConflictException("That bed was just taken. Please pick another one.");
    }

    let result;
    try {
      result = await this.admissions.assign({ ...body, assignedById: user.id });
    } catch (error) {
      if (error instanceof BedTakenError) {
        throw new ConflictException("That bed was just taken. Please pick another one.");
      }
      throw error;
    }

    const { admission, previous } = result;
    if (previous) {
      this.bus.publish(
        EVENT_TYPES.patientTransferred,
        {
          patientId: admission.patient_id,
          admissionId: admission.id,
          fromWardId: previous.ward_id,
          fromBedIndex: previous.bed_index,
          wardId: admission.ward_id,
          bedIndex: admission.bed_index,
        },
        user,
      );
    } else {
      this.bus.publish(
        EVENT_TYPES.patientAdmitted,
        {
          patientId: admission.patient_id,
          admissionId: admission.id,
          wardId: admission.ward_id,
          bedIndex: admission.bed_index,
          admissionType: admission.admission_type,
          attendingPhysicianId: admission.attending_physician_id,
        },
        user,
      );
    }
    return toBedAssignment(admission);
  }
}
