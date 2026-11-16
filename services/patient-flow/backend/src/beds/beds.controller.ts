import { Body, Controller, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { AddBedsDto, CreateRoomDto, CreateWardDto, SetBedStatusDto, UpdateWardDto } from "./beds.dto";
import { BedsService } from "./beds.service";

@ApiTags("bed board (US-9)")
@ApiBearerAuth()
@Controller()
export class BedsController {
  constructor(private readonly beds: BedsService) {}

  // US-9: real-time occupancy for clinical staff and the admitting desk,
  // with who is in each bed (by ID)
  @Roles("AdmittingClerk", "Physician", "Nurse")
  @Get("bed-board")
  board() {
    return this.beds.board(true);
  }

  // The same layout without any patient in it, for the System Administrator
  // (no patient data, RA 10173) and for other services
  @Roles("AdmittingClerk", "Physician", "Nurse", "SystemAdministrator", "System")
  @Get("wards")
  wards() {
    return this.beds.board(false);
  }
}

// US-44: the System Administrator configures wards, rooms, and beds
@ApiTags("ward setup (US-44)")
@ApiBearerAuth()
@Roles("SystemAdministrator")
@Controller("config")
export class WardSetupController {
  constructor(private readonly beds: BedsService) {}

  @Post("wards")
  createWard(@Body() body: CreateWardDto, @CurrentUser() admin: AuthUser) {
    return this.beds.createWard(body, admin);
  }

  @Patch("wards/:id")
  updateWard(@Param("id") id: string, @Body() body: UpdateWardDto, @CurrentUser() admin: AuthUser) {
    return this.beds.updateWard(id, body, admin);
  }

  @Post("wards/:id/rooms")
  addRoom(@Param("id") id: string, @Body() body: CreateRoomDto, @CurrentUser() admin: AuthUser) {
    return this.beds.addRoom(id, body, admin);
  }

  @Post("rooms/:id/beds")
  addBeds(@Param("id") id: string, @Body() body: AddBedsDto, @CurrentUser() admin: AuthUser) {
    return this.beds.addBeds(id, body.count, admin);
  }

  @HttpCode(200)
  @Patch("beds/:id")
  setStatus(@Param("id") id: string, @Body() body: SetBedStatusDto, @CurrentUser() admin: AuthUser) {
    return this.beds.setBedStatus(id, body, admin);
  }

  @Get("beds/:id/history")
  history(@Param("id") id: string) {
    return this.beds.history(id);
  }
}
