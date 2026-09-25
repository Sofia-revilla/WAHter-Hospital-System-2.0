// WAHter — App.tsx
// Main application file: login gate, theme switching, the topbar, and the
// Profile tab. The sidebar and the other tab views land in later prompts.
// Built by UNICA-HIJA | v2.41
//
// File layout (Ctrl+F to jump):
//   1. Helpers
//   2. Topbar
//   3. Root App

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react"; // not 'framer-motion' — package renamed in v11
import { Activity, ArrowLeft, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataProvider, useData } from "@/context/DataContext";
import { LoginScreen, type LoginHandler } from "@/components/LoginScreen";
import { ProfileView } from "@/components/ProfileView";
import type { StaffProfile, StaffRole } from "@/types";

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

// Login only asks for a name, so fill the badge with something sensible.
// Signup passes the real department and license through instead.
const DEFAULT_DEPARTMENT: Record<StaffRole, string> = {
  Doctor: "Internal Medicine",
  Nurse: "Nursing Service",
  "IT Admin": "IT Department",
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
  isDemoMode: boolean;
  onOpenProfile: () => void;
  onLogout: () => void;
}

function Topbar({
  title,
  onBack,
  isLight,
  onToggleTheme,
  displayName,
  role,
  isDemoMode,
  onOpenProfile,
  onLogout,
}: TopbarProps) {
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
        {/* TODO(Prompt: demo tour): the guided tour overlay replaces this chip */}
        {isDemoMode && (
          <span
            className={cn(
              "rounded-full bg-amber-400/10 px-2 py-1",
              "text-[9px] font-black uppercase text-amber-500",
            )}
          >
            Demo Mode
          </span>
        )}
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

        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          className="rounded-xl p-2 text-text-muted transition-colors hover:text-foreground"
        >
          <LogOut size={18} />
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
  // null means nobody is logged in and the login overlay shows
  const [userRole, setUserRole] = useState<StaffRole | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // The class goes on <html>, not a wrapper div, so the body background and
  // native scrollbars switch too — a wrapper left a dark strip on overscroll.
  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
  }, [isLight]);

  const handleLogin: LoginHandler = (role, name, department, license, demo) => {
    setUserRole(role);
    setProfile({
      name,
      role,
      department: department ?? DEFAULT_DEPARTMENT[role],
      license: license ?? "Not on file",
    });
    setIsDemoMode(!!demo);
    // TODO(Prompt: sidebar): IT Admin lands on 'architecture' once that tab exists
    setActiveTab("dashboard");
  };

  function handleLogout() {
    setUserRole(null);
    setProfile(null);
    setIsDemoMode(false);
  }

  if (!userRole || !profile) {
    return <LoginScreen onLogin={handleLogin} />;
  }

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
          isDemoMode={isDemoMode}
          onOpenProfile={() => setActiveTab("profile")}
          onLogout={handleLogout}
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
