import { Injectable, type OnModuleInit } from "@nestjs/common";
import {
  EVENT_TYPES,
  EventBus,
  isStaffRole,
  ROLE_LABELS,
  type EventEnvelope,
  type RecordViewedPayload,
  type RequestDeniedPayload,
} from "@wahter/shared";
import { EntriesRepository, type AuditAction, type AuditOutcome } from "./entries.repository";

const ACTION_FOR_EVENT: Record<string, [AuditAction, AuditOutcome]> = {
  [EVENT_TYPES.loginSucceeded]: ["LOGIN", "Success"],
  [EVENT_TYPES.loginFailed]: ["LOGIN_FAILED", "Failure"],
  [EVENT_TYPES.loggedOut]: ["LOGOUT", "Success"],
  [EVENT_TYPES.accountCreated]: ["CREATE", "Success"],
  [EVENT_TYPES.accountUpdated]: ["UPDATE", "Success"],
  [EVENT_TYPES.accountDisabled]: ["UPDATE", "Success"],
  [EVENT_TYPES.accountRestored]: ["UPDATE", "Success"],
  [EVENT_TYPES.accountLocked]: ["UPDATE", "Success"],
  [EVENT_TYPES.accountUnlocked]: ["UPDATE", "Success"],
  [EVENT_TYPES.roleChanged]: ["UPDATE", "Success"],
  [EVENT_TYPES.approvalRequested]: ["CREATE", "Success"],
  [EVENT_TYPES.approvalDecided]: ["UPDATE", "Success"],
  [EVENT_TYPES.patientRegistered]: ["CREATE", "Success"],
  [EVENT_TYPES.patientAdmitted]: ["CREATE", "Success"],
  [EVENT_TYPES.patientTransferred]: ["UPDATE", "Success"],
  [EVENT_TYPES.vitalsRecorded]: ["CREATE", "Success"],
  [EVENT_TYPES.mewsAlert]: ["CREATE", "Success"],
  [EVENT_TYPES.alertAcknowledged]: ["UPDATE", "Success"],
  [EVENT_TYPES.medicationOrdered]: ["CREATE", "Success"],
  [EVENT_TYPES.medicationDispensed]: ["UPDATE", "Success"],
  [EVENT_TYPES.diagnosticOrdered]: ["CREATE", "Success"],
  [EVENT_TYPES.diagnosticResulted]: ["UPDATE", "Success"],
  [EVENT_TYPES.chargePosted]: ["CREATE", "Success"],
  [EVENT_TYPES.chargePriced]: ["UPDATE", "Success"],
  [EVENT_TYPES.reportGenerated]: ["EXPORT", "Success"],
};

function classify(type: string): [AuditAction, AuditOutcome] {
  if (type.endsWith(".record.viewed")) return ["VIEW", "Success"];
  if (type.endsWith(".request.denied")) return ["ACCESS_DENIED", "Denied"];
  if (type.endsWith(".deleted")) return ["DELETE", "Success"];
  return ACTION_FOR_EVENT[type] ?? ["UPDATE", "Success"];
}

// A short "what was touched" label built from IDs in the payload only
// (RA 10173: no clinical details in the audit trail)
export function resourceFor(event: EventEnvelope) {
  const data = event.data as unknown as Record<string, string | number | undefined>;
  if (event.type.endsWith(".record.viewed")) {
    const viewed = event.data as RecordViewedPayload;
    return `${viewed.record} ${viewed.recordId}`;
  }
  if (event.type.endsWith(".request.denied")) {
    const denied = event.data as RequestDeniedPayload;
    return `${denied.method} ${denied.path} (${denied.status})`;
  }
  switch (event.type) {
    case EVENT_TYPES.loginSucceeded:
    case EVENT_TYPES.loggedOut:
      return `Session (${data.accountId})`;
    case EVENT_TYPES.loginFailed:
      return `Sign-in as "${data.username}": ${data.reason}`;
    case EVENT_TYPES.accountCreated:
      return `Account ${data.accountId} as ${data.role}`;
    case EVENT_TYPES.accountUpdated:
      return `Account ${data.accountId} (${String((event.data as { fields: string[] }).fields.join(", "))})`;
    case EVENT_TYPES.accountDisabled:
      return `Disabled account ${data.accountId} (${data.requestId})`;
    case EVENT_TYPES.accountRestored:
      return `Restored account ${data.accountId}`;
    case EVENT_TYPES.accountLocked:
      return `Locked account ${data.accountId} after ${data.failedAttempts} failed sign-ins`;
    case EVENT_TYPES.accountUnlocked:
      return `Unlocked account ${data.accountId}`;
    case EVENT_TYPES.roleChanged:
      return `Account ${data.accountId} role ${data.fromRole} → ${data.toRole} (${data.requestId})`;
    case EVENT_TYPES.approvalRequested:
      return `${data.kind} request ${data.requestId} for ${data.accountId}`;
    case EVENT_TYPES.approvalDecided:
      return `${data.decision} ${data.kind} request ${data.requestId} for ${data.accountId}`;
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

export function roleLabel(role: string | undefined) {
  if (!role) return "System";
  return isStaffRole(role) ? ROLE_LABELS[role] : role;
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
    await this.bus.subscribe("audit-log.all", ["#"], (event) => {
      const [action, outcome] = classify(event.type);
      // a failed sign-in has no signed-in actor, only the username tried
      const anonymous =
        event.type === EVENT_TYPES.loginFailed
          ? `Unknown (${(event.data as { username: string }).username})`
          : `System (${event.source})`;
      return this.entries.append({
        eventId: event.eventId,
        eventType: event.type,
        source: event.source,
        actorId: event.actor?.id ?? null,
        actorName: event.actor?.name ?? anonymous,
        actorRole: event.actor ? roleLabel(event.actor.role) : event.type === EVENT_TYPES.loginFailed ? "Unknown" : "System",
        action,
        outcome,
        resource: resourceFor(event),
        occurredAt: event.occurredAt,
      });
    });
  }
}
