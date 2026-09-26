import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EventBus, type EventEnvelope } from "@wahter/shared";
import { EntriesRepository, type AuditAction } from "./entries.repository";

// Tokens carry the portal role; the audit trail shows the paper's user class
const HOSPITAL_ROLE: Record<string, string> = {
  Doctor: "Physician",
  Nurse: "Nurse",
  IT: "System Administrator",
};

const ACTION_FOR_EVENT: Record<string, AuditAction> = {
  "staff.logged-in": "LOGIN",
  "patient.registered": "CREATE",
  "patient.admitted": "CREATE",
  "patient.transferred": "UPDATE",
  "vitals.recorded": "CREATE",
  "mews.alert.medium": "CREATE",
  "mews.alert.high": "CREATE",
  "alert.acknowledged": "UPDATE",
  "medication.ordered": "CREATE",
  "medication.dispensed": "UPDATE",
  "diagnostic.ordered": "CREATE",
  "diagnostic.resulted": "UPDATE",
  "charge.posted": "CREATE",
  "report.generated": "EXPORT",
};

// A short "what was touched" label built from IDs in the payload only
function resourceFor(event: EventEnvelope) {
  const data = event.data as unknown as Record<string, string | number | undefined>;
  switch (event.type) {
    case "staff.logged-in":
      return "Session";
    case "patient.registered":
      return `Patient ${data.patientId}`;
    case "patient.admitted":
    case "patient.transferred":
      return `Admission ${data.admissionId} (${data.patientId})`;
    case "vitals.recorded":
      return `Vitals ${data.vitalsId} for ${data.patientId}`;
    case "mews.alert.medium":
    case "mews.alert.high":
      return `MEWS alert for ${data.patientId}`;
    case "alert.acknowledged":
      return `Alert ${data.alertId}`;
    case "medication.ordered":
    case "medication.dispensed":
      return `Medication order ${data.orderId}`;
    case "diagnostic.ordered":
    case "diagnostic.resulted":
      return `Diagnostic order ${data.orderId}`;
    case "charge.posted":
      return `Charge ${data.chargeId} (${data.patientId})`;
    case "report.generated":
      return `Report ${data.reportId}`;
    default:
      return event.type;
  }
}

@Injectable()
export class AuditConsumer implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly entries: EntriesRepository,
  ) {}

  async onModuleInit() {
    // "#" matches every routing key: the audit trail sees everything
    await this.bus.subscribe("audit-log.all", ["#"], (event) =>
      this.entries.append({
        eventId: event.eventId,
        eventType: event.type,
        source: event.source,
        actorId: event.actor?.id ?? null,
        // no actor means the system did it (escalation, charge capture)
        actorName: event.actor?.name ?? `System (${event.source})`,
        actorRole: event.actor ? (HOSPITAL_ROLE[event.actor.role] ?? event.actor.role) : "System",
        action: ACTION_FOR_EVENT[event.type] ?? "UPDATE",
        resource: resourceFor(event),
        occurredAt: event.occurredAt,
      }),
    );
  }
}
