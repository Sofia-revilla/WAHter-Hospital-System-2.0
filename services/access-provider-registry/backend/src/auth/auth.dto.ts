import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, IsUUID, Matches, MinLength } from "class-validator";
import { STAFF_ROLES, type StaffRole } from "@wahter/shared";

export class LoginDto {
  // the portal picked on the System Access page; the account has to belong to it
  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role: StaffRole;

  @ApiProperty({ example: "amendoza" })
  @IsString()
  @MinLength(2)
  username: string;

  @ApiProperty({ example: "doctor2026" })
  @IsString()
  password: string;
}

export class VerifyAccessKeyDto {
  @ApiProperty({ description: "challengeId from POST /auth/login" })
  @IsUUID()
  challengeId: string;

  @ApiProperty({ example: "482913" })
  @Matches(/^\d{6}$/, { message: "The access key is six digits." })
  code: string;
}

export class DemoLoginDto {
  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role: StaffRole;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
