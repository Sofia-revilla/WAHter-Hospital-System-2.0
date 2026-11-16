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
  // Patient Registry (the brief names these three without a service prefix)
  patientRegistered: "patient.registered",
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
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export type RiskLevel = "Low" | "Medium" | "High";

export interface EventPayloads {
  "access.login.succeeded": { accountId: string; role: string };
  "patient.registered": { patientId: string };
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
