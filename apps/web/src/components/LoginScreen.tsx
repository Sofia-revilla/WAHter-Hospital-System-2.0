// WAHter — LoginScreen.tsx
// Full-screen login overlay with five modes: select, login, signup, verify, demo.
// Prototype auth only: no password check, just a short fake delay.
// TODO(Phase 8): swap handleSubmit for the Identity service's JWT login via Kong.

"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  Building2,
  Database,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  Mail,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type StaffRole } from "@/types";

type LoginMode = "select" | "login" | "signup" | "verify" | "demo";

export type LoginHandler = (
  role: StaffRole,
  name: string,
  department?: string,
  license?: string,
  demo?: boolean,
) => void;

// 800ms delay. Shorter feels buggy, longer and it stops feeling like a real login
const FAKE_AUTH_DELAY_MS = 800;

const LICENSE_PATTERN = /^MED-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const MIN_PASSWORD_LENGTH = 8;

// Prototype-only passwords per portal, shown on the form so anyone can demo
// it. Not secrets: there's no real account behind them yet.
// TODO(Phase 1): replace with the Identity service (argon2 hashes + JWT via Kong).
const PROTOTYPE_PASSWORDS: Record<StaffRole, string> = {
  Doctor: "doctor2026",
  Nurse: "nurse2026",
  IT: "admin2026",
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
  Doctor: {
    icon: Stethoscope,
    portal: "Doctor's Portal",
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
  IT: {
    icon: Database,
    portal: "Administrator Portal",
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

const ROLES: StaffRole[] = ["Doctor", "Nurse", "IT"];

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

// ─── LOGIN SCREEN ───

interface LoginScreenProps {
  onLogin: LoginHandler;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<LoginMode>("select");
  const [role, setRole] = useState<StaffRole>("Doctor");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [license, setLicense] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // accounts made with "Create account" during this visit, so they can log
  // back in with their own password until the page reloads
  const sessionAccounts = useRef(new Map<string, string>());
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function goTo(nextMode: LoginMode) {
    setError(null);
    setPassword("");
    setConfirmPassword("");
    setIsPasswordVisible(false);
    setMode(nextMode);
  }

  function accountKey(forRole: StaffRole, forName: string) {
    return `${forRole}:${forName.trim().toLowerCase()}`;
  }

  function chooseRole(selected: StaffRole) {
    setRole(selected);
    goTo("login");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (mode === "signup") {
      if (!LICENSE_PATTERN.test(license)) {
        setError("License / Employee ID must look like MED-XXXX-XXXX.");
        return;
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (password !== confirmPassword) {
        setError("The two passwords don't match.");
        return;
      }
      sessionAccounts.current.set(accountKey(role, name), password);
    } else {
      const expected = sessionAccounts.current.get(accountKey(role, name)) ?? PROTOTYPE_PASSWORDS[role];
      if (password !== expected) {
        setError("Incorrect password for this portal.");
        setPassword("");
        return;
      }
    }

    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (mode === "signup") {
        onLogin(role, name.trim(), department.trim() || undefined, license);
      } else {
        onLogin(role, name.trim());
      }
    }, FAKE_AUTH_DELAY_MS);
  }

  // Not reachable from the UI yet. We're not using the verify flow in the
  // prototype, but we kept it built in case the adviser wants to see OTP in the demo.
  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the full 6-digit access key.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin(role, name.trim() || ROLE_STYLES[role].demoName);
    }, FAKE_AUTH_DELAY_MS);
  }

  const style = ROLE_STYLES[role];
  const verifyEmail = `${(name.trim() || "staff").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@wahter.local`;

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
              "relative flex h-20 w-20 rotate-3 items-center justify-center",
              "rounded-xl bg-white/20 backdrop-blur",
            )}
          >
            <Image
              src="/wah-logo.png"
              alt="WAH logo"
              width={64}
              height={64}
              priority
              className="h-16 w-16 rounded-full shadow-lg"
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

                    <div className="mt-8 space-y-4">
                      {ROLES.map((roleOption) => {
                        const roleStyle = ROLE_STYLES[roleOption];
                        const Icon = roleStyle.icon;
                        return (
                          <button
                            key={roleOption}
                            type="button"
                            onClick={() => chooseRole(roleOption)}
                            className={cn(
                              "group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left sm:gap-5 sm:p-6",
                              "border-glass-border transition-all duration-300",
                              "hover:-translate-y-1 hover:shadow-xl",
                              roleStyle.hoverBorder,
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-16 w-16 shrink-0 items-center justify-center rounded-xl",
                                "transition-transform duration-300",
                                roleStyle.iconBox,
                                roleStyle.hoverRotate,
                              )}
                            >
                              <Icon size={28} />
                            </div>
                            <div>
                              <p className="text-xl font-black">{roleStyle.portal}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                {roleStyle.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => goTo("signup")}
                        className="text-sm font-semibold text-wah-purple hover:underline"
                      >
                        Create New Staff Account
                      </button>
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
                    </div>
                  </div>
                )}

                {(mode === "login" || mode === "signup") && (
                  <form onSubmit={handleSubmit} noValidate>
                    <BackButton onClick={() => goTo("select")} />
                    <span
                      className={cn(
                        "inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                        style.chip,
                      )}
                    >
                      {mode === "login" ? style.portal : ROLE_LABELS[role]}
                    </span>
                    <h2 className="mt-4 text-3xl font-black">
                      {mode === "login" ? "Staff Login" : "New Staff"}
                    </h2>
                    <p className="mt-1 text-text-muted">Enter your assigned medical credentials</p>

                    <div className="mt-8 space-y-5">
                      {mode === "signup" && (
                        <div className="grid grid-cols-2 gap-4">
                          <label className="block space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                              Staff Role
                            </span>
                            <select
                              value={role}
                              onChange={(event) => setRole(event.target.value as StaffRole)}
                              className={cn(inputClass, "px-4")}
                            >
                              {ROLES.map((roleOption) => (
                                <option key={roleOption} value={roleOption}>
                                  {ROLE_LABELS[roleOption]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <Field label="Department" icon={Building2}>
                            <input
                              value={department}
                              onChange={(event) => setDepartment(event.target.value)}
                              placeholder="e.g. Internal Medicine"
                              className={cn(inputClass, "pl-12")}
                            />
                          </Field>
                        </div>
                      )}

                      <Field label="Full Name" icon={Users}>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          placeholder={style.placeholder}
                          autoComplete="name"
                          className={cn(inputClass, "pl-12")}
                        />
                      </Field>

                      {mode === "signup" && (
                        <Field label="License / Employee ID" icon={IdCard}>
                          <input
                            value={license}
                            // uppercase as they type so "med-1234-5678" still passes the pattern
                            onChange={(event) => setLicense(event.target.value.toUpperCase())}
                            placeholder="MED-XXXX-XXXX"
                            maxLength={13}
                            className={cn(inputClass, "pl-12 font-mono")}
                          />
                        </Field>
                      )}

                      <Field label="Password" icon={KeyRound}>
                        <input
                          type={isPasswordVisible ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"}
                          autoComplete={mode === "signup" ? "new-password" : "current-password"}
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

                      {mode === "signup" && (
                        <Field label="Confirm Password" icon={KeyRound}>
                          <input
                            type={isPasswordVisible ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Type it again"
                            autoComplete="new-password"
                            className={cn(inputClass, "pl-12")}
                          />
                        </Field>
                      )}

                      {mode === "login" && (
                        <p className="text-xs text-text-muted">
                          Prototype sign-in: the {ROLE_LABELS[role]} password is{" "}
                          <code className="rounded bg-glass-bg px-1 font-mono">{PROTOTYPE_PASSWORDS[role]}</code>
                        </p>
                      )}

                      {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}

                      <SubmitButton
                        isLoading={isLoading}
                        colorClass={style.submit}
                        label={mode === "login" ? "Enter Portal" : "Create Account"}
                      />

                      {mode === "login" && (
                        <p className="text-center text-sm text-text-muted">
                          New employee?{" "}
                          <button
                            type="button"
                            onClick={() => goTo("signup")}
                            className="font-semibold text-wah-purple hover:underline"
                          >
                            Create account
                          </button>
                        </p>
                      )}
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

                    <div className="mt-6 flex items-center gap-3 rounded-xl bg-wah-purple/10 p-4">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wah-neon opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-wah-neon" />
                      </span>
                      <Mail size={18} className="text-wah-neon" />
                      <span className="truncate font-mono text-sm">{verifyEmail}</span>
                    </div>

                    <input
                      value={otp}
                      // strip anything that isn't a digit instead of relying on type="number",
                      // which lets "e" and "-" through and drops leading zeros
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      aria-label="6-digit access key"
                      className={cn(inputClass, "mt-6 text-center font-mono text-2xl tracking-[0.5em]")}
                    />

                    {error && (
                      <p className="mt-4 animate-bounce text-center text-sm font-bold text-rose-500">
                        🚨 {error}
                      </p>
                    )}

                    <div className="mt-6">
                      <SubmitButton
                        isLoading={isLoading}
                        colorClass="bg-wah-purple"
                        label="Verify OTP & Enter System"
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
                            onClick={() =>
                              onLogin(roleOption, roleStyle.demoName, undefined, undefined, true)
                            }
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
    </div>
  );
}
