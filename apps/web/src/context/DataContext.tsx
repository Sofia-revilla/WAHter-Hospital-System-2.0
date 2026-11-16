"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, currentSession, timeAgo, type ServiceName } from "@/lib/api";
import { fetchProviders } from "@services/access-provider-registry/frontend/api";
import { fetchCharges, postChargePrice, type ChargeRecord } from "@services/billing-revenue-cycle/frontend/api";
import { fetchCensus, fetchVitals, postVitals, type CensusEntry, type VitalsResponse } from "@services/clinical-care/frontend/api";
import { fetchDiagnosticOrders, postDiagnosticOrder, type DiagnosticOrderRecord } from "@services/diagnostics/frontend/api";
import { fetchAlerts, postAcknowledgement, type MewsAlertRecord } from "@services/notifications/frontend/api";
import { fetchAdmissions, fetchBedBoard, type AdmissionRecord, type BoardWard } from "@services/patient-flow/frontend/api";
import { fetchPatientsByIds, type PatientIdentity } from "@services/patient-registry/frontend/api";
import {
  fetchFormulary,
  fetchMedicationOrders,
  postDispense,
  postMedicationOrder,
  type MedicationOrderRecord,
} from "@services/pharmacy/frontend/api";
import type { VitalSigns } from "@/lib/mews";
import type {
  BedAssignment,
  Charge,
  FormularyItem,
  LabTest,
  MedicationOrder,
  MewsAlert,
  Patient,
  Provider,
  StaffRole,
  VitalsRecord,
  Ward,
} from "@/types";

// The one place the tab screens get data from. Each service's calls live in
// services/<name>/frontend/api.ts; this file decides what each portal loads
// and puts the pieces together.
//
// The services only send reference IDs (comment matrix 3 and 7): a patient
// ID, a provider ID. The names on screen come from the Patient Registry and
// the provider registry, looked up here and kept in two small directories.

// the services publish to each other over RabbitMQ; the browser just re-reads
// every so often to pick up what other staff changed, and to notice a
// service that stopped or came back without anyone reloading the page
const REFRESH_INTERVAL_MS = 5_000;
// the provider list barely changes during a shift
const PROVIDER_REFRESH_MS = 5 * 60_000;

// What each portal reads. A pharmacist's screen never waits on (or gets a
// 403 from) Clinical Care, and the System Administrator's screens load their own data.
type LoadKey =
  | "census"
  | "vitals"
  | "alerts"
  | "board"
  | "admissions"
  | "diagnostics"
  | "medications"
  | "formulary"
  | "charges";

const CLINICAL_LOADS: LoadKey[] = [
  "census",
  "vitals",
  "alerts",
  "board",
  "admissions",
  "diagnostics",
  "medications",
  "formulary",
];

const LOADS_BY_ROLE: Record<StaffRole, LoadKey[]> = {
  // the bed board and open admissions (Admission and Bed Board)
  AdmittingClerk: ["board", "admissions"],
  Physician: CLINICAL_LOADS,
  Nurse: CLINICAL_LOADS,
  Pharmacist: ["medications", "formulary"],
  LaboratoryStaff: [],
  RadiologyStaff: [],
  BillingStaff: ["charges"],
  HospitalAdministrator: [],
  SystemAdministrator: [],
};

// Roles that see patient names. The System Administrator never does (RA 10173).
const READS_PATIENT_NAMES: StaffRole[] = [
  "AdmittingClerk",
  "Physician",
  "Nurse",
  "Pharmacist",
  "LaboratoryStaff",
  "RadiologyStaff",
  "BillingStaff",
];

const SERVICE_FOR_LOAD: Record<LoadKey, ServiceName> = {
  census: "clinical-care",
  vitals: "clinical-care",
  alerts: "notifications",
  board: "patient-flow",
  admissions: "patient-flow",
  diagnostics: "diagnostics",
  medications: "pharmacy",
  formulary: "pharmacy",
  charges: "billing-revenue-cycle",
};

export interface LoadStep {
  service: ServiceName;
  state: "loading" | "ready" | "offline";
}

