import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "patient-flow",
  title: "Patient Flow Service",
  description: "Wards, beds, admissions, and transfers; scheduling and discharge come later (UC-02).",
});
