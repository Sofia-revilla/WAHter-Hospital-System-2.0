"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, currentSession, isApiMode, type ServiceName } from "@/lib/api";
import { fetchCharges, postChargePrice } from "@services/billing/frontend/api";
import { fetchCensus, fetchVitals, postVitals } from "@services/clinical-records/frontend/api";
import { fetchAlerts, postAcknowledgement } from "@services/notifications/frontend/api";
import {
  fetchDiagnosticOrders,
  fetchFormulary,
  fetchMedicationOrders,
  postDiagnosticOrder,
  postDispense,
  postMedicationOrder,
} from "@services/orders-diagnostics/frontend/api";
import { fetchAdmissions, fetchWards, postAdmission } from "@services/scheduling/frontend/api";
import { calculateMews, implausibleReadings, type VitalSigns } from "@/lib/mews";
import { CHARGES, FORMULARY, LAB_TESTS, MEDICATION_ORDERS, PATIENTS, WARDS } from "@/constants";
import type {
  AdmissionType,
  BedAssignment,
  Charge,
  FormularyItem,
  LabTest,
  MedicationOrder,
  MewsAlert,
  Patient,
  StaffRole,
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
// every so often to pick up what other staff changed, and to notice a
// service that stopped or came back without anyone reloading the page
const REFRESH_INTERVAL_MS = 5_000;

// What each portal reads. A pharmacist's screen never waits on (or gets a
// 403 from) Clinical Records, and IT's screens load their own data.
type LoadKey =
  | "census"
  | "vitals"
  | "alerts"
  | "wards"
  | "admissions"
  | "diagnostics"
  | "medications"
  | "formulary"
  | "charges";

const CLINICAL_LOADS: LoadKey[] = [
  "census",
  "vitals",
  "alerts",
  "wards",
  "admissions",
  "diagnostics",
  "medications",
  "formulary",
];

const LOADS_BY_ROLE: Record<StaffRole, LoadKey[]> = {
  Doctor: CLINICAL_LOADS,
  Nurse: CLINICAL_LOADS,
  Pharmacist: ["medications", "formulary"],
  Billing: ["charges"],
  IT: [],
};

const SERVICE_FOR_LOAD: Record<LoadKey, ServiceName> = {
  census: "clinical-records",
  vitals: "clinical-records",
  alerts: "notifications",
  wards: "scheduling",
  admissions: "scheduling",
  diagnostics: "orders-diagnostics",
  medications: "orders-diagnostics",
  formulary: "orders-diagnostics",
  charges: "billing",
};

export interface LoadStep {
  service: ServiceName;
  state: "loading" | "ready" | "offline";
}

interface DataContextValue {
  mode: DataMode;
  // re-read everything now (opening a tab calls this, so it's never stale)
  refreshNow: () => void;
  // true until the first load after sign-in finishes (WorkspaceLoader)
  isLoading: boolean;
  // per-service progress of that first load, for the loading screen
  loadSteps: LoadStep[];
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
  charges: Charge[];
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
  dispenseMedication: (orderId: string, quantity: number, note?: string, by?: string) => Promise<MedicationOrder>;
  priceCharge: (chargeId: string, unitAmount: number, reason: string) => Promise<Charge>;
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
  const [charges, setCharges] = useState<Charge[]>(mode === "api" ? [] : CHARGES);
  const [isLoading, setIsLoading] = useState(mode === "api");
  const [loadSteps, setLoadSteps] = useState<LoadStep[]>([]);
  const [offlineServices, setOfflineServices] = useState<OfflineService[]>([]);
  // last time each service answered, kept across refreshes
  const [lastSeen] = useState(() => new Map<ServiceName, string>());

  // Every call is independent (allSettled), because a service being down
  // should blank only its own part of the screen (the paper's fault-isolation
  // goal). Only "can't reach it" counts as offline; a 403 is a bug, not an outage.
  const loadFromServices = useCallback(
    async (isFirstLoad = false) => {
      const role = currentSession()?.user.role;
      if (!role) return;

      const loaders: Record<LoadKey, () => Promise<void>> = {
        census: () => fetchCensus().then(setPatients),
        vitals: () => fetchVitals().then(setVitalsRecords),
        alerts: () => fetchAlerts().then(setMewsAlerts),
        wards: () => fetchWards().then(setWards),
        admissions: () => fetchAdmissions().then(setBedAssignments),
        diagnostics: () => fetchDiagnosticOrders().then(setLabTests),
        medications: () => fetchMedicationOrders().then(setMedicationOrders),
        formulary: () => fetchFormulary().then(setFormulary),
        charges: () => fetchCharges().then(setCharges),
      };

      const keys = LOADS_BY_ROLE[role];
      const services = [...new Set(keys.map((key) => SERVICE_FOR_LOAD[key]))];
      const pendingByService = new Map(
        services.map((service) => [service, keys.filter((key) => SERVICE_FOR_LOAD[key] === service).length]),
      );
      const down = new Set<ServiceName>();
      if (isFirstLoad) setLoadSteps(services.map((service) => ({ service, state: "loading" })));

      await Promise.all(
        keys.map(async (key) => {
          const service = SERVICE_FOR_LOAD[key];
          try {
            await loaders[key]();
          } catch (error) {
            if (error instanceof ApiError && error.isServiceDown) down.add(service);
          }
          const left = pendingByService.get(service)! - 1;
          pendingByService.set(service, left);
          // a service's step settles once all of its calls have answered
          if (isFirstLoad && left === 0) {
            setLoadSteps((steps) =>
              steps.map((step) =>
                step.service === service ? { ...step, state: down.has(service) ? "offline" : "ready" } : step,
              ),
            );
          }
        }),
      );

      const now = new Date().toISOString();
      for (const service of services) {
        if (!down.has(service)) lastSeen.set(service, now);
      }
      setOfflineServices([...down].map((service) => ({ service, lastSeenAt: lastSeen.get(service) ?? null })));
      setIsLoading(false);
    },
    [lastSeen],
  );

  // one refresh at a time; a slow service shouldn't pile up requests behind it
  const isRefreshing = useRef(false);
  const refreshNow = useCallback(() => {
    if (mode !== "api" || isRefreshing.current) return;
    isRefreshing.current = true;
    void loadFromServices().finally(() => {
      isRefreshing.current = false;
    });
  }, [mode, loadFromServices]);

  useEffect(() => {
    if (mode !== "api") return;
    isRefreshing.current = true;
    void loadFromServices(true).finally(() => {
      isRefreshing.current = false;
    });
    const timer = setInterval(refreshNow, REFRESH_INTERVAL_MS);
    // browsers slow timers down in background tabs, so check straight away
    // when someone comes back to the window
    const onReturn = () => {
      if (document.visibilityState === "visible") refreshNow();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", refreshNow);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", refreshNow);
    };
  }, [mode, loadFromServices, refreshNow]);

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

  async function dispenseMedication(orderId: string, quantity: number, note?: string, by = "Pharmacist") {
    if (mode === "api") {
      const dispensed = await postDispense(orderId, quantity, note);
      setMedicationOrders((current) => current.map((order) => (order.id === orderId ? dispensed : order)));
      return dispensed;
    }

    const order = medicationOrders.find((candidate) => candidate.id === orderId);
    if (!order) throw new Error(`No medication order ${orderId}`);
    if (order.status !== "Pending") throw new Error("Only a pending order can be dispensed.");
    if (order.isControlled) throw new Error("Controlled drugs need a second pharmacist's approval.");
    const dispensed: MedicationOrder = {
      ...order,
      status: "Dispensed",
      dispensedQuantity: quantity,
      dispensedBy: by,
      dispensedAt: new Date().toISOString(),
    };
    setMedicationOrders((current) => current.map((candidate) => (candidate.id === orderId ? dispensed : candidate)));
    return dispensed;
  }

  async function priceCharge(chargeId: string, unitAmount: number, reason: string) {
    if (mode === "api") {
      const priced = await postChargePrice(chargeId, unitAmount, reason);
      setCharges((current) => current.map((charge) => (charge.id === chargeId ? priced : charge)));
      return priced;
    }

    const charge = charges.find((candidate) => candidate.id === chargeId);
    if (!charge) throw new Error(`No charge ${chargeId}`);
    const priced: Charge = { ...charge, unitAmount, amount: unitAmount * charge.quantity, isUnpriced: false };
    setCharges((current) => current.map((candidate) => (candidate.id === chargeId ? priced : candidate)));
    return priced;
  }

  return (
    <DataContext.Provider
      value={{
        mode,
        refreshNow,
        isLoading,
        loadSteps,
        offlineServices,
        patients,
        formulary,
        labTests,
        medicationOrders,
        wards,
        vitalsRecords,
        mewsAlerts,
        bedAssignments,
        charges,
        recordVitals,
        acknowledgeAlert,
        occupiedBeds,
        assignBed,
        orderDiagnosticTest,
        prescribe,
        dispenseMedication,
        priceCharge,
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
