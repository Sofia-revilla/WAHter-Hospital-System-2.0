import { bootstrapService } from "@wahter/shared";
import { AppModule } from "./app.module";

void bootstrapService(AppModule, {
  name: "interoperability",
  title: "Interoperability Service",
  description: "FHIR R4 read endpoints and DOH report exports (UC-14, UC-15).",
});
