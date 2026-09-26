"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, currentSession, isApiMode, type ServiceName } from "@/lib/api";
import { fetchCensus, fetchVitals, postVitals } from "@services/clinical-records/frontend/api";
import { fetchAlerts, postAcknowledgement } from "@services/notifications/frontend/api";
import {
  fetchDiagnosticOrders,
  fetchFormulary,
  fetchMedicationOrders,
  postDiagnosticOrder,
  postMedicationOrder,
} from "@services/orders-diagnostics/frontend/api";
import { fetchAdmissions, fetchWards, postAdmission } from "@services/scheduling/frontend/api";
import { calculateMews, implausibleReadings, type VitalSigns } from "@/lib/mews";
import { FORMULARY, LAB_TESTS, MEDICATION_ORDERS, PATIENTS, WARDS } from "@/constants";
import type {
  AdmissionType,
  BedAssignment,
  FormularyItem,
  LabTest,
  MedicationOrder,
  MewsAlert,
  Patient,
  VitalsRecord,
  Ward,
} from "@/types";

// The one place the tab screens get data from. Each service's calls live in
// services/<name>/frontend/api.ts; this file only decides which to use.
//
// Two ways to run, same screens:
//  - "api": the Docker Compose stack is up, so every list comes from its
//    service through Kong and every change is a POST to that service.
//  - "mock": no services (the Vercel preview). Lists start from constants.ts
//    and changes only live in this component's state until a reload.

type DataMode = "api" | "mock";

// the services publish to each other over RabbitMQ; the browser just re-reads
// every so often to pick up what other staff changed
const REFRESH_INTERVAL_MS = 10_000;

interface DataContextValue {
  mode: DataMode;
  isLoading: boolean;
  // services that didn't answer the last refresh, with when each last did.
  // Screens keep the last good data; ServiceOfflineNotice tells staff why.
  offlineServices: OfflineService[];
  patients: Patient[];
  formulary: FormularyItem[];
  labTests: LabTest[];
  medicationOrders: MedicationOrder[];
  wards: Ward[];
  vitalsRecords: VitalsRecord[];
  mewsAlerts: MewsAlert[];
  bedAssignments: BedAssignment[];
  recordVitals: (
    patientId: string,
    vitals: VitalSigns,
    recordedBy: string,
    confirmedImplausible: boolean,
  ) => Promise<VitalsRecord>;
  acknowledgeAlert: (
    alertId: string,
    acknowledgement: { by: string; note?: string; isFalseAlarm?: boolean },
  ) => Promise<void>;
  occupiedBeds: (wardId: string) => number[];
  assignBed: (request: BedRequest) => Promise<{ ok: true } | { ok: false; reason: string }>;
  orderDiagnosticTest: (order: DiagnosticOrderRequest) => Promise<LabTest>;
  prescribe: (order: PrescriptionRequest) => Promise<MedicationOrder>;
}

export interface BedRequest {
  patientId: string;
  wardId: string;
  bedIndex: number;
  admissionType: AdmissionType;
  attendingPhysician: string;
  assignedBy: string;
}

export interface DiagnosticOrderRequest {
  patientId: string;
  test: string;
  kind: "Laboratory" | "Radiology";
  priority: LabTest["priority"];
}

export interface PrescriptionRequest {
  patientId: string;
  drug: string;
  dose: string;
  frequency: string;
  route?: string;
  duration?: string;
  instructions?: string;
  prescribedBy: string;
}

export interface OfflineService {
  service: ServiceName;
  // null if it hasn't answered once since sign-in, so there's no data to show
  lastSeenAt: string | null;
}

const DataContext = createContext<DataContextValue | null>(null);

// ─── MOCK MODE: VITALS & MEWS IN MEMORY ───

let nextRecordNumber = 1;

