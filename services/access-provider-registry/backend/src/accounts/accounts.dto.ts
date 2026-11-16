import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";
import { STAFF_ROLES, type StaffRole } from "@wahter/shared";
import { USERNAME_PATTERN } from "./access-rules";

// PRC license as the prototype has always shown it; optional because not
// every role is licensed (clerks, IT)
const LICENSE_PATTERN = /^MED-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export class CreateAccountDto {
  @ApiProperty({ example: "Sarah Johnson" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role: StaffRole;

  @ApiProperty({ example: "Internal Medicine" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  department: string;

  @ApiPropertyOptional({ example: "MED-1234-ABCD" })
  @IsOptional()
  @Matches(LICENSE_PATTERN, { message: "License must look like MED-XXXX-XXXX" })
  license?: string;

  @ApiProperty({ example: "sjohnson" })
  @Matches(USERNAME_PATTERN, { message: "Username: 3 to 32 lowercase letters, digits, dots, or dashes" })
  username: string;

  @ApiProperty({ example: "sjohnson@wahter.local" })
  @IsEmail()
  email: string;

  // the person changes it on first sign-in once that's built; for now it's
  // handed over by the admin like a temporary badge PIN
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  temporaryPassword: string;
}

export class UpdateAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  department?: string;

  // null clears it
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(LICENSE_PATTERN, { message: "License must look like MED-XXXX-XXXX" })
  license?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class RequestApprovalDto {
  @ApiProperty({ enum: ["RoleChange", "Disable"] })
  @IsIn(["RoleChange", "Disable"])
  kind: "RoleChange" | "Disable";

  @ApiPropertyOptional({ enum: STAFF_ROLES, description: "Required for RoleChange" })
  @ValidateIf((body: RequestApprovalDto) => body.kind === "RoleChange")
  @IsIn(STAFF_ROLES)
  newRole?: StaffRole;

  @ApiProperty({ example: "Transferred to the pharmacy" })
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  reason: string;
}

export class DecideApprovalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
