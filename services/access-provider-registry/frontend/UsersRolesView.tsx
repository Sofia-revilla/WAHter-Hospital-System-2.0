"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Lock, Pencil, ShieldAlert, Unlock, UserPlus, Users, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, timeAgo } from "@/lib/api";
import { ROLE_LABELS, STAFF_ROLES, type StaffRole } from "@/types";
import { StatCard } from "@/components/StatCard";
import { Modal, fieldClass, labelClass } from "@/components/Modal";
import {
  createAccount,
  decideApproval,
  fetchAccounts,
  fetchApprovals,
  requestApproval,
  restoreAccount,
  unlockAccount,
  updateAccount,
  type AccountRecord,
  type ApprovalRecord,
} from "./api";

// UC-08, access management: create, modify, disable, and restore accounts
// and role assignments. Role changes and disabling go to a second System
// Administrator; the screen shows who asked and who still has to decide.

const REFRESH_MS = 10_000;

function lastLoginLabel(iso: string | null) {
  return iso ? timeAgo(iso) : "Never";
}

function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; account: AccountRecord }
  | { kind: "role"; account: AccountRecord }
  | { kind: "disable"; account: AccountRecord }
  | null;

interface UsersRolesViewProps {
  // the signed-in administrator's provider ID, so their own row and their
  // own requests can't be acted on
  adminId: string;
}