interface DataContextValue {
  // re-read everything now (opening a tab calls this, so it's never stale)
  refreshNow: () => void;
  // true until the first load after sign-in finishes (WorkspaceLoader)
  isLoading: boolean;
  // per-service progress of that first load, for the loading screen
  loadSteps: LoadStep[];
  // services that didn't answer the last refresh, with when each last did.
  // Screens keep the last good data; ServiceOfflineNotice tells staff why.
  offlineServices: OfflineService[];
  // every service this portal uses is unreachable, i.e. the system is down
  isSystemOffline: boolean;
  patients: Patient[];
  formulary: FormularyItem[];
  labTests: LabTest[];
  medicationOrders: MedicationOrder[];
  wards: Ward[];
  // US-9: every ward, room, and bed, as Patient Flow sends it
  bedBoard: BoardWard[];
  vitalsRecords: VitalsRecord[];
  mewsAlerts: MewsAlert[];
  bedAssignments: BedAssignment[];
  charges: Charge[];
  // the provider registry, e.g. for the attending physician picker
  providers: Provider[];
  patientName: (patientId: string) => string;
  providerName: (providerId: string | null | undefined) => string;
  recordVitals: (patientId: string, vitals: VitalSigns, confirmedImplausible: boolean) => Promise<VitalsRecord>;
  acknowledgeAlert: (alertId: string, acknowledgement: { note?: string; isFalseAlarm?: boolean }) => Promise<void>;
  orderDiagnosticTest: (order: DiagnosticOrderRequest) => Promise<LabTest>;
  prescribe: (order: PrescriptionRequest) => Promise<MedicationOrder>;
  dispenseMedication: (orderId: string, quantity: number, note?: string) => Promise<MedicationOrder>;
  priceCharge: (chargeId: string, unitAmount: number, reason: string) => Promise<Charge>;
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
}

export interface OfflineService {
  service: ServiceName;
  // null if it hasn't answered once since sign-in, so there's no data to show
  lastSeenAt: string | null;
}

const DataContext = createContext<DataContextValue | null>(null);

