"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Search } from "lucide-react";
import { ApiError } from "@/lib/api";
import { ROLE_LABELS, STAFF_ROLES, type Provider, type StaffRole } from "@/types";
import { fieldClass } from "@/components/Modal";
import { fetchProviders } from "./api";

// The provider registry, one of the two DOH-mandated registries (comment
// matrix 1 and 3). This is the list every other service resolves provider IDs
// against. Details are edited on Users and Roles; this screen is for looking
// someone up, e.g. checking a PRC license.
export function ProviderRegistryView() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [role, setRole] = useState<StaffRole | "">("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders(role || undefined)
      .then((list) => {
        setProviders(list);
        setError(null);
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Couldn't reach the Access & Provider Registry."),
      );
  }, [role]);

  const needle = query.trim().toLowerCase();
  const visible = providers.filter(
    (provider) =>
      !needle ||
      provider.name.toLowerCase().includes(needle) ||
      provider.id.toLowerCase().includes(needle) ||
      (provider.license ?? "").toLowerCase().includes(needle),
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-wah-purple">System Administration</p>
        <h2 className="text-2xl font-bold tracking-tight">Provider Registry</h2>
      </div>

      <section className="glass rounded-xl p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, provider ID, or license"
              aria-label="Search providers"
              className={`${fieldClass} pl-9`}
            />
          </label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as StaffRole | "")}
            aria-label="Role"
            className={fieldClass}
          >
            <option value="">All roles</option>
            {STAFF_ROLES.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-glass-border text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <th className="pb-3">Provider</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Department</th>
              <th className="pb-3">PRC license</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((provider) => (
              <tr key={provider.id} className="border-b border-glass-border/50">
                <td className="py-3 pr-4">
                  <p className="font-semibold">{provider.name}</p>
                  <p className="font-mono text-xs text-text-muted">{provider.id}</p>
                </td>
                <td className="py-3 pr-4">{ROLE_LABELS[provider.role]}</td>
                <td className="py-3 pr-4 text-text-muted">{provider.department}</td>
                <td className="py-3 font-mono text-xs">
                  {provider.license ? (
                    <span className="inline-flex items-center gap-1">
                      <BadgeCheck size={14} className="text-emerald-600" /> {provider.license}
                    </span>
                  ) : (
                    <span className="text-text-muted">Not licensed</span>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-text-muted">
                  No provider matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
