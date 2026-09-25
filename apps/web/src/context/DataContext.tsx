"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { calculateMews, implausibleReadings, type VitalSigns } from "@/lib/mews";
import { INVENTORY, LAB_TESTS, PATIENTS, WARDS } from "@/constants";
import type { InventoryItem, LabTest, MewsAlert, Patient, VitalsRecord, Ward } from "@/types";

type DataSource = "mock" | "supabase";

interface DataContextValue {
  patients: Patient[];
  inventory: InventoryItem[];
  labTests: LabTest[];
  wards: Ward[];
  isLoading: boolean;
  // which tables actually came from Supabase. Handy during demos, since a
  // half-seeded project can give us real patients but mock wards
  sources: Record<"patients" | "inventory" | "labTests" | "wards", DataSource>;
  vitalsRecords: VitalsRecord[];
  mewsAlerts: MewsAlert[];
  recordVitals: (patientId: string, vitals: VitalSigns, recordedBy: string) => VitalsRecord;
  acknowledgeAlert: (
    alertId: string,
    acknowledgement: { by: string; note?: string; isFalseAlarm?: boolean },
  ) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

// Returns null on any error or an empty table, so the caller keeps the mock.
// We'd rather show demo data than a blank screen during a live walkthrough.
async function fetchTable<T>(table: string): Promise<T[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from(table).select("*");
  if (error || !data || data.length === 0) return null;

  // HACK: rows are untyped until we set up Supabase type generation, so we
  // trust the table columns to match our camelCase types for now.
  return data as T[];
}

// ─── VITALS & MEWS (local only for now) ───
// TODO(Phase 3): vitals go to Clinical Records and alerts come from the
// Notifications service over the event bus. Until then they live in memory.

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

// Two charted sets so the dashboard has real alerts on first load, both run
// through the same MEWS function as anything a nurse enters.
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
  const [seed] = useState(seedVitals);
  // seeded patients show the MEWS from their charted vitals, not the random mock score
  const [patients, setPatients] = useState<Patient[]>(() =>
    PATIENTS.map((patient) => {
      const record = seed.records.find((candidate) => candidate.patientId === patient.id);
      return record ? { ...patient, mewsScore: record.mewsScore } : patient;
    }),
  );
  const [vitalsRecords, setVitalsRecords] = useState<VitalsRecord[]>(seed.records);
  const [mewsAlerts, setMewsAlerts] = useState<MewsAlert[]>(seed.alerts);
  const [inventory, setInventory] = useState<InventoryItem[]>(INVENTORY);
  const [labTests, setLabTests] = useState<LabTest[]>(LAB_TESTS);
  const [wards, setWards] = useState<Ward[]>(WARDS);
  const [isLoading, setIsLoading] = useState(supabase !== null);
  const [sources, setSources] = useState<DataContextValue["sources"]>({
    patients: "mock",
    inventory: "mock",
    labTests: "mock",
    wards: "mock",
  });

  useEffect(() => {
    if (!supabase) return;

    // guards against setting state after unmount (Strict Mode mounts twice in dev)
    let cancelled = false;

    async function load() {
      const [livePatients, liveInventory, liveLabTests, liveWards] = await Promise.all([
        fetchTable<Patient>("patients"),
        fetchTable<InventoryItem>("inventory"),
        fetchTable<LabTest>("lab_tests"),
        fetchTable<Ward>("wards"),
      ]);

      if (cancelled) return;

      if (livePatients) setPatients(livePatients);
      if (liveInventory) setInventory(liveInventory);
      if (liveLabTests) setLabTests(liveLabTests);
      if (liveWards) setWards(liveWards);

      setSources({
        patients: livePatients ? "supabase" : "mock",
        inventory: liveInventory ? "supabase" : "mock",
        labTests: liveLabTests ? "supabase" : "mock",
        wards: liveWards ? "supabase" : "mock",
      });
      setIsLoading(false);
    }

    load().catch(() => {
      // network failure: the mock data is already in state, so just stop loading
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function recordVitals(patientId: string, vitals: VitalSigns, recordedBy: string) {
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

  function acknowledgeAlert(
    alertId: string,
    acknowledgement: { by: string; note?: string; isFalseAlarm?: boolean },
  ) {
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

  return (
    <DataContext.Provider
      value={{
        patients,
        inventory,
        labTests,
        wards,
        isLoading,
        sources,
        vitalsRecords,
        mewsAlerts,
        recordVitals,
        acknowledgeAlert,
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
