import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "scheduling",
  title: "Scheduling Service",
  description: "Wards, bed assignment, admissions, and transfers (UC-03, UC-04).",
});
