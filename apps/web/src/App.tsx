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
import { ChevronDown, LayoutDashboard, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession } from "@/lib/api";
import { formatDisplayName } from "@/lib/staff";
import { DataProvider } from "@/context/DataContext";
import { ArchitectureStatusView } from "@/components/ArchitectureStatusView";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DemoTour } from "@/components/DemoTour";
import { ServiceOfflineNotice } from "@/components/ServiceOfflineNotice";
import { Sidebar } from "@/components/Sidebar";
// Each tab's screen belongs to the service that owns its data (services/<name>/frontend)
import { DashboardView, PatientsView } from "@services/clinical-records/frontend";
import { LoginScreen, ProfileView, StaffAccessView, type LoginHandler } from "@services/identity/frontend";
import { NotificationBell } from "@services/notifications/frontend";
import { LaboratoryView, PharmacyView, PrescriptionView } from "@services/orders-diagnostics/frontend";
import { BedManagementView } from "@services/scheduling/frontend";
import { TABS, type TabId } from "@/navigation";
import { DEMO_STEPS } from "@/demoTour";
import { ROLE_LABELS, type StaffRole } from "@/types";

// ─── 1. HELPERS ───

const ROLE_CHIP: Record<StaffRole, string> = {
  Doctor: "bg-wah-purple/15 text-wah-purple",
  Nurse: "bg-wah-neon/15 text-wah-neon",
  IT: "bg-rose-500/15 text-rose-500",
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
  onOpenAlerts: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

function initialsOf(name: string) {
  return name
    .replace(/^(dr\.?|rn)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Topbar({
  title,
  isLight,
  onToggleTheme,
  displayName,
  role,
  onOpenAlerts,
  onOpenProfile,
  onLogout,
}: TopbarProps) {
  const iconButton = cn(
    "glass flex h-10 w-10 items-center justify-center rounded-lg",
    "text-text-muted transition-colors hover:text-wah-neon",
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between px-6 py-3",
        "border-b border-glass-border bg-card-bg",
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

        {/* TODO(Phase 2): feed this from the Notifications service over SSE */}
        <NotificationBell role={role} onOpenAlerts={onOpenAlerts} />

        {/* profile block: avatar + name over role, opens the Profile tab */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Open my profile"
          className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-glass-bg"
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              "text-xs font-bold",
              ROLE_CHIP[role],
            )}
          >
            {initialsOf(displayName)}
          </span>
          {/* on tablet widths the name wrapped onto two lines; the avatar is enough there */}
          <span className="hidden text-left leading-tight md:block">
            <span className="block whitespace-nowrap text-sm font-semibold">{displayName}</span>
            <span className="block text-xs text-text-muted">{ROLE_LABELS[role]}</span>
          </span>
          <ChevronDown size={16} className="hidden text-text-muted md:block" />
        </button>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          className="rounded-lg p-2 text-text-muted transition-colors hover:text-foreground"
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
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);

  // The class goes on <html>, not a wrapper div, so the body background and
  // native scrollbars switch too. With a wrapper we got a dark strip on overscroll.
  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
  }, [isLight]);

  // The expanded sidebar is 256px, which eats most of a phone or portrait
  // tablet, so below 1024px it folds into the icon rail. Users can still
  // open it by hand; we only collapse when the screen gets narrow.
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    const collapseIfNarrow = () => {
      if (narrow.matches) setIsSidebarExpanded(false);
    };
    collapseIfNarrow();
    narrow.addEventListener("change", collapseIfNarrow);
    return () => narrow.removeEventListener("change", collapseIfNarrow);
  }, []);

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
        return <PrescriptionView staffName={displayName} />;
      case "pharmacy":
        return <PharmacyView role={role} />;
      case "lab":
        return <LaboratoryView role={role} />;
      case "rooms":
        return <BedManagementView role={role} staffName={displayName} />;
      case "architecture":
        return <ArchitectureStatusView />;
      case "staff":
        return <StaffAccessView adminName={displayName} />;
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
            onOpenAlerts={() => setActiveTab("dashboard")}
            onOpenProfile={() => setActiveTab("profile")}
            onLogout={() => setIsConfirmingSignOut(true)}
          />

          <main className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <ServiceOfflineNotice services={TABS[activeTab].services} />
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <ConfirmDialog
          isOpen={isConfirmingSignOut}
          icon={LogOut}
          title="Sign out of WAHter?"
          message="You'll need your password to get back in. Anything you haven't saved on this screen will be lost."
          confirmLabel="Sign out"
          onCancel={() => setIsConfirmingSignOut(false)}
          onConfirm={() => {
            setIsConfirmingSignOut(false);
            clearSession();
            setUserRole(null);
          }}
        />

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
