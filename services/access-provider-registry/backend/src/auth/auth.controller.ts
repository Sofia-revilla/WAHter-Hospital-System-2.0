import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, Public, STAFF_ROLES, Roles, type AuthUser } from "@wahter/shared";
import { DemoLoginDto, LoginDto, RefreshDto, VerifyAccessKeyDto } from "./auth.dto";
import { AuthService } from "./auth.service";

// There's no public sign-up any more: only a System Administrator creates
// accounts (POST /accounts), per the comment matrix and UC-08.
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @HttpCode(200)
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Public()
  @HttpCode(200)
  @Post("verify")
  verify(@Body() body: VerifyAccessKeyDto) {
    return this.auth.verify(body);
  }

  @Public()
  @HttpCode(200)
  @Post("demo")
  demo(@Body() body: DemoLoginDto) {
    return this.auth.demoLogin(body);
  }

  @Public()
  @HttpCode(200)
  @Post("refresh")
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  // US-41: sign-outs go to the audit trail too
  @ApiBearerAuth()
  @Roles(...STAFF_ROLES)
  @HttpCode(204)
  @Post("logout")
  async logout(@CurrentUser() user: AuthUser) {
    await this.auth.logout(user);
  }
}
