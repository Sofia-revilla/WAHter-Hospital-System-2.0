import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateMedicationOrderDto {
  @ApiProperty({ example: "WAH-2026-00003" })
  @IsString()
  patientId: string;

  @ApiProperty({ example: "Amoxicillin 500mg" })
  @IsString()
  @MinLength(2)
  drug: string;

  @ApiProperty({ example: "1 cap" })
  @IsString()
  @MinLength(1)
  dose: string;

  @ApiProperty({ example: "TID" })
  @IsString()
  @MinLength(1)
  frequency: string;

  @ApiPropertyOptional({ example: "PO" })
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional({ example: "7 days" })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;
}
