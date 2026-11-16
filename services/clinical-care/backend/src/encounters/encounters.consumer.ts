import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EVENT_TYPES, EventBus, type EventPayloads } from "@wahter/shared";
import { EncountersRepository } from "./encounters.repository";

// Admission opens the clinical encounter (UC-02 → UC-03), in the department
// of the ward the patient went to. The department comes on the event, so this
// still works while Patient Flow is busy or down. A transfer to another
// ward's department moves the encounter with them.
@Injectable()
export class EncountersConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly encounters: EncountersRepository,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe(
      "clinical-care.encounters",
      [EVENT_TYPES.patientAdmitted, EVENT_TYPES.patientTransferred],
      async (event) => {
        if (event.type === EVENT_TYPES.patientAdmitted) {
          const data = event.data as EventPayloads["flow.patient.admitted"];
          await this.encounters.open(data.patientId, data.department, event.occurredAt);
        } else {
          const data = event.data as EventPayloads["flow.patient.transferred"];
          await this.encounters.moveDepartment(data.patientId, data.department);
        }
      },
    );
  }
}
