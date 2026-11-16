import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "billing-revenue-cycle",
  title: "Billing & Revenue Cycle Service",
  description: "Charge capture from clinical events and pricing; invoices and eClaims come later (UC-06).",
});
