import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, Matches, MinLength } from "class-validator";
import type { PortalRole } from "@wahter/shared";

const PORTALS: PortalRole[] = ["Doctor", "Nurse", "Pharmacist", "Billing", "IT"];

export class LoginDto {
  @ApiProperty({ enum: PORTALS })
  @IsIn(PORTALS)
  role: PortalRole;

  @ApiProperty({ example: "Andrea Mendoza" })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: "doctor2026" })
  @IsString()
  password: string;
}

export class SignupDto {
  @ApiProperty({ enum: PORTALS })
  @IsIn(PORTALS)
  role: PortalRole;

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
