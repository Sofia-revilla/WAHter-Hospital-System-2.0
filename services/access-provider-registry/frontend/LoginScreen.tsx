// WAHter — LoginScreen.tsx
// The paper's authentication flow: System Access (pick a portal) → Staff Login
// (username, password, and the Data Privacy Notice, RA 10173) → Access Key
// Verification (a six-digit key emailed to the account). There's no public
// sign-up: the System Administrator creates accounts (UC-08). Try Demo only
// shows when NEXT_PUBLIC_ENABLE_DEMO is "true".
// Login and signup go to the Access & Provider Registry through Kong and get
// a real JWT. There's no offline or mock sign-in: if the services can't be
// reached, the screen says so and keeps checking until they're back.

"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CloudOff,
  Database,
  Eye,
  EyeOff,
  FlaskConical,
  KeyRound,
  Mail,
  Pill,
  Receipt,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, gatewayReachable } from "@/lib/api";
import { PORTAL_ROLES } from "@/navigation";
import { BRAND } from "@/lib/brand";
import { demoLogin, startLogin, verifyAccessKey, type AccessKeyChallenge } from "./api";
import { type StaffRole } from "@/types";

type LoginMode = "select" | "login" | "verify" | "demo";

export type LoginHandler = (
  role: StaffRole,
  name: string,
  department?: string,
  license?: string,
  demo?: boolean,
) => void;

// how often the login screen re-checks while the system is offline
const OFFLINE_RECHECK_MS = 4000;
// Try Demo and the guided tours are off unless the build turns them on. The
// server has its own switch (DEMO_ACCOUNTS_ENABLED), so hiding the button
// isn't the only thing keeping the demo accounts closed.
export const IS_DEMO_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";

// What we tell staff before they sign in or create an account. Kept short on
// purpose; the full privacy manual belongs to the hospital's DPO, not the login page.
const PRIVACY_NOTICE_SECTIONS = [
  {
    heading: "What we collect",
    body:
      "Your name, role, department, license or employee ID, and a record of what you do in " +
      "WAHter (sign-ins, the records you open or change, and when).",
  },
  {
    heading: "Why we collect it",
    body:
      "To confirm who you are, give you only the access your role needs, and keep an " +
      "audit trail of every action on patient records, as the Data Privacy Act requires.",
  },
  {
    heading: "Patient information",
    body:
      "Patient records you see in WAHter are confidential. Use them only for patient care " +
      "and hospital operations, and don't copy, share, or screenshot them outside the system.",
  },
  {
    heading: "How we protect it",
    body:
      "Access is role-based, passwords are stored hashed, and the audit log can't be edited " +
      "or deleted. Data stays inside the hospital's systems.",
  },
  {
    heading: "Your rights",
    body:
      "Under RA 10173 you can ask to see, correct, or object to the use of your personal data. " +
      "Contact the hospital's Data Protection Officer for any request or concern.",
  },
];

// One fictional login per portal, shown on the form so anyone can try it.
// Not secrets: the Access & Provider Registry seeds these same accounts
// (services/access-provider-registry/backend/db/seed.sql).
const PROTOTYPE_LOGINS: Record<StaffRole, { username: string; password: string }> = {
  AdmittingClerk: { username: "jpascual", password: "clerk2026" },
  Physician: { username: "amendoza", password: "doctor2026" },
  Nurse: { username: "cbautista", password: "nurse2026" },
  Pharmacist: { username: "gvillanueva", password: "pharmacy2026" },
  LaboratoryStaff: { username: "lramos", password: "lab2026" },
  RadiologyStaff: { username: "psantos", password: "radiology2026" },
  BillingStaff: { username: "maquino", password: "billing2026" },
  HospitalAdministrator: { username: "rcastillo", password: "hospadmin2026" },
  SystemAdministrator: { username: "areyes", password: "admin2026" },
};

