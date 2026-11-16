import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

export const WARD_TYPES = ["Male", "Female", "Specialized", "Children"] as const;
// statuses a person may set; Occupied only ever comes from an admission
export const SETTABLE_BED_STATUSES = ["Available", "Cleaning", "Maintenance"] as const;

export class CreateWardDto {
  @ApiProperty({ example: "W-006" })
  @Matches(/^W-\d{3}$/, { message: "Ward ID looks like W-006" })
  id: string;

  @ApiProperty({ example: "Surgical Ward" })
  @IsString()
  @MinLength(2, { message: "Name the ward" })
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: WARD_TYPES })
  @IsIn(WARD_TYPES, { message: "Pick the ward type" })
  type: (typeof WARD_TYPES)[number];

  @ApiProperty({ example: "Surgery" })
  @IsString()
  @MinLength(2, { message: "Pick the department" })
  department: string;

  @ApiProperty({ example: "#f59e0b" })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "Color looks like #a855f7" })
  color: string;
}

export class UpdateWardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  department?: string;

  // a ward with patients in it can't be closed
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateRoomDto {
  @ApiProperty({ example: "Room 5" })
  @IsString()
  @MinLength(1, { message: "Name the room" })
  @MaxLength(30)
  code: string;

  @ApiProperty({ example: 4, description: "How many beds to create in it" })
  @IsInt()
  @Min(1)
  @Max(20)
  beds: number;
}

export class AddBedsDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(20)
  count: number;
}

export class SetBedStatusDto {
  @ApiProperty({ enum: SETTABLE_BED_STATUSES })
  @IsIn(SETTABLE_BED_STATUSES)
  status: (typeof SETTABLE_BED_STATUSES)[number];

  @ApiProperty({ example: "Broken bed rail" })
  @IsString()
  @MinLength(3, { message: "Say why" })
  @MaxLength(200)
  reason: string;
}
