import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import type { Consciousness } from "@wahter/shared/mews";

const AVPU: Consciousness[] = ["Alert", "Voice", "Pain", "Unresponsive"];

export class VitalSignsDto {
  @ApiProperty({ example: 18 })
  @IsNumber()
  respiratoryRate: number;

  @ApiProperty({ example: 97 })
  @IsNumber()
  oxygenSaturation: number;

  @ApiProperty({ example: 36.8 })
  @IsNumber()
  temperature: number;

  @ApiProperty({ example: 120 })
  @IsNumber()
  systolicBp: number;

  @ApiProperty({ example: 80 })
  @IsNumber()
  heartRate: number;

  @ApiProperty({ enum: AVPU })
  @IsIn(AVPU)
  consciousness: Consciousness;
}

export class RecordVitalsDto {
  @ApiProperty({ example: "WAH-2026-00003" })
  @IsString()
  patientId: string;

  @ApiProperty({ type: VitalSignsDto })
  @ValidateNested()
  @Type(() => VitalSignsDto)
  vitals: VitalSignsDto;

  // UC-05 ext 4a: out-of-range readings save only after the nurse confirms them
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  confirmedImplausible?: boolean;
}
