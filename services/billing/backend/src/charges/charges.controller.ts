import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiProperty, ApiQuery, ApiTags } from "@nestjs/swagger";
import { IsNumber, IsString, Max, Min, MinLength } from "class-validator";
import { CurrentUser, Roles, type AuthUser } from "@wahter/shared";
import { ChargesService } from "./charges.service";

class PriceChargeDto {
  @ApiProperty({ example: 250 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1_000_000)
  unitAmount: number;

  @ApiProperty({ example: "Priced from the supplier invoice" })
  @IsString()
  @MinLength(3)
  reason: string;
}

// UC-12: Billing Staff (and the Hospital Admin, whose portal comes later)
@ApiTags("charges")
@ApiBearerAuth()
@Roles("Billing", "Hospital Administrator")
@Controller()
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @ApiQuery({ name: "patientId", required: false })
  @Get("charges")
  list(@Query("patientId") patientId?: string) {
    return this.charges.list(patientId);
  }

  @Get("accounts")
  accounts() {
    return this.charges.accounts();
  }

  @HttpCode(200)
  @Post("charges/:id/price")
  price(@Param("id") id: string, @Body() body: PriceChargeDto, @CurrentUser() user: AuthUser) {
    return this.charges.price(id, body, user);
  }
}
