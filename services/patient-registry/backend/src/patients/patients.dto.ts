import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

// The demographics UC-01 asks for ("complete demographic information",
// US-1), shaped after the PH Core Patient profile. Every rule here also runs
// in the registration form, so a clerk sees the problem before submitting;
// the service checks again because the form isn't the only caller.

export const CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated", "Annulled"] as const;

// A birth date can't be in the future or more than 130 years back
@ValidatorConstraint({ name: "plausibleBirthDate" })
class PlausibleBirthDate implements ValidatorConstraintInterface {
  validate(value: string) {
    const born = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(born.getTime())) return false;
    const now = new Date();
    const oldest = new Date(Date.UTC(now.getUTCFullYear() - 130, 0, 1));
    return born <= now && born >= oldest;
  }

  defaultMessage() {
    return "Birth date can't be in the future or more than 130 years ago";
  }
}

export class AddressDto {
  @ApiPropertyOptional({ example: "123 Rizal St." })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  street?: string;

  @ApiProperty({ example: "San Nicolas" })
  @IsString()
  @IsNotEmpty({ message: "Barangay is required" })
  @MaxLength(80)
  barangay: string;

  @ApiProperty({ example: "Concepcion" })
  @IsString()
  @IsNotEmpty({ message: "Municipality or city is required" })
  @MaxLength(80)
  municipality: string;

  @ApiProperty({ example: "Tarlac" })
  @IsString()
  @IsNotEmpty({ message: "Province is required" })
  @MaxLength(80)
  province: string;
}

export class PatientDemographicsDto {
  @ApiProperty({ example: "Juan" })
  @IsString()
  @MinLength(1, { message: "Given name is required" })
  @MaxLength(60)
  givenName: string;

  @ApiPropertyOptional({ example: "Santos" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  middleName?: string;

  @ApiProperty({ example: "Dela Cruz" })
  @IsString()
  @MinLength(1, { message: "Family name is required" })
  @MaxLength(60)
  familyName: string;

  @ApiPropertyOptional({ example: "Jr." })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  suffix?: string;

  @ApiProperty({ enum: ["Male", "Female"] })
  @IsIn(["Male", "Female"], { message: "Sex is required" })
  sex: "Male" | "Female";

  @ApiProperty({ example: "1980-04-12" })
  @IsDateString({}, { message: "Birth date is required (YYYY-MM-DD)" })
  @Validate(PlausibleBirthDate)
  birthDate: string;

  @ApiPropertyOptional({ enum: CIVIL_STATUSES })
  @IsOptional()
  @IsIn(CIVIL_STATUSES)
  civilStatus?: (typeof CIVIL_STATUSES)[number];

  @ApiPropertyOptional({ example: "09171234567" })
  @IsOptional()
  @Matches(/^(09|\+639)\d{9}$/, { message: "Contact number should look like 09XXXXXXXXX" })
  contactNumber?: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiPropertyOptional({ example: "190000000001", description: "12-digit PhilHealth PIN" })
  @IsOptional()
  @Matches(/^\d{12}$/, { message: "PhilHealth PIN must be 12 digits" })
  philhealthPin?: string;
}

export class RegisterPatientDto extends PatientDemographicsDto {
  // UC-01 6a, after the possible matches were shown: "this is a new person",
  // or "I can't tell, flag it for the System Administrator" (with the record
  // it might be)
  @ApiPropertyOptional({ enum: ["ConfirmedNew", "FlagForReview"] })
  @IsOptional()
  @IsIn(["ConfirmedNew", "FlagForReview"])
  decision?: "ConfirmedNew" | "FlagForReview";

  @ApiPropertyOptional({ example: "WAH-2026-00001" })
  @IsOptional()
  @IsString()
  reviewCandidateId?: string;
}

// UC-01 3a: the user may update permitted demographic information. Every
// field is optional; only the ones sent change.
export class UpdatePatientDto extends PartialType(PatientDemographicsDto) {}

export class ReportDuplicateDto {
  @ApiProperty({ example: "WAH-2026-00009" })
  @IsString()
  @IsNotEmpty()
  otherPatientId: string;

  @ApiProperty({ example: "Same mother's name and address" })
  @IsString()
  @MinLength(5, { message: "Say briefly why they might be the same person" })
  @MaxLength(300)
  reason: string;
}

export class ResolveReviewDto {
  @ApiPropertyOptional({ description: "For a merge: the record that stays" })
  @IsOptional()
  @IsString()
  survivorId?: string;

  @ApiProperty({ example: "Same PhilHealth member data; registered twice at the ER" })
  @IsString()
  @MinLength(5, { message: "Write down why, for the audit trail" })
  @MaxLength(300)
  note: string;
}