function buildVitalsRecord(
  patientId: string,
  vitals: VitalSigns,
  recordedBy: string,
  recordedAt: string,
): VitalsRecord {
  const { score, risk } = calculateMews(vitals);
  return {
    id: `VS-${String(nextRecordNumber++).padStart(4, "0")}`,
    patientId,
    recordedAt,
    recordedBy,
    vitals,
    mewsScore: score,
    risk,
    hadImplausibleReading: implausibleReadings(vitals).length > 0,
  };
}

function alertFor(record: VitalsRecord, patientName: string): MewsAlert | null {
  if (record.risk === "Low") return null;
  return {
    id: `AL-${record.id}`,
    vitalsId: record.id,
    patientId: record.patientId,
    patientName,
    mewsScore: record.mewsScore,
    risk: record.risk,
    raisedAt: record.recordedAt,
  };
}

// Same two charted sets as the Clinical Records seed, so both modes open
// with the same alerts
function seedVitals() {
  const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  const seeds: { patientId: string; vitals: VitalSigns; minutes: number }[] = [
    {
      patientId: "WAH-2026-00001",
      vitals: {
        respiratoryRate: 24,
        oxygenSaturation: 91,
        temperature: 38.6,
        systolicBp: 95,
        heartRate: 115,
        consciousness: "Voice",
      },
      minutes: 12,
    },
    {
      patientId: "WAH-2026-00004",
      vitals: {
        respiratoryRate: 22,
        oxygenSaturation: 95,
        temperature: 37.4,
        systolicBp: 112,
        heartRate: 98,
        consciousness: "Alert",
      },
      minutes: 35,
    },
  ];

  const records = seeds.map((seed) =>
    buildVitalsRecord(seed.patientId, seed.vitals, "RN Demo Nurse", minutesAgo(seed.minutes)),
  );
  const alerts = records
    .map((record) => {
      const name = PATIENTS.find((patient) => patient.id === record.patientId)?.name ?? record.patientId;
      return alertFor(record, name);
    })
    .filter((alert): alert is MewsAlert => alert !== null);

  return { records, alerts };
}

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  // API mode needs a signed-in session; without one we stay on the mock
  const mode: DataMode = isApiMode && currentSession() ? "api" : "mock";

  const [seed] = useState(seedVitals);
  const [patients, setPatients] = useState<Patient[]>(() =>
    mode === "api"
      ? []
      : PATIENTS.map((patient) => {
          const record = seed.records.find((candidate) => candidate.patientId === patient.id);
          return record ? { ...patient, mewsScore: record.mewsScore } : patient;
        }),
  );
  const [vitalsRecords, setVitalsRecords] = useState<VitalsRecord[]>(mode === "api" ? [] : seed.records);
  const [mewsAlerts, setMewsAlerts] = useState<MewsAlert[]>(mode === "api" ? [] : seed.alerts);
  const [formulary, setFormulary] = useState<FormularyItem[]>(mode === "api" ? [] : FORMULARY);
  const [labTests, setLabTests] = useState<LabTest[]>(mode === "api" ? [] : LAB_TESTS);
  const [medicationOrders, setMedicationOrders] = useState<MedicationOrder[]>(
    mode === "api" ? [] : MEDICATION_ORDERS,
  );
  const [wards, setWards] = useState<Ward[]>(mode === "api" ? [] : WARDS);
  const [bedAssignments, setBedAssignments] = useState<BedAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(mode === "api");
  const [offlineServices, setOfflineServices] = useState<OfflineService[]>([]);
  // last time each service answered, kept across refreshes
  const [lastSeen] = useState(() => new Map<ServiceName, string>());

  // One call per service. allSettled, because a service being down should
  // blank only its own part of the screen (the paper's fault-isolation goal).
  const loadFromServices = useCallback(async () => {
    const [census, vitals, alerts, wardList, admissions, diagnostics, medications, drugs] = await Promise.allSettled([
      fetchCensus(),
      fetchVitals(),
      fetchAlerts(),
      fetchWards(),
      fetchAdmissions(),
      fetchDiagnosticOrders(),
      fetchMedicationOrders(),
      fetchFormulary(),
    ]);

    if (census.status === "fulfilled") setPatients(census.value);
    if (vitals.status === "fulfilled") setVitalsRecords(vitals.value);
    if (alerts.status === "fulfilled") setMewsAlerts(alerts.value);
    if (wardList.status === "fulfilled") setWards(wardList.value);
    if (admissions.status === "fulfilled") setBedAssignments(admissions.value);
    if (diagnostics.status === "fulfilled") setLabTests(diagnostics.value);
    if (medications.status === "fulfilled") setMedicationOrders(medications.value);
    if (drugs.status === "fulfilled") setFormulary(drugs.value);

    // a service counts as offline if any of its requests failed
    const results: [ServiceName, PromiseSettledResult<unknown>][] = [
      ["clinical-records", census],
      ["clinical-records", vitals],
      ["notifications", alerts],
      ["scheduling", wardList],
      ["scheduling", admissions],
      ["orders-diagnostics", diagnostics],
      ["orders-diagnostics", medications],
      ["orders-diagnostics", drugs],
    ];
    const down = new Set<ServiceName>();
    const now = new Date().toISOString();
    for (const [service, result] of results) {
      if (result.status === "rejected") down.add(service);
    }
    for (const [service] of results) {
      if (!down.has(service)) lastSeen.set(service, now);
    }
    setOfflineServices([...down].map((service) => ({ service, lastSeenAt: lastSeen.get(service) ?? null })));
    setIsLoading(false);
  }, [lastSeen]);

  useEffect(() => {
    if (mode !== "api") return;
    void loadFromServices();
    const timer = setInterval(() => void loadFromServices(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [mode, loadFromServices]);

  async function recordVitals(
    patientId: string,
    vitals: VitalSigns,
    recordedBy: string,
    confirmedImplausible: boolean,
  ) {
    if (mode === "api") {
      // Clinical Records scores MEWS and publishes the alert; we re-read so
      // the new alert and the patient's updated score both show up
      const record = await postVitals(patientId, vitals, confirmedImplausible);
      await loadFromServices();
      return record;
    }

    const record = buildVitalsRecord(patientId, vitals, recordedBy, new Date().toISOString());
    const patientName = patients.find((patient) => patient.id === patientId)?.name ?? patientId;

    // charting always succeeds; the alert is a side effect, never a blocker (UC-05 6a)
    setVitalsRecords((current) => [record, ...current]);
    setPatients((current) =>
      current.map((patient) =>
        patient.id === patientId ? { ...patient, mewsScore: record.mewsScore } : patient,
      ),
    );
    const alert = alertFor(record, patientName);
    if (alert) setMewsAlerts((current) => [alert, ...current]);
    return record;
  }

  // ─── beds ───
  // Wards only give a count of beds taken before go-live, so the first
  // `occupied` beds of each grid count as taken by patients we don't have
  // records for. Admissions after that are tracked bed by bed.
  function occupiedBeds(wardId: string) {
    const ward = wards.find((candidate) => candidate.id === wardId);
    if (!ward) return [];
    const baseline = Array.from({ length: ward.occupied }, (_, index) => index);
    const assigned = bedAssignments
      .filter((assignment) => assignment.wardId === wardId)
      .map((assignment) => assignment.bedIndex);
    return [...baseline, ...assigned];
  }

  async function assignBed(request: BedRequest): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (mode === "api") {
      try {
        // Scheduling holds the real bed lock (a unique index), so a bed another
        // nurse took a second ago comes back as a 409 here
        await postAdmission({
          patientId: request.patientId,
          wardId: request.wardId,
          bedIndex: request.bedIndex,
          admissionType: request.admissionType,
          attendingPhysician: request.attendingPhysician,
        });
        await loadFromServices();
        return { ok: true };
      } catch (error) {
        await loadFromServices();
        return { ok: false, reason: error instanceof ApiError ? error.message : "Couldn't reach Scheduling." };
      }
    }

    // mock mode: checked against current state right before writing
    if (occupiedBeds(request.wardId).includes(request.bedIndex)) {
      return { ok: false, reason: "That bed was just taken. Please pick another one." };
    }
    const ward = wards.find((candidate) => candidate.id === request.wardId);
    if (!ward || request.bedIndex < 0 || request.bedIndex >= ward.capacity) {
      return { ok: false, reason: "That bed doesn't exist in this ward." };
    }

    // one active bed per patient (UC-04 BR-02): a new assignment replaces the old one
    setBedAssignments((current) => [
      ...current.filter((assignment) => assignment.patientId !== request.patientId),
      {
        patientId: request.patientId,
        wardId: request.wardId,
        bedIndex: request.bedIndex,
        admissionType: request.admissionType,
        attendingPhysician: request.attendingPhysician,
        assignedBy: request.assignedBy,
        assignedAt: new Date().toISOString(),
      },
    ]);
    return { ok: true };
  }

  async function acknowledgeAlert(
    alertId: string,
    acknowledgement: { by: string; note?: string; isFalseAlarm?: boolean },
  ) {
    if (mode === "api") {
      try {
        await postAcknowledgement(alertId, {
          note: acknowledgement.note,
          isFalseAlarm: acknowledgement.isFalseAlarm ?? false,
        });
      } finally {
        // on a 409 someone else acknowledged first; re-reading shows who
        await loadFromServices();
      }
      return;
    }

    setMewsAlerts((current) =>
      current.map((alert) =>
        // already-acknowledged alerts stay as they were (UC-08 BR-03: immutable)
        alert.id === alertId && !alert.acknowledgedAt
          ? {
              ...alert,
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: acknowledgement.by,
              note: acknowledgement.note,
              isFalseAlarm: acknowledgement.isFalseAlarm,
            }
          : alert,
      ),
    );
  }

  async function orderDiagnosticTest(order: DiagnosticOrderRequest) {
    if (mode === "api") {
      const test = await postDiagnosticOrder(order);
      setLabTests((current) => [test, ...current]);
      return test;
    }

    const patient = patients.find((candidate) => candidate.id === order.patientId);
    const prefix = order.kind === "Laboratory" ? "LAB" : "RAD";
    const test: LabTest = {
      id: `${prefix}-${5600 + labTests.length}`,
      patientId: order.patientId,
      patient: patient?.name ?? order.patientId,
      test: order.test,
      priority: order.priority,
      status: "Pending",
      time: "just now",
    };
    setLabTests((current) => [test, ...current]);
    return test;
  }

  async function prescribe(order: PrescriptionRequest) {
    if (mode === "api") {
      const created = await postMedicationOrder({
        patientId: order.patientId,
        drug: order.drug,
        dose: order.dose,
        frequency: order.frequency,
        route: order.route,
        duration: order.duration,
        instructions: order.instructions,
      });
      setMedicationOrders((current) => [created, ...current]);
      return created;
    }

    const patient = patients.find((candidate) => candidate.id === order.patientId);
    const created: MedicationOrder = {
      id: `RX-${1001 + medicationOrders.length}`,
      patientId: order.patientId,
      patientName: patient?.name ?? order.patientId,
      drug: order.drug,
      dose: order.dose,
      frequency: order.frequency,
      route: order.route ?? null,
      duration: order.duration ?? null,
      status: "Pending",
      prescribedBy: order.prescribedBy,
      orderedAt: new Date().toISOString(),
    };
    setMedicationOrders((current) => [created, ...current]);
    return created;
  }

  return (
    <DataContext.Provider
      value={{
        mode,
        isLoading,
        offlineServices,
        patients,
        formulary,
        labTests,
        medicationOrders,
        wards,
        vitalsRecords,
        mewsAlerts,
        bedAssignments,
        recordVitals,
        acknowledgeAlert,
        occupiedBeds,
        assignBed,
        orderDiagnosticTest,
        prescribe,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData() must be called inside <DataProvider>");
  }
  return context;
}
