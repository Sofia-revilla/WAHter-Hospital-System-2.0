// WAHter — App.tsx
// Main application file: login gate, the app shell (sidebar + topbar), theme
// switching, and tab routing to the ten tab views.
// Built by UNICA-HIJA | v2
//
// File layout (Ctrl+F to jump):
//   1. Helpers
//   2. Topbar
//   3. Root App (each tab's view lives in its own file under components/)

"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react"; // not 'framer-motion', the package got renamed in v11
import { Bell, LayoutDashboard, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayName } from "@/lib/staff";
import { DataProvider } from "@/context/DataContext";
import { ArchitectureStatusView } from "@/components/ArchitectureStatusView";
import { BedManagementView } from "@/components/BedManagementView";
import { BillingView } from "@/components/BillingView";
import { DashboardView } from "@/components/DashboardView";
import { DemoTour } from "@/components/DemoTour";
import { InventoryView } from "@/components/InventoryView";
import { LaboratoryView } from "@/components/LaboratoryView";
import { PatientsView } from "@/components/PatientsView";
import { PharmacyView } from "@/components/PharmacyView";
import { PrescriptionView } from "@/components/PrescriptionView";
import { LoginScreen, type LoginHandler } from "@/components/LoginScreen";
import { ProfileView } from "@/components/ProfileView";
import { Sidebar } from "@/components/Sidebar";
import { TABS, type TabId } from "@/navigation";
import { DEMO_STEPS } from "@/demoTour";
import { ROLE_LABELS, type StaffRole } from "@/types";

// ─── 1. HELPERS ───

const ROLE_CHIP: Record<StaffRole, string> = {
  Doctor: "bg-wah-purple/20 text-wah-neon",
  Nurse: "bg-wah-neon/15 text-wah-neon",
  IT: "bg-rose-500/15 text-rose-400",
};

// Plain login only asks for a name, so we fill the badge with a default.
// Signup passes the real department and license instead.
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
  onLogout: () => void;
}

function Topbar({
  title,
  isLight,
  onToggleTheme,
  displayName,
  role,
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

// Fallback for a tab id with no view. Every TabId is handled today, so this
// only shows if a tab gets added to navigation.ts before its screen exists.
interface PlaceholderViewProps {
  title: string;
}

function PlaceholderView({ title }: PlaceholderViewProps) {
  return (
    <div className="flex min-h-[600px] flex-col items-center justify-center gap-6 text-center">
      <div className="glass rounded-full p-10 shadow-[0_0_60px_rgba(109,40,217,0.35)]">
        <LayoutDashboard className="size-20 text-wah-neon" />
      </div>
      <div>
        <h2 className="text-2xl font-black">{title} Module</h2>
        <p className="mt-1 text-text-muted">Module under construction in Phase 2</p>
      </div>
    </div>
  );
}

// ─── 3. ROOT APP ───

export function App() {
  const [userRole, setUserRole] = useState<StaffRole | null>(null);
  const [userName, setUserName] = useState("");
  const [userDept, setUserDept] = useState("");
  const [userLicense, setUserLicense] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  // light mode is the default look; the toggle in the topbar switches to dark
  const [isLight, setIsLight] = useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // The class goes on <html>, not a wrapper div, so the body background and
  // native scrollbars switch too. With a wrapper we got a dark strip on overscroll.
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

  // DataProvider wraps the login screen too, so the Supabase fetch starts
  // while staff are still picking a portal
  if (!userRole) {
    return (
      <DataProvider>
        <LoginScreen onLogin={handleLogin} />
      </DataProvider>
    );
  }

  const role = userRole;
  const displayName = formatDisplayName(userName, role);
  const demoSteps = DEMO_STEPS[role];

  // the tour drives the page behind it: every step change also switches tabs
  function goToDemoStep(step: number) {
    setDemoStep(step);
    setActiveTab(demoSteps[step].tab);
  }

  function renderTab() {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView isLight={isLight} staffName={displayName} />;
      case "patients":
        return <PatientsView staffName={displayName} />;
      case "prescription":
        return <PrescriptionView />;
      case "pharmacy":
        return <PharmacyView role={role} />;
      case "lab":
        return <LaboratoryView role={role} />;
      case "rooms":
        return <BedManagementView role={role} />;
      case "billing":
        return <BillingView role={role} />;
      case "inventory":
        return <InventoryView />;
      case "architecture":
        return <ArchitectureStatusView />;
      case "profile":
        return (
          <ProfileView
            name={userName}
            role={role}
            department={userDept}
            license={userLicense}
            isLight={isLight}
            onSave={(updated) => {
              setUserName(updated.name);
              setUserDept(updated.department);
              setUserLicense(updated.license);
            }}
          />
        );
      default: {
        // TS says every tab is covered, but keep a fallback in case a new tab id sneaks in
        const unknownTab: string = activeTab;
        return <PlaceholderView title={unknownTab} />;
      }
    }
  }

  return (
    <DataProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Sidebar
          role={role}
          activeTab={activeTab}
          isExpanded={isSidebarExpanded}
          onToggle={() => setIsSidebarExpanded((current) => !current)}
          onSelect={setActiveTab}
        />

        {/* h-screen + overflow on <main> keeps the topbar pinned while only the tab content scrolls */}
        {/* margin tracks the sidebar width (w-64 / w-20) and animates with it */}
        <div
          className={cn(
            "flex h-screen flex-col transition-[margin] duration-300",
            isSidebarExpanded ? "ml-64" : "ml-20",
          )}
        >
          <Topbar
            title={TABS[activeTab].label}
            isLight={isLight}
            onToggleTheme={() => setIsLight((current) => !current)}
            displayName={displayName}
            role={role}
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
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <DemoTour
          isOpen={isDemoMode}
          steps={demoSteps}
          currentStep={demoStep}
          onStepChange={goToDemoStep}
          onClose={() => setIsDemoMode(false)}
        />
      </div>
    </DataProvider>
  );
}
