// Event contracts for the RabbitMQ bus. Everything goes through one topic
// exchange; the routing key is the event type, so a consumer can bind to
// "mews.alert.*" or "#" (Audit Log takes everything).
//
// Adding an event: add its key to EVENT_TYPES and its payload to EventPayloads.
// Payloads carry IDs and the minimum fields other services need. No clinical
// notes, since Audit Log stores every envelope it receives (RA 10173).

export const EVENT_EXCHANGE = "wah.events";
export const DEAD_LETTER_EXCHANGE = "wah.events.dlx";
export const DEAD_LETTER_QUEUE = "wah.events.dead-letter";

export const EVENT_TYPES = {
  // Identity
  staffLoggedIn: "staff.logged-in",
  patientRegistered: "patient.registered",
  // Scheduling
  patientAdmitted: "patient.admitted",
  patientTransferred: "patient.transferred",
  // Clinical Records
  vitalsRecorded: "vitals.recorded",
  mewsAlertMedium: "mews.alert.medium",
  mewsAlertHigh: "mews.alert.high",
  // Notifications
  alertAcknowledged: "alert.acknowledged",
  // Orders & Diagnostics
  medicationOrdered: "medication.ordered",
  medicationDispensed: "medication.dispensed",
  diagnosticOrdered: "diagnostic.ordered",
  diagnosticResulted: "diagnostic.resulted",
  // Billing
  chargePosted: "charge.posted",
  // Interoperability
  reportGenerated: "report.generated",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export type RiskLevel = "Low" | "Medium" | "High";

export interface EventPayloads {
  "staff.logged-in": { staffId: string; role: string };
  "patient.registered": {
    patientId: string;
    name: string;
    sex: "Male" | "Female";
    birthDate: string;
    philhealthPin: string | null;
  };
  "patient.admitted": {
    patientId: string;
    admissionId: string;
    wardId: string;
    bedIndex: number;
    admissionType: string;
    attendingPhysician: string;
  };
  "patient.transferred": {
    patientId: string;
    admissionId: string;
    fromWardId: string;
    fromBedIndex: number;
    wardId: string;
    bedIndex: number;
  };
  "vitals.recorded": { vitalsId: string; patientId: string; mewsScore: number; risk: RiskLevel };
  "mews.alert.medium": MewsAlertPayload;
  "mews.alert.high": MewsAlertPayload;
  "alert.acknowledged": { alertId: string; patientId: string; isFalseAlarm: boolean };
  "medication.ordered": { orderId: string; patientId: string; drug: string };
  "medication.dispensed": { orderId: string; patientId: string; drug: string; quantity: number };
  "diagnostic.ordered": {
    orderId: string;
    patientId: string;
    test: string;
    kind: "Laboratory" | "Radiology";
    priority: "Urgent" | "Routine";
  };
  "diagnostic.resulted": { orderId: string; patientId: string; isCritical: boolean };
  "charge.posted": { chargeId: string; patientId: string; amount: number; source: string };
  "report.generated": { reportId: string; kind: string; period: string };
}

export interface MewsAlertPayload {
  vitalsId: string;
  patientId: string;
  patientName: string;
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
