// Event contracts for the RabbitMQ bus. Everything goes through one topic
// exchange; the routing key is the event type, named service.thing.action,
// so a consumer can bind to "clinical.mews.*" or "#" (Audit Log takes everything).
//
// Adding an event: add its key to EVENT_TYPES and its payload to EventPayloads.
// Payloads carry reference IDs, never copies of patient or provider details:
// those stay in the Patient Registry and the Access & Provider Registry
// (comment matrix 3 and 7). No clinical notes either, since Audit Log stores
// every envelope it receives (RA 10173).

export const EVENT_EXCHANGE = "wah.events";
export const DEAD_LETTER_EXCHANGE = "wah.events.dlx";
export const DEAD_LETTER_QUEUE = "wah.events.dead-letter";

export const EVENT_TYPES = {
  // Access & Provider Registry
  loginSucceeded: "access.login.succeeded",
  loginFailed: "access.login.failed",
  loggedOut: "access.login.ended",
  accountCreated: "access.account.created",
  accountUpdated: "access.account.updated",
  accountDisabled: "access.account.disabled",
  accountRestored: "access.account.restored",
  accountLocked: "access.account.locked",
  accountUnlocked: "access.account.unlocked",
  roleChanged: "access.role.changed",
  approvalRequested: "access.approval.requested",
  approvalDecided: "access.approval.decided",
  // Kong turned a call away (no token, wrong role); see audit-log's gateway consumer
  gatewayDenied: "gateway.request.denied",
  // Patient Registry (the brief names these three without a service prefix)
  patientRegistered: "patient.registered",
  patientUpdated: "patient.updated",
  patientMerged: "patient.merged",
  identityReviewFlagged: "patient.review.flagged",
  identityReviewResolved: "patient.review.resolved",
  // Patient Flow
  patientAdmitted: "flow.patient.admitted",
  patientTransferred: "flow.patient.transferred",
  // Clinical Care
  vitalsRecorded: "clinical.vitals.recorded",
  mewsAlert: "clinical.mews.alert",
  // Notifications
  alertAcknowledged: "notifications.alert.acknowledged",
  // Pharmacy
  medicationOrdered: "pharmacy.medication.ordered",
  medicationDispensed: "pharmacy.medication.dispensed",
  // Diagnostics
  diagnosticOrdered: "diagnostics.order.placed",
  diagnosticResulted: "diagnostics.result.released",
  // Billing & Revenue Cycle
  chargePosted: "billing.charge.posted",
  chargePriced: "billing.charge.priced",
  // Interoperability & Reporting
  reportGenerated: "reporting.report.generated",
  // a record's exchange with WAH Systems changed state (UC-01 9a, UC-09)
  exchangeUpdated: "interop.exchange.updated",
} as const;

// Two events every service can publish under its own name (US-41): someone
// opened a clinical or financial record, or a service's role guard said no.
export type RecordViewedEvent = `${string}.record.viewed`;
export type RequestDeniedEvent = `${string}.request.denied`;

export const recordViewedEvent = (service: string): RecordViewedEvent => `${service}.record.viewed`;
export const requestDeniedEvent = (service: string): RequestDeniedEvent => `${service}.request.denied`;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES] | RecordViewedEvent | RequestDeniedEvent;

export type RiskLevel = "Low" | "Medium" | "High";

export interface RecordViewedPayload {
  // what kind of record, e.g. "Patient chart", "Billing account"
  record: string;
  recordId: string;
  // the patient it belongs to, when there is one
  patientId?: string;
}

export interface RequestDeniedPayload {
  method: string;
  path: string;
  status: 401 | 403;
  reason: string;
}

export interface EventPayloads {
  [type: RecordViewedEvent]: RecordViewedPayload;
  [type: RequestDeniedEvent]: RequestDeniedPayload;
  "access.login.succeeded": { accountId: string; role: string };
  // username only; the attempt may not match any account
  "access.login.failed": { username: string; reason: string; accountId: string | null };
  "access.login.ended": { accountId: string };
  "access.account.created": { accountId: string; staffId: string; role: string };
  "access.account.updated": { accountId: string; fields: string[] };
  "access.account.disabled": { accountId: string; requestId: string };
  "access.account.restored": { accountId: string };
  "access.account.locked": { accountId: string; failedAttempts: number };
  "access.account.unlocked": { accountId: string };
  "access.role.changed": { accountId: string; fromRole: string; toRole: string; requestId: string };
  "access.approval.requested": { requestId: string; kind: string; accountId: string };
  "access.approval.decided": { requestId: string; kind: string; accountId: string; decision: "Approved" | "Rejected" };
  "gateway.request.denied": RequestDeniedPayload & { service: string };
  "patient.registered": { patientId: string };
  // field names only, never the values (they're in the registry)
  "patient.updated": { patientId: string; fields: string[] };
  // sourceId is folded into targetId; sourceId stays readable and points at it
  "patient.merged": { sourceId: string; targetId: string; reviewId: string | null };
  "patient.review.flagged": { reviewId: string; patientId: string; candidateId: string };
  "patient.review.resolved": { reviewId: string; outcome: "Merged" | "KeptSeparate" };
  "interop.exchange.updated": {
    transactionId: string;
    resourceType: string;
    resourceId: string;
    status: "Pending" | "Sent" | "Rejected";
    error: string | null;
  };
  "flow.patient.admitted": {
    patientId: string;
    admissionId: string;
    wardId: string;
    bedIndex: number;
    admissionType: string;
    attendingPhysicianId: string;
  };
  "flow.patient.transferred": {
    patientId: string;
    admissionId: string;
    fromWardId: string;
    fromBedIndex: number;
    wardId: string;
    bedIndex: number;
  };
  "clinical.vitals.recorded": { vitalsId: string; patientId: string; mewsScore: number; risk: RiskLevel };
  "clinical.mews.alert": MewsAlertPayload;
  "notifications.alert.acknowledged": { alertId: string; patientId: string; isFalseAlarm: boolean };
  "pharmacy.medication.ordered": { orderId: string; patientId: string; drug: string };
  "pharmacy.medication.dispensed": { orderId: string; patientId: string; drug: string; quantity: number };
  "diagnostics.order.placed": {
    orderId: string;
    patientId: string;
    test: string;
    kind: "Laboratory" | "Radiology";
    priority: "Urgent" | "Routine";
  };
  "diagnostics.result.released": { orderId: string; patientId: string; isCritical: boolean };
  "billing.charge.posted": { chargeId: string; patientId: string; amount: number; source: string };
  "billing.charge.priced": { chargeId: string; patientId: string; amount: number };
  "reporting.report.generated": { reportId: string; kind: string; period: string };
}

export interface MewsAlertPayload {
  vitalsId: string;
  patientId: string;
  mewsScore: number;
  risk: "Medium" | "High";
  raisedAt: string;
}

// What actually travels on the bus. eventId makes consumers idempotent:
// RabbitMQ delivers at-least-once, so the same envelope can arrive twice.
export interface EventEnvelope<T extends EventType = EventType> {
  eventId: string;
  type: T;
  occurredAt: string;
  source: string;
  // who caused it, when a person did (null for system events like escalation)
  actor: { id: string; name: string; role: string } | null;
  data: EventPayloads[T];
}
