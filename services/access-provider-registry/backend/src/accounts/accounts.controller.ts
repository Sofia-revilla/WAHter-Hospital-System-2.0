import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { CreateAccountDto, DecideApprovalDto, RequestApprovalDto, UpdateAccountDto } from "./accounts.dto";
import { AccountsService } from "./accounts.service";

// UC-08: everything here belongs to the System Administrator
@ApiTags("accounts (UC-08)")
@ApiBearerAuth()
@Roles("SystemAdministrator")
@Controller()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get("accounts")
  list() {
    return this.accounts.list();
  }

  // Create Staff Account, moved here from the public login page
  @Post("accounts")
  create(@Body() body: CreateAccountDto, @CurrentUser() admin: AuthUser) {
    return this.accounts.create(body, admin);
  }

  @Patch("accounts/:id")
  update(@Param("id") id: string, @Body() body: UpdateAccountDto, @CurrentUser() admin: AuthUser) {
    return this.accounts.update(id, body, admin);
  }

  @HttpCode(200)
  @Post("accounts/:id/unlock")
  unlock(@Param("id") id: string, @CurrentUser() admin: AuthUser) {
    return this.accounts.unlock(id, admin);
  }

  @HttpCode(200)
  @Post("accounts/:id/restore")
  restore(@Param("id") id: string, @CurrentUser() admin: AuthUser) {
    return this.accounts.restore(id, admin);
  }

  // role changes and disabling go through a second System Administrator
  @Post("accounts/:id/approval-requests")
  requestApproval(@Param("id") id: string, @Body() body: RequestApprovalDto, @CurrentUser() admin: AuthUser) {
    return this.accounts.requestApproval(id, body, admin);
  }

  @ApiQuery({ name: "status", required: false, enum: ["Pending", "Approved", "Rejected"] })
  @Get("approval-requests")
  listApprovals(@Query("status") status?: string) {
    return this.accounts.listApprovals(status);
  }

  @HttpCode(200)
  @Post("approval-requests/:id/approve")
  approve(@Param("id") id: string, @Body() body: DecideApprovalDto, @CurrentUser() admin: AuthUser) {
    return this.accounts.decide(id, "Approved", body.note, admin);
  }

  @HttpCode(200)
  @Post("approval-requests/:id/reject")
  reject(@Param("id") id: string, @Body() body: DecideApprovalDto, @CurrentUser() admin: AuthUser) {
    return this.accounts.decide(id, "Rejected", body.note, admin);
  }
}
