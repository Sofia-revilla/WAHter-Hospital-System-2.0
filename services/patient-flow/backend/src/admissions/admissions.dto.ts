import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

const ADMISSION_TYPES = ["Direct admit", "ER-to-ward transfer", "Scheduled"] as const;

// UC-02 step 5 and extension 8a: everything an admission needs. Missing or
// wrong fields come back one by one (the shared ValidationPipe), so the form
// can mark them for correction before anything is saved.
export class AdmitPatientDto {
  @ApiProperty({ example: "WAH-2026-00013" })
  @IsString()
  @IsNotEmpty({ message: "Pick the patient" })
  patientId: string;

  @ApiProperty({ example: "EMP-0001", description: "Provider ID of the attending physician" })
  @IsString()
  @IsNotEmpty({ message: "Pick the attending physician" })
  attendingPhysicianId: string;

  @ApiProperty({ example: "BED-W001-05" })
  @IsString()
  @IsNotEmpty({ message: "Pick a bed" })
  bedId: string;

  @ApiProperty({ enum: ADMISSION_TYPES })
  @IsIn(ADMISSION_TYPES, { message: "Pick the admission type" })
  admissionType: (typeof ADMISSION_TYPES)[number];

  @ApiProperty({ example: "Community-acquired pneumonia" })
  @IsString()
  @MinLength(3, { message: "Write the admitting diagnosis" })
  @MaxLength(200)
  admittingDiagnosis: string;

  // defaults to now; an admission charted a little late can say when it really happened
  @ApiPropertyOptional({ example: "2026-11-17T08:30:00+08:00" })
  @IsOptional()
  @IsISO8601({}, { message: "Admission date and time aren't valid" })
  admittedAt?: string;

  @ApiPropertyOptional({ description: "The booking this admission comes from" })
  @IsOptional()
  @IsString()
  appointmentId?: string;
}

// US-8: a nurse moves a patient to another bed or ward, with a reason
export class TransferDto {
  @ApiProperty({ example: "BED-W005-01" })
  @IsString()
  @IsNotEmpty({ message: "Pick the new bed" })
  bedId: string;

  @ApiProperty({ example: "Needs isolation" })
  @IsString()
  @MinLength(3, { message: "Say why the patient is moving" })
  @MaxLength(200)
  reason: string;
}
