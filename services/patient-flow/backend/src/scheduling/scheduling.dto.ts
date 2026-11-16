import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsISO8601, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class BookAppointmentDto {
  @ApiProperty({ example: "WAH-2026-00003" })
  @IsString()
  @IsNotEmpty({ message: "Pick the patient" })
  patientId: string;

  @ApiProperty({ example: "Internal Medicine" })
  @IsString()
  @IsNotEmpty({ message: "Pick the department" })
  department: string;

  @ApiProperty({ example: "EMP-0001" })
  @IsString()
  @IsNotEmpty({ message: "Pick the physician" })
  physicianId: string;

  @ApiProperty({ example: "2026-11-18T09:00:00+08:00" })
  @IsISO8601({}, { message: "Pick a date and time" })
  scheduledAt: string;

  @ApiProperty({ example: "Elective admission for cholecystectomy" })
  @IsString()
  @MinLength(3, { message: "Say what the booking is for" })
  @MaxLength(200)
  purpose: string;
}

export const APPOINTMENT_UPDATES = ["Completed", "Cancelled", "NoShow"] as const;

export class UpdateAppointmentDto {
  @ApiProperty({ enum: APPOINTMENT_UPDATES })
  @IsIn(APPOINTMENT_UPDATES)
  status: (typeof APPOINTMENT_UPDATES)[number];
}
