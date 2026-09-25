// WAHter — App.tsx
// Main application file. Right now: theme switching, the topbar, and the
// Profile tab. Login, sidebar, and the other tab views land in later prompts.
// Built by UNICA-HIJA | v2.41
//
// File layout (Ctrl+F to jump):
//   1. Helpers
//   2. Topbar
//   3. Root App

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react"; // not 'framer-motion' — package renamed in v11
import { Activity, ArrowLeft, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataProvider, useData } from "@/context/DataContext";
import { ProfileView, type StaffProfile, type StaffRole } from "@/components/ProfileView";

// ─── 1. HELPERS ───

type TabId = "dashboard" | "profile";

const TAB_LABELS: Record<TabId, string> = {
  dashboard: "Dashboard",
  profile: "Profile",
};

// Applies the Dr./RN prefix the ward staff expect to see on screen. Checks the
// raw name first so someone who typed "Dr. Reyes" doesn't become "Dr. Dr. Reyes".
export function formatDisplayName(rawName: string, role: StaffRole) {
  const name = rawName.trim();
  if (role === "Doctor" && !name.toLowerCase().startsWith("dr.")) return `Dr. ${name}`;
  if (role === "Nurse" && !name.toLowerCase().startsWith("rn ")) return `RN ${name}`;
  return name;
}

const ROLE_CHIP: Record<StaffRole, string> = {
  Doctor: "bg-wah-purple/20 text-wah-neon",
  Nurse: "bg-wah-neon/15 text-wah-neon",
  "IT Admin": "bg-rose-500/15 text-rose-400",
};

// ─── 2. TOPBAR ───

interface TopbarProps {
  title: string;
  // until the sidebar exists this is the only way back from Profile
  onBack?: () => void;
  isLight: boolean;
  onToggleTheme: () => void;
  displayName: string;
  role: StaffRole;
  onOpenProfile: () => void;
}

function Topbar({ title, onBack, isLight, onToggleTheme, displayName, role, onOpenProfile }: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between px-8 py-4",
        "border-b border-glass-border bg-background/80 backdrop-blur-md",
      )}
    >
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to dashboard"
            className="rounded-xl p-2 text-text-muted hover:bg-glass-bg hover:text-foreground"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className={cn(
            "glass flex h-10 w-10 items-center justify-center rounded-xl",
            "text-text-muted transition-colors hover:text-wah-neon",
          )}
        >
          {isLight ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-glass-bg"
        >
          <span className="text-sm font-semibold">{displayName}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              ROLE_CHIP[role],
            )}
          >
            {role}
          </span>
        </button>
      </div>
    </header>
  );
}

// Temporary landing content so the theme can be checked against real cards.
// It also shows where each dataset came from, which saves a trip to devtools
// when someone asks "is this reading Supabase or the mock?"
function SetupOverview() {
  const { patients, inventory, labTests, wards, isLoading, sources } = useData();

  const datasets = [
    { label: "Patients", count: patients.length, source: sources.patients },
    { label: "Inventory", count: inventory.length, source: sources.inventory },
    { label: "Lab Tests", count: labTests.length, source: sources.labTests },
    { label: "Wards", count: wards.length, source: sources.wards },
  ];

  return (
    <div className="glass rounded-[2rem] p-8 purple-shadow">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-wah-purple/20 p-2.5 text-wah-neon">
          <Activity size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Data sources</h2>
          <p className="text-sm text-text-muted">
            {isLoading ? "Checking Supabase…" : "Mock data fills in anything Supabase doesn't return."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {datasets.map((dataset) => (
          <div key={dataset.label} className="rounded-2xl bg-card-bg p-5">
            <p className="text-xs font-bold uppercase text-text-muted">{dataset.label}</p>
            <p className="mt-2 text-3xl font-black">{dataset.count}</p>
            <span
              className={cn(
                "mt-3 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                dataset.source === "supabase"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-wah-lavender/20 text-wah-neon",
              )}
            >
              {dataset.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. ROOT APP ───

export function App() {
  const [isLight, setIsLight] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  // TODO(Prompt: login screen): this comes from handleLogin once the login screen exists
  const [profile, setProfile] = useState<StaffProfile>({
    name: "Andrea Mendoza",
    role: "Doctor",
    department: "Internal Medicine",
    license: "MED-2026-0417",
  });

  // The class goes on <html>, not a wrapper div, so the body background and
  // native scrollbars switch too — a wrapper left a dark strip on overscroll.
  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
  }, [isLight]);

  const displayName = formatDisplayName(profile.name, profile.role);

  return (
    <DataProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Topbar
          title={TAB_LABELS[activeTab]}
          onBack={activeTab === "dashboard" ? undefined : () => setActiveTab("dashboard")}
          isLight={isLight}
          onToggleTheme={() => setIsLight((current) => !current)}
          displayName={displayName}
          role={profile.role}
          onOpenProfile={() => setActiveTab("profile")}
        />

        <main className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === "dashboard" && <SetupOverview />}
              {activeTab === "profile" && (
                <ProfileView profile={profile} displayName={displayName} onSave={setProfile} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </DataProvider>
  );
}
