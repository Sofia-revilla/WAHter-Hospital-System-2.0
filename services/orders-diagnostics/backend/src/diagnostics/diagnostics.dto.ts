import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MinLength } from "class-validator";

export class CreateDiagnosticOrderDto {
  @ApiProperty({ example: "WAH-2026-00003" })
  @IsString()
  patientId: string;

  @ApiProperty({ example: "Complete Blood Count (CBC)" })
  @IsString()
  @MinLength(2)
  test: string;

  @ApiProperty({ enum: ["Laboratory", "Radiology"] })
  @IsIn(["Laboratory", "Radiology"])
  kind: "Laboratory" | "Radiology";

  @ApiProperty({ enum: ["Urgent", "Routine"] })
  @IsIn(["Urgent", "Routine"])
  priority: "Urgent" | "Routine";
}
