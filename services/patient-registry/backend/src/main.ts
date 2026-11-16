import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "patient-registry",
  title: "Patient Registry Service (MPI)",
  description: "The DOH-mandated patient registry: registration, validation, and MPI matching (UC-01).",
});