function ageOn(birthDate: string, today = new Date()) {
  const born = new Date(birthDate);
  let age = today.getFullYear() - born.getFullYear();
  const hadBirthday =
    today.getMonth() > born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

// Every patient ID anywhere in what the portal loaded
function patientIdsIn(raw: RawState) {
  return [
    ...raw.census.map((entry) => entry.patientId),
    ...raw.vitals.map((record) => record.patientId),
    ...raw.alerts.map((alert) => alert.patientId),
    ...raw.admissions.map((admission) => admission.patientId),
    ...raw.diagnostics.map((order) => order.patientId),
    ...raw.medications.map((order) => order.patientId),
    ...raw.charges.map((charge) => charge.patientId),
  ];
}

function boardPatientIds(board: BoardWard[]) {
  return board.flatMap((ward) => ward.rooms.flatMap((room) => room.beds.flatMap((bed) => (bed.occupant ? [bed.occupant.patientId] : []))));
}

interface RawState {
  census: CensusEntry[];
  vitals: VitalsResponse[];
  alerts: MewsAlertRecord[];
  admissions: AdmissionRecord[];
  diagnostics: DiagnosticOrderRecord[];
  medications: MedicationOrderRecord[];
  charges: ChargeRecord[];
}

const EMPTY_RAW: RawState = {
  census: [],
  vitals: [],
  alerts: [],
  admissions: [],
  diagnostics: [],
  medications: [],
  charges: [],
};

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [raw, setRaw] = useState<RawState>(EMPTY_RAW);
  const [formulary, setFormulary] = useState<FormularyItem[]>([]);
  const [bedBoard, setBedBoard] = useState<BoardWard[]>([]);
  const [identities, setIdentities] = useState<Map<string, PatientIdentity>>(() => new Map());
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadSteps, setLoadSteps] = useState<LoadStep[]>([]);
  const [offlineServices, setOfflineServices] = useState<OfflineService[]>([]);
  const [isSystemOffline, setIsSystemOffline] = useState(false);
  // last time each service answered, kept across refreshes
  const [lastSeen] = useState(() => new Map<ServiceName, string>());
  const providersLoadedAt = useRef(0);

  const setRawKey = useCallback(<K extends keyof RawState>(key: K, value: RawState[K]) => {
    setRaw((current) => ({ ...current, [key]: value }));
  }, []);

  // Asks the Patient Registry only for IDs we haven't seen yet. A registry
  // that's down leaves the IDs showing instead of names, nothing worse.
  const resolvePatients = useCallback(async (ids: string[]) => {
    const role = currentSession()?.user.role;
    if (!role || !READS_PATIENT_NAMES.includes(role)) return;
    const missing = ids.filter((id) => !identities.has(id));
    if (missing.length === 0) return;
    try {
      const found = await fetchPatientsByIds(missing);
      setIdentities((current) => {
        const next = new Map(current);
        for (const patient of found) next.set(patient.id, patient);
        return next;
      });
    } catch {
      // shows up as Patient Registry offline on the next refresh's notice
    }
  }, [identities]);

  const loadProviders = useCallback(async () => {
    if (Date.now() - providersLoadedAt.current < PROVIDER_REFRESH_MS) return;
    try {
      setProviders(await fetchProviders());
      providersLoadedAt.current = Date.now();
    } catch {
      // names fall back to the provider ID until the registry answers
    }
  }, []);

  // Every call is independent (allSettled), because a service being down
  // should blank only its own part of the screen (the paper's fault-isolation
  // goal). Only "can't reach it" counts as offline; a 403 is a bug, not an outage.
  const loadFromServices = useCallback(
    async (isFirstLoad = false) => {
      const role = currentSession()?.user.role;
      if (!role) return;

      const fresh: Partial<RawState> = {};
      let boardIds: string[] = [];
      const loaders: Record<LoadKey, () => Promise<void>> = {
        census: async () => void (fresh.census = await fetchCensus()),
        vitals: async () => void (fresh.vitals = await fetchVitals()),
        alerts: async () => void (fresh.alerts = await fetchAlerts()),
        board: async () => {
          const board = await fetchBedBoard();
          boardIds = boardPatientIds(board);
          setBedBoard(board);
        },
        admissions: async () => void (fresh.admissions = await fetchAdmissions()),
        diagnostics: async () => void (fresh.diagnostics = await fetchDiagnosticOrders()),
        medications: async () => void (fresh.medications = await fetchMedicationOrders()),
        formulary: () => fetchFormulary().then(setFormulary),
        charges: async () => void (fresh.charges = await fetchCharges()),
      };

      const keys = LOADS_BY_ROLE[role];
      const services = [...new Set(keys.map((key) => SERVICE_FOR_LOAD[key]))];
      const pendingByService = new Map(
        services.map((service) => [service, keys.filter((key) => SERVICE_FOR_LOAD[key] === service).length]),
      );
      const down = new Set<ServiceName>();
      if (isFirstLoad) setLoadSteps(services.map((service) => ({ service, state: "loading" })));

      await Promise.all([
        keys.length > 0 ? loadProviders() : Promise.resolve(),
        ...keys.map(async (key) => {
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
      ]);

      const merged = { ...EMPTY_RAW, ...fresh };
      setRaw((current) => ({ ...current, ...fresh }));
      await resolvePatients([...patientIdsIn(merged), ...boardIds]);

      const now = new Date().toISOString();
      for (const service of services) {
        if (!down.has(service)) lastSeen.set(service, now);
      }
      setOfflineServices([...down].map((service) => ({ service, lastSeenAt: lastSeen.get(service) ?? null })));
      setIsSystemOffline(services.length > 0 && down.size === services.length);
      setIsLoading(false);
    },
    [lastSeen, loadProviders, resolvePatients],
  );

  // one refresh at a time; a slow service shouldn't pile up requests behind it
  const isRefreshing = useRef(false);
  const latestLoad = useRef(loadFromServices);
  latestLoad.current = loadFromServices;
  const refreshNow = useCallback(() => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    void latestLoad.current().finally(() => {
      isRefreshing.current = false;
    });
  }, []);

  useEffect(() => {
    isRefreshing.current = true;
    void latestLoad.current(true).finally(() => {
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
  }, [refreshNow]);

  // ─── names from the two registries ───

  const providerById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);

  const patientName = useCallback(
    (patientId: string) => identities.get(patientId)?.name ?? patientId,
    [identities],
  );
  const providerName = useCallback(
    (providerId: string | null | undefined) => (providerId ? (providerById.get(providerId)?.name ?? providerId) : ""),
    [providerById],
  );

  const toVitals = useCallback(
    (record: VitalsResponse): VitalsRecord => ({ ...record, recordedBy: providerName(record.recordedById) }),
    [providerName],
  );
  const toLabTest = useCallback(
    (order: DiagnosticOrderRecord): LabTest => ({
      id: order.id,
      patientId: order.patientId,
      patient: patientName(order.patientId),
      orderedById: order.orderedById,
      test: order.test,
      priority: order.priority,
      status: order.status,
      time: timeAgo(order.orderedAt),
      isCritical: order.isCritical,
    }),
    [patientName],
  );
  const toMedicationOrder = useCallback(
    (order: MedicationOrderRecord): MedicationOrder => ({
      ...order,
      patientName: patientName(order.patientId),
      prescribedBy: providerName(order.prescribedById),
      dispensedBy: order.dispensedById ? providerName(order.dispensedById) : null,
    }),
    [patientName, providerName],
  );
  const toCharge = useCallback(
    (charge: ChargeRecord): Charge => ({ ...charge, patientName: patientName(charge.patientId) }),
    [patientName],
  );

  const patients = useMemo<Patient[]>(
    () =>
      raw.census.map((entry) => {
        const identity = identities.get(entry.patientId);
        return {
          id: entry.patientId,
          encounterId: entry.encounterId,
          name: identity?.name ?? entry.patientId,
          birthDate: identity?.birthDate ?? "",
          age: identity ? ageOn(identity.birthDate) : 0,
          gender: identity?.sex ?? "Male",
          department: entry.department,
          status: entry.status,
          mewsScore: entry.mewsScore,
          admittedAt: entry.admittedAt,
          // seeded by MPI number, so no patient name ever leaves for the avatar service
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(entry.patientId)}`,
        };
      }),
    [raw.census, identities],
  );
  const vitalsRecords = useMemo(() => raw.vitals.map(toVitals), [raw.vitals, toVitals]);
  const mewsAlerts = useMemo<MewsAlert[]>(
    () =>
      raw.alerts.map((alert) => ({
        ...alert,
        patientName: patientName(alert.patientId),
        acknowledgedBy: alert.acknowledgedById ? providerName(alert.acknowledgedById) : undefined,
      })),
    [raw.alerts, patientName, providerName],
  );
  const bedAssignments = useMemo<BedAssignment[]>(
    () =>
      raw.admissions.map((admission) => ({
        ...admission,
        attendingPhysician: providerName(admission.attendingPhysicianId),
        admittedBy: providerName(admission.admittedById),
      })),
    [raw.admissions, providerName],
  );
  // one shared list of wards for the dashboard and the bed board (Phase 11
  // cleanup item), straight from the real beds
  const wards = useMemo<Ward[]>(
    () =>
      bedBoard.map((ward) => ({
        id: ward.id,
        name: ward.name,
        type: ward.type,
        department: ward.department,
        capacity: ward.capacity,
        occupied: ward.occupied,
        available: ward.available,
        color: ward.color,
      })),
    [bedBoard],
  );
  const labTests = useMemo(() => raw.diagnostics.map(toLabTest), [raw.diagnostics, toLabTest]);
  const medicationOrders = useMemo(() => raw.medications.map(toMedicationOrder), [raw.medications, toMedicationOrder]);
  const charges = useMemo(() => raw.charges.map(toCharge), [raw.charges, toCharge]);

  // ─── changes ───

  async function recordVitals(patientId: string, vitals: VitalSigns, confirmedImplausible: boolean) {
    // Clinical Care scores MEWS and publishes the alert; we re-read so the
    // new alert and the patient's updated score both show up
    const record = await postVitals(patientId, vitals, confirmedImplausible);
    await loadFromServices();
    return toVitals(record);
  }

  async function acknowledgeAlert(alertId: string, acknowledgement: { note?: string; isFalseAlarm?: boolean }) {
    try {
      await postAcknowledgement(alertId, {
        note: acknowledgement.note,
        isFalseAlarm: acknowledgement.isFalseAlarm ?? false,
      });
    } finally {
      // on a 409 someone else acknowledged first; re-reading shows who
      await loadFromServices();
    }
  }

  async function orderDiagnosticTest(order: DiagnosticOrderRequest) {
    const created = await postDiagnosticOrder(order);
    setRawKey("diagnostics", [created, ...raw.diagnostics]);
    return toLabTest(created);
  }

  async function prescribe(order: PrescriptionRequest) {
    const created = await postMedicationOrder(order);
    setRawKey("medications", [created, ...raw.medications]);
    return toMedicationOrder(created);
  }

  async function dispenseMedication(orderId: string, quantity: number, note?: string) {
    const dispensed = await postDispense(orderId, quantity, note);
    setRawKey(
      "medications",
      raw.medications.map((order) => (order.id === orderId ? dispensed : order)),
    );
    return toMedicationOrder(dispensed);
  }

  async function priceCharge(chargeId: string, unitAmount: number, reason: string) {
    const priced = await postChargePrice(chargeId, unitAmount, reason);
    setRawKey(
      "charges",
      raw.charges.map((charge) => (charge.id === chargeId ? priced : charge)),
    );
    return toCharge(priced);
  }

  return (
    <DataContext.Provider
      value={{
        refreshNow,
        isLoading,
        loadSteps,
        offlineServices,
        isSystemOffline,
        patients,
        formulary,
        labTests,
        medicationOrders,
        wards,
        bedBoard,
        vitalsRecords,
        mewsAlerts,
        bedAssignments,
        charges,
        providers,
        patientName,
        providerName,
        recordVitals,
        acknowledgeAlert,
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
