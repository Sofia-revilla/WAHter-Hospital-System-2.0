import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, IsString, Min, MinLength } from "class-validator";

const ADMISSION_TYPES = ["Direct admit", "ER-to-ward transfer"] as const;

export class AssignBedDto {
  @ApiProperty({ example: "WAH-2026-00003" })
  @IsString()
  patientId: string;

  @ApiProperty({ example: "W-004" })
  @IsString()
  wardId: string;

  @ApiProperty({ example: 7, description: "0-based bed index in the ward grid" })
  @IsInt()
  @Min(0)
  bedIndex: number;

  @ApiProperty({ enum: ADMISSION_TYPES })
  @IsIn(ADMISSION_TYPES)
  admissionType: (typeof ADMISSION_TYPES)[number];

  @ApiProperty({ example: "Dr. Andrea Mendoza" })
  @IsString()
  @MinLength(2)
  attendingPhysician: string;
}
