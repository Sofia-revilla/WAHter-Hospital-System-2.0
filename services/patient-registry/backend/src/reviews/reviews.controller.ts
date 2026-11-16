import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { ResolveReviewDto } from "../patients/patients.dto";
import { ReviewsService } from "./reviews.service";

// UC-08 extension 4b: possible duplicates the desk couldn't decide on
@ApiTags("identity review (UC-08 4b)")
@ApiBearerAuth()
@Roles("SystemAdministrator")
@Controller("identity-reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @ApiQuery({ name: "status", required: false, enum: ["Pending", "Merged", "KeptSeparate"] })
  @Get()
  list(@Query("status") status?: string) {
    return this.reviews.list(status);
  }

  @HttpCode(200)
  @Post(":id/merge")
  merge(@Param("id") id: string, @Body() body: ResolveReviewDto, @CurrentUser() admin: AuthUser) {
    return this.reviews.merge(id, body.survivorId, body.note, admin);
  }

  @HttpCode(200)
  @Post(":id/keep-separate")
  keepSeparate(@Param("id") id: string, @Body() body: ResolveReviewDto, @CurrentUser() admin: AuthUser) {
    return this.reviews.keepSeparate(id, body.note, admin);
  }
}
