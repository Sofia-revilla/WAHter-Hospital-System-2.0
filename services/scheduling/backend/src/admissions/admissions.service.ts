import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type AuthUser } from "@wahter/shared";
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
    attendingPhysician: row.attending_physician,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at.toISOString(),
  };
}

@Injectable()
export class AdmissionsService {
  constructor(
    private readonly admissions: AdmissionsRepository,
    private readonly wards: WardsRepository,
    private readonly bus: EventBus,
  ) {}

  async listActive() {
    return (await this.admissions.findActive()).map(toBedAssignment);
  }

  async assign(body: AssignBedDto, user: AuthUser) {
    const ward = await this.wards.findById(body.wardId);
    if (!ward) throw new NotFoundException(`No ward ${body.wardId}`);
    if (body.bedIndex >= ward.capacity) throw new BadRequestException("That bed doesn't exist in this ward.");
    if (body.bedIndex < ward.census_occupied) {
      throw new ConflictException("That bed was just taken. Please pick another one.");
    }

    let result;
    try {
      result = await this.admissions.assign({ ...body, assignedBy: user.name, assignedById: user.id });
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
          attendingPhysician: admission.attending_physician,
        },
        user,
      );
    }
    return toBedAssignment(admission);
  }
}