export function UsersRolesView({ adminId }: UsersRolesViewProps) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [nextAccounts, nextApprovals] = await Promise.all([fetchAccounts(), fetchApprovals("Pending")]);
      setAccounts(nextAccounts);
      setApprovals(nextApprovals);
      setLoadError(null);
    } catch (error) {
      setLoadError(message(error, "Couldn't reach the Access & Provider Registry."));
    }
  }, []);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => void reload(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const nameOf = (staffId: string) => accounts.find((account) => account.staffId === staffId)?.name ?? staffId;
  const accountOf = (accountId: string) => accounts.find((account) => account.id === accountId);
  const pendingFor = (accountId: string) => approvals.find((approval) => approval.accountId === accountId);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setNotice({ tone: "ok", text: success });
      setDialog(null);
      await reload();
      return true;
    } catch (error) {
      setNotice({ tone: "error", text: message(error, "That didn't go through. Try again.") });
      return false;
    }
  }

  const active = accounts.filter((account) => account.status === "Active").length;
  const locked = accounts.filter((account) => account.isLocked).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-wah-purple">System Administration</p>
          <h2 className="text-2xl font-bold tracking-tight">Users and Roles</h2>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ kind: "create" })}
          className="flex items-center gap-2 rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          <UserPlus size={16} /> Create Staff Account
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Staff Accounts" value={String(accounts.length)} sub={`${active} active`} icon={Users} />
        <StatCard title="Locked" value={String(locked)} sub="After 5 failed sign-ins" icon={Lock} />
        <StatCard title="Waiting for Approval" value={String(approvals.length)} sub="Role changes and disabling" icon={KeyRound} />
      </div>

      {notice && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            notice.tone === "ok" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-600",
          )}
        >
          {notice.text}
        </p>
      )}
      {loadError && <p className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-600">{loadError}</p>}

      {approvals.length > 0 && (
        <section className="glass rounded-xl p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <ShieldAlert size={18} className="text-amber-500" /> Waiting for a second administrator
          </h3>
          <ul className="space-y-3">
            {approvals.map((approval) => {
              const target = accountOf(approval.accountId);
              const isMine = approval.requestedById === adminId;
              const isAboutMe = target?.staffId === adminId;
              return (
                <li
                  key={approval.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-glass-border p-3"
                >
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">
                      {approval.kind === "RoleChange"
                        ? `Change ${target?.name ?? approval.accountId} from ${ROLE_LABELS[approval.fromRole ?? "Nurse"]} to ${ROLE_LABELS[approval.newRole ?? "Nurse"]}`
                        : `Disable ${target?.name ?? approval.accountId}`}
                    </p>
                    <p className="text-xs text-text-muted">
                      {approval.id} · asked by {nameOf(approval.requestedById)} {timeAgo(approval.requestedAt)} ·
                      “{approval.reason}”
                    </p>
                  </div>
                  {isAboutMe ? (
                    <span className="text-xs text-text-muted">About your account: another administrator decides</span>
                  ) : isMine ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted">Waiting for another administrator</span>
                      <button
                        type="button"
                        onClick={() =>
                          void run(() => decideApproval(approval.id, "reject", "Withdrawn by the requester"), `Withdrew ${approval.id}.`)
                        }
                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-text-muted hover:bg-glass-bg"
                      >
                        Withdraw
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void run(() => decideApproval(approval.id, "approve"), `Approved ${approval.id}.`)
                        }
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void run(() => decideApproval(approval.id, "reject"), `Rejected ${approval.id}.`)}
                        className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-500/20"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="glass rounded-xl p-5">
        <h3 className="mb-4 text-lg font-bold">Staff Accounts</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-glass-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
                <th className="pb-3">Staff</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Last sign-in</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const pending = pendingFor(account.id);
                const isSelf = account.staffId === adminId;
                return (
                  <tr key={account.id} className="border-b border-glass-border/50">
                    <td className="py-3 pr-4">
                      <p className="font-semibold">{account.name}</p>
                      <p className="font-mono text-xs text-text-muted">
                        {account.username} · {account.staffId}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-sm">{ROLE_LABELS[account.role]}</td>
                    <td className="py-3 pr-4 text-sm text-text-muted">{account.department}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={cn(
                            "rounded-md px-2 py-1 text-[10px] font-black uppercase",
                            account.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-slate-500/10 text-text-muted",
                          )}
                        >
                          {account.status}
                        </span>
                        {account.isLocked && (
                          <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[10px] font-black uppercase text-rose-600">
                            Locked
                          </span>
                        )}
                        {pending && (
                          <span className="rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-600">
                            Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-text-muted">{lastLoginLabel(account.lastLoginAt)}</td>
                    <td className="py-3 text-right">
                      {/* always visible, not on hover (UI cleanup list) */}
                      <div className="flex flex-wrap justify-end gap-1">
                        <ActionButton icon={Pencil} label="Edit" onClick={() => setDialog({ kind: "edit", account })} />
                        {account.isLocked && (
                          <ActionButton
                            icon={Unlock}
                            label="Unlock"
                            onClick={() => void run(() => unlockAccount(account.id), `Unlocked ${account.name}.`)}
                          />
                        )}
                        {!isSelf && !pending && account.status === "Active" && (
                          <>
                            <ActionButton icon={KeyRound} label="Change role" onClick={() => setDialog({ kind: "role", account })} />
                            <ActionButton
                              icon={XCircle}
                              label="Disable"
                              tone="danger"
                              onClick={() => setDialog({ kind: "disable", account })}
                            />
                          </>
                        )}
                        {account.status === "Disabled" && (
                          <ActionButton
                            icon={CheckCircle2}
                            label="Restore"
                            onClick={() => void run(() => restoreAccount(account.id), `Restored ${account.name}.`)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <CreateAccountDialog
        isOpen={dialog?.kind === "create"}
        onClose={() => setDialog(null)}
        onSubmit={(account) => run(() => createAccount(account), `Created ${account.name}'s account (${account.username}).`)}
      />
      {dialog?.kind === "edit" && (
        <EditAccountDialog
          account={dialog.account}
          onClose={() => setDialog(null)}
          onSubmit={(changes) => run(() => updateAccount(dialog.account.id, changes), `Saved ${dialog.account.name}.`)}
        />
      )}
      {dialog?.kind === "role" && (
        <ReasonDialog
          title={`Change ${dialog.account.name}'s role`}
          account={dialog.account}
          askRole
          submitLabel="Ask for approval"
          onClose={() => setDialog(null)}
          onSubmit={(reason, newRole) =>
            run(
              () => requestApproval(dialog.account.id, { kind: "RoleChange", newRole, reason }),
              "Sent for approval. Another System Administrator has to approve it.",
            )
          }
        />
      )}
      {dialog?.kind === "disable" && (
        <ReasonDialog
          title={`Disable ${dialog.account.name}`}
          account={dialog.account}
          submitLabel="Ask for approval"
          onClose={() => setDialog(null)}
          onSubmit={(reason) =>
            run(
              () => requestApproval(dialog.account.id, { kind: "Disable", reason }),
              "Sent for approval. Another System Administrator has to approve it.",
            )
          }
        />
      )}
    </div>
  );
}

// ─── SMALL PIECES ───

interface ActionButtonProps {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  tone?: "danger";
}

function ActionButton({ icon: Icon, label, onClick, tone }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase",
        tone === "danger" ? "text-rose-500 hover:bg-rose-500/10" : "text-wah-purple hover:bg-wah-purple/10",
      )}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

interface CreateAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (account: Parameters<typeof createAccount>[0]) => Promise<boolean>;
}

const EMPTY_ACCOUNT = {
  name: "",
  role: "Nurse" as StaffRole,
  department: "",
  license: "",
  username: "",
  email: "",
  temporaryPassword: "",
};

function CreateAccountDialog({ isOpen, onClose, onSubmit }: CreateAccountDialogProps) {
  const [draft, setDraft] = useState(EMPTY_ACCOUNT);
  const [hasGivenNotice, setHasGivenNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof EMPTY_ACCOUNT>(key: K, value: (typeof EMPTY_ACCOUNT)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.department.trim() || !draft.username.trim() || !draft.email.trim()) {
      setError("Fill in the name, department, username, and email.");
      return;
    }
    if (draft.temporaryPassword.length < 8) {
      setError("The temporary password needs at least 8 characters.");
      return;
    }
    if (!hasGivenNotice) {
      setError("Confirm the staff member got the Data Privacy Notice and agreed to it.");
      return;
    }
    setError(null);
    const ok = await onSubmit({
      ...draft,
      username: draft.username.trim().toLowerCase(),
      license: draft.license.trim() || undefined,
    });
    if (ok) {
      setDraft(EMPTY_ACCOUNT);
      setHasGivenNotice(false);
    }
  }

  return (
    <Modal isOpen={isOpen} title="Create Staff Account" eyebrow="Users and Roles" onClose={onClose} width="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className={labelClass}>Full name</span>
            <input value={draft.name} onChange={(event) => update("name", event.target.value)} className={fieldClass} />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Role</span>
            <select
              value={draft.role}
              onChange={(event) => update("role", event.target.value as StaffRole)}
              className={fieldClass}
            >
              {STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Department</span>
            <input
              value={draft.department}
              onChange={(event) => update("department", event.target.value)}
              placeholder="e.g. Internal Medicine"
              className={fieldClass}
            />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>PRC license (if licensed)</span>
            <input
              value={draft.license}
              onChange={(event) => update("license", event.target.value.toUpperCase())}
              placeholder="MED-XXXX-XXXX"
              maxLength={13}
              className={cn(fieldClass, "font-mono")}
            />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Username</span>
            <input
              value={draft.username}
              onChange={(event) => update("username", event.target.value)}
              placeholder="e.g. sjohnson"
              autoCapitalize="none"
              className={cn(fieldClass, "font-mono")}
            />
          </label>
          <label className="space-y-1">
            <span className={labelClass}>Email (for access keys)</span>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="sjohnson@wahter.local"
              className={fieldClass}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className={labelClass}>Temporary password (hand it over in person)</span>
            <input
              type="text"
              value={draft.temporaryPassword}
              onChange={(event) => update("temporaryPassword", event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="off"
              className={cn(fieldClass, "font-mono")}
            />
          </label>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={hasGivenNotice}
            onChange={(event) => setHasGivenNotice(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-wah-purple"
          />
          <span>
            The staff member got the Data Privacy Notice (RA 10173) and agreed to WAHter processing their
            personal information for this account.
          </span>
        </label>
        {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            Create account
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface EditAccountDialogProps {
  account: AccountRecord;
  onClose: () => void;
  onSubmit: (changes: { name?: string; department?: string; license?: string | null; email?: string }) => Promise<boolean>;
}

function EditAccountDialog({ account, onClose, onSubmit }: EditAccountDialogProps) {
  const [name, setName] = useState(account.name);
  const [department, setDepartment] = useState(account.department);
  const [license, setLicense] = useState(account.license ?? "");
  const [email, setEmail] = useState(account.email);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // only what actually changed, so the audit trail lists the real fields
    void onSubmit({
      name: name.trim() !== account.name ? name.trim() : undefined,
      department: department.trim() !== account.department ? department.trim() : undefined,
      license: license.trim() !== (account.license ?? "") ? license.trim() || null : undefined,
      email: email.trim() !== account.email ? email.trim() : undefined,
    });
  }

  return (
    <Modal isOpen title={`Edit ${account.name}`} eyebrow="Users and Roles" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <label className="block space-y-1">
          <span className={labelClass}>Full name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Department</span>
          <input value={department} onChange={(event) => setDepartment(event.target.value)} className={fieldClass} />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>PRC license</span>
          <input
            value={license}
            onChange={(event) => setLicense(event.target.value.toUpperCase())}
            placeholder="MED-XXXX-XXXX (blank if not licensed)"
            maxLength={13}
            className={cn(fieldClass, "font-mono")}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelClass}>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
        </label>
        <p className="text-xs text-text-muted">The role is changed with “Change role”, which needs a second administrator.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ReasonDialogProps {
  title: string;
  account: AccountRecord;
  askRole?: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (reason: string, newRole?: StaffRole) => Promise<boolean>;
}

function ReasonDialog({ title, account, askRole, submitLabel, onClose, onSubmit }: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>(
    STAFF_ROLES.find((role) => role !== account.role) ?? "Nurse",
  );
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setError("Give a short reason (at least 5 characters). It goes to the approver and the audit trail.");
      return;
    }
    void onSubmit(reason.trim(), askRole ? newRole : undefined);
  }

  return (
    <Modal isOpen title={title} eyebrow="Needs a second System Administrator" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {askRole && (
          <label className="block space-y-1">
            <span className={labelClass}>New role (now {ROLE_LABELS[account.role]})</span>
            <select value={newRole} onChange={(event) => setNewRole(event.target.value as StaffRole)} className={fieldClass}>
              {STAFF_ROLES.filter((role) => role !== account.role).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block space-y-1">
          <span className={labelClass}>Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className={fieldClass}
          />
        </label>
        {error && <p className="text-sm font-semibold text-rose-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-muted hover:bg-glass-bg">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