// Full class strings (not built with template literals) so Tailwind's scanner
// can see every one of them.
interface RoleStyle {
  icon: LucideIcon;
  portal: string;
  subtitle: string;
  placeholder: string;
  demoName: string;
  iconBox: string;
  hoverBorder: string;
  hoverRotate: string;
  chip: string;
  submit: string;
}

const ROLE_STYLES: Record<StaffRole, RoleStyle> = {
  AdmittingClerk: {
    icon: UserPlus,
    portal: "Admitting Portal",
    subtitle: "Registration & Admission",
    placeholder: "e.g. Joy Pascual",
    demoName: "Demo Clerk",
    iconBox: "bg-amber-500/15 text-amber-600",
    hoverBorder: "hover:border-amber-500",
    hoverRotate: "group-hover:-rotate-6",
    chip: "bg-amber-500/15 text-amber-600",
    submit: "bg-amber-500",
  },
  Physician: {
    icon: Stethoscope,
    portal: "Physician's Portal",
    subtitle: "Clinical Care",
    placeholder: "e.g. Dr. Jonathan Smith",
    demoName: "Demo Doctor",
    iconBox: "bg-wah-purple/15 text-wah-purple",
    hoverBorder: "hover:border-wah-purple",
    hoverRotate: "group-hover:rotate-6",
    chip: "bg-wah-purple/15 text-wah-purple",
    submit: "bg-wah-purple",
  },
  Nurse: {
    icon: Users,
    portal: "Nurse's Portal",
    subtitle: "Ward Operations",
    placeholder: "e.g. RN Sarah Johnson",
    demoName: "Demo Nurse",
    iconBox: "bg-wah-neon/15 text-wah-neon",
    hoverBorder: "hover:border-wah-neon",
    hoverRotate: "group-hover:-rotate-6",
    chip: "bg-wah-neon/15 text-wah-neon",
    submit: "bg-wah-neon",
  },
  Pharmacist: {
    icon: Pill,
    portal: "Pharmacy Portal",
    subtitle: "Dispensing",
    placeholder: "e.g. Grace Villanueva",
    demoName: "Demo Pharmacist",
    iconBox: "bg-indigo-500/15 text-indigo-500",
    hoverBorder: "hover:border-indigo-500",
    hoverRotate: "group-hover:-rotate-12",
    chip: "bg-indigo-500/15 text-indigo-500",
    submit: "bg-indigo-500",
  },
  LaboratoryStaff: {
    icon: FlaskConical,
    portal: "Ancillary Portal",
    subtitle: "Laboratory",
    placeholder: "e.g. Liza Ramos",
    demoName: "Demo Lab",
    iconBox: "bg-sky-500/15 text-sky-600",
    hoverBorder: "hover:border-sky-500",
    hoverRotate: "group-hover:rotate-6",
    chip: "bg-sky-500/15 text-sky-600",
    submit: "bg-sky-500",
  },
  RadiologyStaff: {
    icon: FlaskConical,
    portal: "Ancillary Portal",
    subtitle: "Radiology",
    placeholder: "e.g. Paolo Santos",
    demoName: "Demo Radiology",
    iconBox: "bg-sky-500/15 text-sky-600",
    hoverBorder: "hover:border-sky-500",
    hoverRotate: "group-hover:-rotate-6",
    chip: "bg-sky-500/15 text-sky-600",
    submit: "bg-sky-500",
  },
  BillingStaff: {
    icon: Receipt,
    portal: "Billing Portal",
    subtitle: "Accounts & Charges",
    placeholder: "e.g. Mark Aquino",
    demoName: "Demo Billing",
    iconBox: "bg-fuchsia-500/15 text-fuchsia-500",
    hoverBorder: "hover:border-fuchsia-500",
    hoverRotate: "group-hover:rotate-6",
    chip: "bg-fuchsia-500/15 text-fuchsia-500",
    submit: "bg-fuchsia-500",
  },
  HospitalAdministrator: {
    icon: BarChart3,
    portal: "Hospital Admin Portal",
    subtitle: "Reports & DOH Exports",
    placeholder: "e.g. Dr. Ramon Castillo",
    demoName: "Demo Hospital Admin",
    iconBox: "bg-emerald-500/15 text-emerald-600",
    hoverBorder: "hover:border-emerald-500",
    hoverRotate: "group-hover:rotate-12",
    chip: "bg-emerald-500/15 text-emerald-600",
    submit: "bg-emerald-500",
  },
  SystemAdministrator: {
    icon: Database,
    portal: "System Admin Portal",
    subtitle: "System Diagnostics",
    placeholder: "e.g. Alex Reyes",
    demoName: "Demo Admin",
    iconBox: "bg-rose-500/15 text-rose-500",
    hoverBorder: "hover:border-rose-500",
    hoverRotate: "group-hover:rotate-12",
    chip: "bg-rose-500/15 text-rose-500",
    submit: "bg-wah-neon",
  },
};

