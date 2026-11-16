import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { BookAppointmentDto, UpdateAppointmentDto } from "./scheduling.dto";
import { SchedulingService } from "./scheduling.service";

// "Manage scheduling and referrals" is the Admitting Clerk's in the use case diagram
@ApiTags("scheduling and queue (UC-02)")
@ApiBearerAuth()
@Roles("AdmittingClerk")
@Controller()
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  @ApiQuery({ name: "date", required: false, example: "2026-11-18" })
  @ApiQuery({ name: "department", required: false })
  @Get("appointments")
  day(@Query("date") date?: string, @Query("department") department?: string) {
    return this.scheduling.day(date, department);
  }

  // declared before :id so "availability" isn't read as an appointment ID
  @ApiQuery({ name: "physicianId" })
  @ApiQuery({ name: "date", example: "2026-11-18" })
  @Get("appointments/availability")
  availability(@Query("physicianId") physicianId: string, @Query("date") date: string) {
    return this.scheduling.availability(physicianId, date);
  }

  @Post("appointments")
  book(@Body() body: BookAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.scheduling.book(body, user);
  }

  @HttpCode(200)
  @Post("appointments/:id/check-in")
  checkIn(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.scheduling.checkIn(id, user);
  }

  @HttpCode(200)
  @Post("appointments/:id/status")
  update(@Param("id") id: string, @Body() body: UpdateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.scheduling.update(id, body, user);
  }

  @ApiQuery({ name: "department", required: false })
  @Get("queue")
  queue(@Query("department") department?: string) {
    return this.scheduling.queue(department);
  }
}
