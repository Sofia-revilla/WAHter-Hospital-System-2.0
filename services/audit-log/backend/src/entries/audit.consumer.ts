import { Injectable, type OnModuleInit } from "@nestjs/common";
import { EVENT_TYPES, EventBus, isStaffRole, ROLE_LABELS, type EventEnvelope } from "@wahter/shared";
import { EntriesRepository, type AuditAction } from "./entries.repository";

const ACTION_FOR_EVENT: Record<string, AuditAction> = {
  [EVENT_TYPES.loginSucceeded]: "LOGIN",
  [EVENT_TYPES.patientRegistered]: "CREATE",
  [EVENT_TYPES.patientAdmitted]: "CREATE",
  [EVENT_TYPES.patientTransferred]: "UPDATE",
  [EVENT_TYPES.vitalsRecorded]: "CREATE",
  [EVENT_TYPES.mewsAlert]: "CREATE",
  [EVENT_TYPES.alertAcknowledged]: "UPDATE",
  [EVENT_TYPES.medicationOrdered]: "CREATE",
  [EVENT_TYPES.medicationDispensed]: "UPDATE",
  [EVENT_TYPES.diagnosticOrdered]: "CREATE",
  [EVENT_TYPES.diagnosticResulted]: "UPDATE",
  [EVENT_TYPES.chargePosted]: "CREATE",
  [EVENT_TYPES.chargePriced]: "UPDATE",
  [EVENT_TYPES.reportGenerated]: "EXPORT",
};

// A short "what was touched" label built from IDs in the payload only
function resourceFor(event: EventEnvelope) {
  const data = event.data as unknown as Record<string, string | number | undefined>;
  switch (event.type) {
    case EVENT_TYPES.loginSucceeded:
      return "Session";
    case EVENT_TYPES.patientRegistered:
      return `Patient ${data.patientId}`;
    case EVENT_TYPES.patientAdmitted:
    case EVENT_TYPES.patientTransferred:
      return `Admission ${data.admissionId} (${data.patientId})`;
    case EVENT_TYPES.vitalsRecorded:
      return `Vitals ${data.vitalsId} for ${data.patientId}`;
    case EVENT_TYPES.mewsAlert:
      return `MEWS alert for ${data.patientId}`;
    case EVENT_TYPES.alertAcknowledged:
      return `Alert ${data.alertId}`;
    case EVENT_TYPES.medicationOrdered:
    case EVENT_TYPES.medicationDispensed:
      return `Medication order ${data.orderId}`;
    case EVENT_TYPES.diagnosticOrdered:
    case EVENT_TYPES.diagnosticResulted:
      return `Diagnostic order ${data.orderId}`;
    case EVENT_TYPES.chargePosted:
    case EVENT_TYPES.chargePriced:
      return `Charge ${data.chargeId} (${data.patientId})`;
    case EVENT_TYPES.reportGenerated:
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
    // "#" matches every routing key: the audit trail sees everything. The
    // actor's name is kept here on purpose, unlike everywhere else: an audit
    // record has to say who did it as they were named at the time.
    await this.bus.subscribe("audit-log.all", ["#"], (event) =>
      this.entries.append({
        eventId: event.eventId,
        eventType: event.type,
        source: event.source,
        actorId: event.actor?.id ?? null,
        // no actor means the system did it (escalation, charge capture)
        actorName: event.actor?.name ?? `System (${event.source})`,
        actorRole: event.actor && isStaffRole(event.actor.role) ? ROLE_LABELS[event.actor.role] : "System",
        action: ACTION_FOR_EVENT[event.type] ?? "UPDATE",
        resource: resourceFor(event),
        occurredAt: event.occurredAt,
      }),
    );
  }
}