// only roles whose portal exists show up on the login screen
const ROLES: StaffRole[] = PORTAL_ROLES;

// ─── SMALL PIECES ───

const inputClass = cn(
  "w-full rounded-xl border-2 border-glass-border bg-glass-bg px-4 py-4",
  "text-sm text-foreground outline-none transition-colors",
  "placeholder:text-text-secondary focus:border-wah-purple",
);

interface BackButtonProps {
  onClick: () => void;
}

function BackButton({ onClick }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
        "text-text-muted transition-colors hover:text-wah-purple",
      )}
    >
      <ArrowLeft size={14} /> Go Back
    </button>
  );
}

interface FieldProps {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
}

// label + left icon wrapper; the input itself is passed as children so each
// field keeps its own props (maxLength, pattern, etc.)
function Field({ label, icon: Icon, children }: FieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
        {label}
      </span>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
        {children}
      </div>
    </label>
  );
}

interface SubmitButtonProps {
  isLoading: boolean;
  colorClass: string;
  label: string;
}

function SubmitButton({ isLoading, colorClass, label }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={cn(
        "flex w-full items-center justify-center gap-3 rounded-xl py-5",
        "font-black text-white shadow-xl transition-all hover:brightness-110",
        "disabled:cursor-wait disabled:opacity-80",
        colorClass,
      )}
    >
      {isLoading ? (
        <>
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Processing…
        </>
      ) : (
        <>
          {label} <Activity size={18} />
        </>
      )}
    </button>
  );
}

// ─── DATA PRIVACY ───

interface PrivacyNoticeProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

function PrivacyNotice({ isOpen, onClose, onAgree }: PrivacyNoticeProps) {
  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-notice-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            // clicks inside the card shouldn't reach the backdrop and close it
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl",
              "border border-glass-border bg-card-bg shadow-2xl",
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-glass-border p-6">
              <div>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full bg-wah-purple/10 px-3 py-1",
                    "text-[10px] font-black uppercase tracking-widest text-wah-purple",
                  )}
                >
                  <ShieldCheck size={12} /> RA 10173
                </span>
                <h2 id="privacy-notice-title" className="mt-3 text-2xl font-black">
                  Data Privacy Notice
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close data privacy notice"
                className="rounded-lg p-1 text-text-muted hover:bg-glass-bg hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-6 text-sm">
              <p className="text-text-muted">
                WAHter handles personal and health information, so we follow the Data Privacy Act
                of 2012 (RA 10173) and the rules of the National Privacy Commission.
              </p>
              {PRIVACY_NOTICE_SECTIONS.map((section) => (
                <div key={section.heading}>
                  <p className="font-bold">{section.heading}</p>
                  <p className="mt-1 text-text-muted">{section.body}</p>
                </div>
              ))}
              <p className="rounded-xl bg-amber-400/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                This is a student prototype. All patients, staff, and records in it are fictional.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-glass-border p-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-xs font-black uppercase text-text-muted hover:bg-glass-bg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onAgree}
                className="rounded-lg bg-wah-purple px-4 py-2 text-xs font-black uppercase text-white hover:brightness-110"
              >
                I Agree
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── LOGIN SCREEN ───

