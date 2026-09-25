// WAHter — App.tsx
// Main application file: login gate, the app shell (sidebar + topbar), theme
// switching, and tab routing. Tabs not listed in BUILT_TABS land in later
// prompts and render a placeholder until then.
// Built by UNICA-HIJA | v2.41
//
// File layout (Ctrl+F to jump):
//   1. Helpers
//   2. Topbar
//   3. Tab views
//   4. Root App

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react"; // not 'framer-motion' — package renamed in v11
import { Bell, Construction, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataProvider } from "@/context/DataContext";
import { BedManagementView } from "@/components/BedManagementView";
import { BillingView } from "@/components/BillingView";
import { DashboardView } from "@/components/DashboardView";
import { LaboratoryView } from "@/components/LaboratoryView";
import { PatientsView } from "@/components/PatientsView";
import { PharmacyView } from "@/components/PharmacyView";
import { PrescriptionView } from "@/components/PrescriptionView";
import { LoginScreen, type LoginHandler } from "@/components/LoginScreen";
import { ProfileView } from "@/components/ProfileView";
import { Sidebar } from "@/components/Sidebar";
import { TABS, type TabId } from "@/navigation";
import { ROLE_LABELS, type StaffRole } from "@/types";

// ─── 1. HELPERS ───

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
  IT: "bg-rose-500/15 text-rose-400",
};

// tabs with a real view; everything else falls through to PlaceholderView
const BUILT_TABS: TabId[] = [
  "dashboard",
  "patients",
  "prescription",
  "pharmacy",
  "lab",
  "rooms",
  "billing",
  "profile",
];

// Login only asks for a name, so fill the badge with something sensible.
// Signup passes the real department and license through instead.
const DEFAULT_DEPARTMENT: Record<StaffRole, string> = {
  Doctor: "Internal Medicine",
  Nurse: "Nursing Service",
  IT: "IT Department",
};

// ─── 2. TOPBAR ───

interface TopbarProps {
  title: string;
  isLight: boolean;
  onToggleTheme: () => void;
  displayName: string;
  role: StaffRole;
  isDemoMode: boolean;
  demoStep: number;
  onLogout: () => void;
}

function Topbar({
  title,
  isLight,
  onToggleTheme,
  displayName,
  role,
  isDemoMode,
  demoStep,
  onLogout,
}: TopbarProps) {
  const iconButton = cn(
    "glass flex h-10 w-10 items-center justify-center rounded-xl",
    "text-text-muted transition-colors hover:text-wah-neon",
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between px-8 py-4",
        "border-b border-glass-border bg-background/80 backdrop-blur-md",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate whitespace-nowrap text-xl font-bold">{title}</h1>
        {/* TODO(Prompt: demo tour): the guided tour overlay replaces this chip */}
        {isDemoMode && (
          <span
            className={cn(
              "whitespace-nowrap rounded-full bg-amber-400/10 px-2 py-1",
              "text-[9px] font-black uppercase text-amber-500",
            )}
          >
            Demo · Step {demoStep + 1}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className={iconButton}
        >
          {isLight ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* TODO(Phase 2): unread count badge once the Notifications service pushes alerts */}
        <button type="button" aria-label="Notifications" className={iconButton}>
          <Bell size={18} />
        </button>

        <div className="flex items-center gap-2 px-2">
          {/* on tablet widths "E-Prescribing" and the name were wrapping onto two lines;
              the role chip alone is enough there */}
          <span className="hidden whitespace-nowrap text-sm font-semibold md:inline">
            {displayName}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              ROLE_CHIP[role],
            )}
          >
            {ROLE_LABELS[role]}
          </span>
        </div>

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

// ─── 3. TAB VIEWS ───

interface PlaceholderViewProps {
  tab: TabId;
}

function PlaceholderView({ tab }: PlaceholderViewProps) {
  const { icon: Icon, label, description } = TABS[tab];

  return (
    <div
      className={cn(
        "glass flex min-h-[420px] flex-col items-center justify-center gap-4",
        "rounded-[2rem] p-8 text-center",
      )}
    >
      <div className="rounded-2xl bg-wah-purple/15 p-4 text-wah-neon">
        <Icon size={32} />
      </div>
      <h2 className="text-2xl font-black">{label}</h2>
      <p className="max-w-md text-text-muted">{description}</p>
      <span
        className={cn(
          "mt-2 flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1",
          "text-[10px] font-black uppercase tracking-widest text-amber-500",
        )}
      >
        <Construction size={12} /> Screen coming in a later build prompt
      </span>
    </div>
  );
}

// ─── 4. ROOT APP ───

export function App() {
  const [userRole, setUserRole] = useState<StaffRole | null>(null);
  const [userName, setUserName] = useState("");
  const [userDept, setUserDept] = useState("");
  const [userLicense, setUserLicense] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isLight, setIsLight] = useState(false);

  // The class goes on <html>, not a wrapper div, so the body background and
  // native scrollbars switch too — a wrapper left a dark strip on overscroll.
  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
  }, [isLight]);

  const handleLogin: LoginHandler = (role, name, dept, license, demo) => {
    setUserRole(role);
    setUserName(name);
    setUserDept(dept ?? DEFAULT_DEPARTMENT[role]);
    setUserLicense(license ?? "Not on file");
    setIsDemoMode(!!demo);
    setDemoStep(0);
    // IT staff start on the system view; everyone else starts on patient care
    setActiveTab(role === "IT" ? "architecture" : "dashboard");
  };

  if (!userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const displayName = formatDisplayName(userName, userRole);

  return (
    <DataProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar role={userRole} activeTab={activeTab} onSelect={setActiveTab} />

        {/* h-screen + overflow on <main> keeps the topbar pinned while only the tab content scrolls */}
        <div className="ml-20 flex h-screen flex-col">
          <Topbar
            title={TABS[activeTab].label}
            isLight={isLight}
            onToggleTheme={() => setIsLight((current) => !current)}
            displayName={displayName}
            role={userRole}
            isDemoMode={isDemoMode}
            demoStep={demoStep}
            onLogout={() => setUserRole(null)}
          />

          <main className="flex-1 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === "dashboard" && <DashboardView isLight={isLight} />}
                {activeTab === "patients" && <PatientsView />}
                {activeTab === "prescription" && <PrescriptionView />}
                {activeTab === "pharmacy" && <PharmacyView />}
                {activeTab === "lab" && <LaboratoryView />}
                {activeTab === "rooms" && <BedManagementView />}
                {activeTab === "billing" && <BillingView />}
                {activeTab === "profile" && (
                  <ProfileView
                    profile={{
                      name: userName,
                      role: userRole,
                      department: userDept,
                      license: userLicense,
                    }}
                    displayName={displayName}
                    onSave={(updated) => {
                      setUserName(updated.name);
                      setUserDept(updated.department);
                      setUserLicense(updated.license);
                    }}
                  />
                )}
                {!BUILT_TABS.includes(activeTab) && <PlaceholderView tab={activeTab} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </DataProvider>
  );
}
