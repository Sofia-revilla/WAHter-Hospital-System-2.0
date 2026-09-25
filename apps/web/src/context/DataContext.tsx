"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { INVENTORY, LAB_TESTS, PATIENTS, WARDS } from "@/constants";
import type { InventoryItem, LabTest, Patient, Ward } from "@/types";

type DataSource = "mock" | "supabase";

interface DataContextValue {
  patients: Patient[];
  inventory: InventoryItem[];
  labTests: LabTest[];
  wards: Ward[];
  isLoading: boolean;
  // which tables actually came from Supabase — handy for the demo, since a
  // half-seeded project can give us real patients but mock wards
  sources: Record<"patients" | "inventory" | "labTests" | "wards", DataSource>;
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

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [patients, setPatients] = useState<Patient[]>(PATIENTS);
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
      // network failure — the mock data is already in state, just stop loading
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DataContext.Provider value={{ patients, inventory, labTests, wards, isLoading, sources }}>
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