interface LoginScreenProps {
  onLogin: LoginHandler;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<LoginMode>("select");
  const [role, setRole] = useState<StaffRole>("Physician");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [challenge, setChallenge] = useState<AccessKeyChallenge | null>(null);
  const [otp, setOtp] = useState("");
  // six when emailed; the hosted preview's fixed code can be shorter
  const codeLength = challenge?.codeLength ?? 6;
  const isGivenCode = challenge?.delivery === "given";
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // When the whole stack is unreachable we say so plainly. A single service
  // being down doesn't count: Kong still answers, and the portal shows that
  // one service as offline.
  const [isSystemOffline, setIsSystemOffline] = useState(false);
  // what "Try again" should redo: a normal sign-in, or a demo for this role
  const [pendingDemoRole, setPendingDemoRole] = useState<StaffRole | null>(null);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const [isPrivacyNoticeOpen, setIsPrivacyNoticeOpen] = useState(false);

  function goTo(nextMode: LoginMode) {
    setError(null);
    setPassword("");
    setOtp("");
    setIsPasswordVisible(false);
    setMode(nextMode);
  }

  function chooseRole(selected: StaffRole) {
    setRole(selected);
    goTo("login");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (!hasAcceptedPrivacy) {
      setError("Please read and agree to the Data Privacy Notice first.");
      return;
    }
    await sendPassword();
  }

