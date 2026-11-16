import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, Matches, MinLength } from "class-validator";
import { STAFF_ROLES, type StaffRole } from "@wahter/shared";

export class LoginDto {
  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role: StaffRole;

  @ApiProperty({ example: "Andrea Mendoza" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: "doctor2026" })
  @IsString()
  password: string;
}

export class SignupDto {
  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role: StaffRole;

  @ApiProperty({ example: "Sarah Johnson" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: "MED-1234-ABCD" })
  @Matches(/^MED-[A-Z0-9]{4}-[A-Z0-9]{4}$/, { message: "License must look like MED-XXXX-XXXX" })
  license: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
