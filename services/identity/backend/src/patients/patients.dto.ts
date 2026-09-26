import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class MatchPatientDto {
  @ApiProperty({ example: "Juan Dela Cruz" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: ["Male", "Female"] })
  @IsIn(["Male", "Female"])
  sex: "Male" | "Female";

  @ApiProperty({ example: "1980-04-12" })
  @IsDateString()
  birthDate: string;

  @ApiPropertyOptional({ example: "190000000001", description: "12-digit PhilHealth PIN" })
  @IsOptional()
  @Matches(/^\d{12}$/, { message: "PhilHealth PIN must be 12 digits" })
  philhealthPin?: string;
}

export class RegisterPatientDto extends MatchPatientDto {
  // UC-01 alt flow: the registrar looked at the possible matches and says
  // this really is a new person
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  confirmedNotDuplicate?: boolean;
}