  // Step 2 of the flow: the password. On success the server emails the key.
  async function sendPassword() {
    setError(null);
    setIsBackOnline(false);
    setIsLoading(true);
    try {
      const answer = await startLogin(role, username.trim(), password);
      // access key turned off on the server: already signed in
      if ("signedIn" in answer) {
        onLogin(role, answer.signedIn.name);
        return;
      }
      setChallenge(answer.challenge);
      setOtp("");
      setMode("verify");
    } catch (caught) {
      if (await showOfflineIfDown(caught, null)) return;
      setError(caught instanceof ApiError ? caught.message : "Couldn't sign in. Try again.");
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  }

  // Step 3: the access key from the email
  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.length !== codeLength) {
      setError(`Enter the full ${codeLength}-digit access key.`);
      return;
    }
    if (!challenge) {
      goTo("login");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const user = await verifyAccessKey(challenge.challengeId, otp);
      onLogin(role, user.name);
    } catch (caught) {
      if (await showOfflineIfDown(caught, null)) return;
      setError(caught instanceof ApiError ? caught.message : "Couldn't check the access key. Try again.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  }

  // Try Demo signs in as the portal's demo account, so the tour runs on the
  // live services too
  async function startDemo(demoRole: StaffRole) {
    setError(null);
    try {
      const user = await demoLogin(demoRole);
      onLogin(demoRole, user.name, undefined, undefined, true);
    } catch (caught) {
      if (await showOfflineIfDown(caught, demoRole)) return;
      setError(caught instanceof ApiError ? caught.message : "Couldn't start the demo. Try again.");
    }
  }

  async function showOfflineIfDown(caught: unknown, demoRole: StaffRole | null) {
    if (caught instanceof ApiError && caught.isServiceDown && !(await gatewayReachable())) {
      setPendingDemoRole(demoRole);
      setIsSystemOffline(true);
      return true;
    }
    return false;
  }

  // While the "offline" message is up, keep checking. As soon as the system
  // answers again the message goes away and staff can sign in, no reload needed.
  const [isBackOnline, setIsBackOnline] = useState(false);
  useEffect(() => {
    if (!isSystemOffline) return;
    const timer = setInterval(async () => {
      if (await gatewayReachable()) {
        setIsSystemOffline(false);
        setIsBackOnline(true);
      }
    }, OFFLINE_RECHECK_MS);
    return () => clearInterval(timer);
  }, [isSystemOffline]);

  async function retry() {
    setIsSystemOffline(false);
    if (pendingDemoRole) await startDemo(pendingDemoRole);
    else await sendPassword();
  }

  const offlineNotice = isSystemOffline && (
    <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-rose-600">
        <CloudOff size={16} /> The hospital services are offline
      </p>
      <p className="mt-1 text-xs text-text-muted">
        WAHter can&apos;t reach any of its services right now, so nobody can sign in. This clears by
        itself as soon as the system is back.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void retry()}
          className="rounded-lg bg-wah-purple px-3 py-1.5 text-[10px] font-black uppercase text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );

  const backOnlineNotice = isBackOnline && !isSystemOffline && (
    <p role="status" className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700">
      The hospital services are back online. You can sign in now.
    </p>
  );

  const style = ROLE_STYLES[role];
  const prototype = PROTOTYPE_LOGINS[role];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-background p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={cn(
          // 2fr/3fr gives the 40/60 split from the design; a plain grid-cols-2 would be 50/50
          "glass grid w-full max-w-5xl overflow-hidden rounded-2xl",
          "border-2 border-wah-lavender/20 shadow-2xl md:grid-cols-[2fr_3fr]",
        )}
      >
        {/* ─── brand panel ─── */}
        <div
          className={cn(
            "relative flex flex-col overflow-hidden p-6 sm:p-10",
            "bg-gradient-to-br from-wah-purple via-indigo-600 to-indigo-800",
          )}
        >
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-wah-neon/40 blur-3xl" />
          <Activity
            size={400}
            className="pointer-events-none absolute -bottom-24 -right-24 text-white/5"
          />

          <div
            className={cn(
              "relative flex h-28 w-28 rotate-3 items-center justify-center",
              "rounded-xl bg-white/20 backdrop-blur",
            )}
          >
            <Image
              src={BRAND.loginLogo}
              alt={BRAND.logoAlt}
              width={96}
              height={96}
              priority
              className="h-24 w-24"
            />
          </div>

          <h1 className="relative mt-8 text-5xl font-black text-white">
            WAH<span className="text-wah-accent">ter</span>
          </h1>
          <p className="relative mt-2 text-xl text-wah-lavender">Professional Hospital Management</p>
          <div className="relative my-6 h-px w-20 bg-wah-neon" />
          <p className="relative text-sm leading-relaxed text-white/70">
            An inpatient hospital information system for Philippine LGU hospitals, covering
            admissions, bed management, clinical records, pharmacy, laboratory, and PhilHealth-ready
            billing in one place.
          </p>

          <div className="relative mt-auto space-y-1 pt-12 font-mono text-[10px] text-white/30">
            <p>© UNICA-HIJA</p>
            <p>WAHter · HOSPITAL MANAGEMENT SYSTEM</p>
          </div>
        </div>

        {/* ─── form panel ─── */}
        <div className="flex min-h-[640px] flex-col bg-card-bg/60">
          <div className="flex-1 p-5 sm:p-8 md:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {mode === "select" && (
                  <div>
                    <h2 className="text-3xl font-black">System Access</h2>
                    <p className="mt-1 text-text-muted">Select your portal to begin</p>

                    {/* two columns; an odd one out spans the last row */}
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {ROLES.map((roleOption) => {
                        const roleStyle = ROLE_STYLES[roleOption];
                        const Icon = roleStyle.icon;
                        return (
                          <button
                            key={roleOption}
                            type="button"
                            onClick={() => chooseRole(roleOption)}
                            className={cn(
                              "group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left",
                              "border-glass-border transition-all duration-300",
                              "hover:-translate-y-1 hover:shadow-xl",
                              roleOption === "SystemAdministrator" && ROLES.length % 2 === 1 && "sm:col-span-2",
                              roleStyle.hoverBorder,
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                                "transition-transform duration-300",
                                roleStyle.iconBox,
                                roleStyle.hoverRotate,
                              )}
                            >
                              <Icon size={24} />
                            </div>
                            <div>
                              <p className="text-base font-black">{roleStyle.portal}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                {roleStyle.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex items-center justify-between gap-4">
                      <p className="text-xs text-text-muted">
                        New staff? Your System Administrator creates your account.
                      </p>
                      {IS_DEMO_ENABLED && (
                        <button
                          type="button"
                          onClick={() => goTo("demo")}
                          className={cn(
                            "rounded-full border border-amber-400/30 px-4 py-2",
                            "text-[10px] font-black uppercase tracking-widest text-amber-500",
                            "transition-colors hover:bg-amber-400/10",
                          )}
                        >
                          Try Demo
                        </button>
                      )}
                    </div>

                    <p className="mt-6 flex items-start gap-2 text-xs text-text-muted">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-wah-purple" />
                      <span>
                        WAHter handles personal and health information under the Data Privacy Act
                        (RA 10173).{" "}
                        <button
                          type="button"
                          onClick={() => setIsPrivacyNoticeOpen(true)}
                          className="font-semibold text-wah-purple hover:underline"
                        >
                          Read the Data Privacy Notice
                        </button>
                      </span>
                    </p>
                  </div>
                )}

                {mode === "login" && (
                  <form onSubmit={handleSubmit} noValidate>
                    <BackButton onClick={() => goTo("select")} />
                    <span
                      className={cn(
                        "inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                        style.chip,
                      )}
                    >
                      {style.portal}
                    </span>
                    <h2 className="mt-4 text-3xl font-black">Staff Login</h2>
                    <p className="mt-1 text-text-muted">Enter the username and password your administrator gave you</p>

                    <div className="mt-8 space-y-5">
                      <Field label="Username" icon={Users}>
                        <input
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          placeholder={`e.g. ${prototype.username}`}
                          autoComplete="username"
                          autoCapitalize="none"
                          spellCheck={false}
                          className={cn(inputClass, "pl-12")}
                        />
                      </Field>

                      <Field label="Password" icon={KeyRound}>
                        <input
                          type={isPasswordVisible ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className={cn(inputClass, "pl-12 pr-12")}
                        />
                        <button
                          type="button"
                          onClick={() => setIsPasswordVisible((current) => !current)}
                          aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground"
                        >
                          {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </Field>

                      <p className="text-xs text-text-muted">
                        Prototype sign-in for this portal: username{" "}
                        <code className="rounded bg-glass-bg px-1 font-mono">{prototype.username}</code>, password{" "}
                        <code className="rounded bg-glass-bg px-1 font-mono">{prototype.password}</code>
                      </p>

                      <label className="flex cursor-pointer items-start gap-3 text-xs text-text-muted">
                        <input
                          type="checkbox"
                          checked={hasAcceptedPrivacy}
                          onChange={(event) => {
                            setHasAcceptedPrivacy(event.target.checked);
                            setError(null);
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-wah-purple"
                        />
                        <span>
                          I have read and agree to the{" "}
                          <button
                            type="button"
                            // keep the click from also toggling the checkbox through the label
                            onClick={(event) => {
                              event.preventDefault();
                              setIsPrivacyNoticeOpen(true);
                            }}
                            className="font-semibold text-wah-purple hover:underline"
                          >
                            Data Privacy Notice
                          </button>{" "}
                          and will keep patient information confidential.
                        </span>
                      </label>

                      {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
                      {offlineNotice}
                      {backOnlineNotice}

                      <SubmitButton isLoading={isLoading} colorClass={style.submit} label="Continue" />
                    </div>
                  </form>
                )}

                {mode === "verify" && (
                  <form onSubmit={handleVerify} noValidate>
                    <BackButton onClick={() => goTo("login")} />
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1",
                        "text-[10px] font-black uppercase tracking-widest text-amber-500",
                      )}
                    >
                      <ShieldCheck size={12} /> Security Verification Gate
                    </span>
                    <h2 className="mt-4 text-3xl font-black">Access Key Verification</h2>
                    <p className="mt-1 text-text-muted">
                      {isGivenCode ? (
                        <>Enter the {codeLength}-digit access code that came with your link.</>
                      ) : (
                        <>
                          We emailed a six-digit access key. It works once and expires in{" "}
                          {Math.round((challenge?.expiresInSeconds ?? 300) / 60)} minutes.
                        </>
                      )}
                    </p>

                    {!isGivenCode && (
                      <div className="mt-6 flex items-center gap-3 rounded-xl bg-wah-purple/10 p-4">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wah-neon opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-wah-neon" />
                        </span>
                        <Mail size={18} className="text-wah-neon" />
                        <span className="truncate font-mono text-sm">{challenge?.sentTo ?? "your email"}</span>
                      </div>
                    )}

                    <input
                      value={otp}
                      // strip anything that isn't a digit instead of relying on type="number",
                      // which lets "e" and "-" through and drops leading zeros
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, codeLength))}
                      inputMode="numeric"
                      maxLength={codeLength}
                      placeholder={"0".repeat(codeLength)}
                      aria-label={`${codeLength}-digit access key`}
                      className={cn(inputClass, "mt-6 text-center font-mono text-2xl tracking-[0.5em]")}
                    />

                    {!isGivenCode && (
                      <p className="mt-3 text-center text-xs text-text-muted">
                        Local setup: the inbox is Mailpit at{" "}
                        <a href="http://localhost:8025" target="_blank" rel="noreferrer" className="font-semibold text-wah-purple hover:underline">
                          localhost:8025
                        </a>
                      </p>
                    )}

                    {error && <p className="mt-4 text-center text-sm font-bold text-rose-500">{error}</p>}
                    {offlineNotice}

                    <div className="mt-6">
                      <SubmitButton
                        isLoading={isLoading}
                        colorClass="bg-wah-purple"
                        label="Verify Access Key & Enter"
                      />
                    </div>
                  </form>
                )}

                {mode === "demo" && (
                  <div>
                    <BackButton onClick={() => goTo("select")} />
                    <span
                      className={cn(
                        "inline-block rounded-full bg-amber-400/10 px-3 py-1",
                        "text-[10px] font-black uppercase tracking-widest text-amber-500",
                      )}
                    >
                      Demo Mode
                    </span>
                    <h2 className="mt-4 text-3xl font-black">Try WAHter</h2>
                    <p className="mt-1 text-text-muted">
                      Pick a portal for a guided tour. No account needed.
                    </p>

                    <div className="mt-8 space-y-3">
                      {ROLES.map((roleOption) => {
                        const roleStyle = ROLE_STYLES[roleOption];
                        const Icon = roleStyle.icon;
                        return (
                          <button
                            key={roleOption}
                            type="button"
                            onClick={() => void startDemo(roleOption)}
                            className={cn(
                              "group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left",
                              "border-glass-border transition-all duration-300 hover:-translate-y-0.5",
                              roleStyle.hoverBorder,
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                                "transition-transform duration-300",
                                roleStyle.iconBox,
                                roleStyle.hoverRotate,
                              )}
                            >
                              <Icon size={20} />
                            </div>
                            <div className="flex-1">
                              <p className="font-black">{roleStyle.demoName}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                {roleStyle.portal}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full bg-amber-400/10 px-2 py-1",
                                "text-[9px] font-black uppercase text-amber-500",
                              )}
                            >
                              Guided Tour
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {error && <p className="mt-4 text-sm font-semibold text-rose-500">{error}</p>}
                    {offlineNotice}
                    {backOnlineNotice}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between border-t border-glass-border px-8 py-4 md:px-12">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Secure Access • v2 <span className="ml-2 text-wah-purple">UNICA-HIJA</span>
            </p>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Server: Online
            </p>
          </div>
        </div>
      </motion.div>

      <PrivacyNotice
        isOpen={isPrivacyNoticeOpen}
        onClose={() => setIsPrivacyNoticeOpen(false)}
        onAgree={() => {
          setHasAcceptedPrivacy(true);
          setIsPrivacyNoticeOpen(false);
          setError(null);
        }}
      />
    </div>
  );
}
