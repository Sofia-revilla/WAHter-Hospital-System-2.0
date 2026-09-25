"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Activity, Bed, History, Network, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/staff";
import { bedLabel } from "@/lib/beds";
import { useData } from "@/context/DataContext";
import type { StaffRole, Ward } from "@/types";
import { AdmitDialog, type AdmitPreset } from "./AdmitDialog";
import { StatCard } from "./StatCard";

// a ward with more than this many empty beds shows up in "Near-Empty Wards"
const NEAR_EMPTY_THRESHOLD = 5;

interface WardCardProps {
  ward: Ward;
  occupied: number[];
  // who's in each bed we have a record for, keyed by bed index
  occupantNames: Map<number, string>;
  canManageBeds: boolean;
  onOpenAdmit: (preset: AdmitPreset) => void;
}

function WardCard({ ward, occupied, occupantNames, canManageBeds, onOpenAdmit }: WardCardProps) {
  const occupancy = ward.capacity === 0 ? 0 : (occupied.length / ward.capacity) * 100;

  return (
    <div
      className={cn(
        "group rounded-xl border border-glass-border bg-glass-bg p-6",
        "transition-colors hover:border-wah-lavender/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{ward.name}</p>
          <p className="font-mono text-xs text-text-muted">{ward.type}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full bg-wah-purple/10 px-2 py-1",
            "text-[10px] font-black uppercase text-wah-neon",
          )}
        >
          {occupied.length}/{ward.capacity} Beds
        </span>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2.5">
        {Array.from({ length: ward.capacity }, (_, index) => {
          const isOccupied = occupied.includes(index);
          const label = bedLabel(ward, index);
          const occupant = occupantNames.get(index);
          const title = isOccupied ? `${label}: ${occupant ?? "occupied"}` : `${label}: available`;

          // free beds are buttons for staff who can admit; everything else is just a square
          if (!isOccupied && canManageBeds) {
            return (
              <motion.button
                key={index}
                type="button"
                whileHover={{ scale: 1.1 }}
                onClick={() => onOpenAdmit({ wardId: ward.id, bedIndex: index })}
                title={`${title} (click to admit)`}
                aria-label={`Admit a patient to ${label}`}
                className={cn(
                  "aspect-square rounded-lg border border-dashed border-glass-border bg-glass-bg",
                  "hover:border-wah-neon hover:bg-wah-purple/10",
                )}
              />
            );
          }
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.1 }}
              title={title}
              aria-label={title}
              className={cn(
                "aspect-square rounded-lg",
                isOccupied
                  ? occupant
                    ? "bg-wah-neon shadow-md ring-2 ring-wah-purple/40"
                    : "bg-wah-purple shadow-md ring-1 ring-white/10"
                  : "border border-glass-border bg-glass-bg",
              )}
            />
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-bg">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${occupancy}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-wah-neon"
          />
        </div>
        {canManageBeds && (
          <button
            type="button"
            onClick={() => onOpenAdmit({ wardId: ward.id })}
            className={cn(
              "rounded-lg bg-white px-3 py-1.5 text-[10px] font-black uppercase text-wah-deep",
              "opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100",
            )}
          >
            Manage
          </button>
        )}
      </div>
    </div>
  );
}

interface BedManagementViewProps {
  role: StaffRole;
  staffName: string;
}

export function BedManagementView({ role, staffName }: BedManagementViewProps) {
  const { wards, patients, bedAssignments, occupiedBeds } = useData();
  // admitting and moving patients between beds is the registrar's or nurse's job (UC-04)
  const canManageBeds = can(role, "admitPatient");
  const [admitPreset, setAdmitPreset] = useState<AdmitPreset | null>(null);

  const occupiedByWard = new Map(wards.map((ward) => [ward.id, occupiedBeds(ward.id)]));
  const totalBeds = wards.reduce((sum, ward) => sum + ward.capacity, 0);
  const takenBeds = [...occupiedByWard.values()].reduce((sum, beds) => sum + beds.length, 0);
  const freeCount = (ward: Ward) => ward.capacity - (occupiedByWard.get(ward.id)?.length ?? 0);
  const nearEmptyWards = wards.filter((ward) => freeCount(ward) > NEAR_EMPTY_THRESHOLD);

  function occupantNamesFor(wardId: string) {
    const names = new Map<number, string>();
    bedAssignments
      .filter((assignment) => assignment.wardId === wardId)
      .forEach((assignment) => {
        const patient = patients.find((candidate) => candidate.id === assignment.patientId);
        names.set(assignment.bedIndex, patient?.name ?? assignment.patientId);
      });
    return names;
  }

  // Total and Available are counted from the ward data now; Waitlist is still
  // a design figure until Scheduling has an admission queue (Phase 4)
  const statCards = [
    { title: "Total Beds", value: String(totalBeds), sub: "Hospital Capacity", icon: Bed },
    {
      title: "Available",
      value: String(totalBeds - takenBeds),
      sub: "Ready for Admission",
      icon: Plus,
      trend: "Open",
    },
    { title: "Waitlist", value: "08", sub: "Pending ER", icon: History, trend: "Urgent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-wah-purple">Facility Management</p>
          <h2 className="text-2xl font-bold tracking-tight">Bed Management Board</h2>
        </div>
        {canManageBeds && (
          <button
            type="button"
            onClick={() => setAdmitPreset({})}
            className={cn(
              "flex items-center gap-2 rounded-lg bg-wah-purple px-4 py-3",
              "text-[10px] font-bold uppercase tracking-widest text-white",
              "shadow-lg shadow-wah-purple/30 transition-transform hover:scale-105",
            )}
          >
            <Plus size={14} /> Admit Patient
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-xl p-5 xl:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Wards &amp; Occupancy</h3>
              <p className="text-xs text-text-muted">
                {canManageBeds
                  ? "Click a free bed to admit someone into it."
                  : "Hover a bed to see its number."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-wah-purple" /> Occupied
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-wah-neon" /> Admitted today
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-glass-border bg-glass-bg" /> Available
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {wards.map((ward) => (
              <WardCard
                key={ward.id}
                ward={ward}
                occupied={occupiedByWard.get(ward.id) ?? []}
                occupantNames={occupantNamesFor(ward.id)}
                canManageBeds={canManageBeds}
                onOpenAdmit={setAdmitPreset}
              />
            ))}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-4">
          <section className="glass rounded-xl p-5">
            <h3 className="mb-6 text-lg font-bold">Near-Empty Wards</h3>
            {nearEmptyWards.length === 0 ? (
              <p className="text-sm text-text-muted">Every ward is close to full right now.</p>
            ) : (
              <ul className="space-y-3">
                {nearEmptyWards.map((ward) => (
                  <li
                    key={ward.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-wah-lavender/5 p-4"
                  >
                    <div className="min-w-0">
                      {/* type is included because two wards are both "General Ward" */}
                      <p className="font-semibold">
                        {ward.name} <span className="text-text-muted">· {ward.type}</span>
                      </p>
                      <p className="font-mono text-xs uppercase text-wah-neon">
                        {freeCount(ward)} Vacant Slots
                      </p>
                    </div>
                    {canManageBeds && (
                      <button
                        type="button"
                        onClick={() => setAdmitPreset({ wardId: ward.id })}
                        aria-label={`Admit a patient to ${ward.name} (${ward.type})`}
                        className="rounded-lg bg-wah-purple p-2.5 text-white transition-colors hover:bg-wah-neon"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className={cn(
              "relative flex flex-1 flex-col gap-4 overflow-hidden rounded-xl p-5",
              "bg-gradient-to-br from-wah-purple to-wah-neon",
            )}
          >
            <Activity
              size={200}
              aria-hidden
              className="pointer-events-none absolute -bottom-12 -right-12 text-white/10"
            />
            <div className="relative w-fit rounded-xl bg-white/20 p-3 text-white">
              <Network size={24} />
            </div>
            <h3 className="relative text-xl font-bold text-white">Smart Referral</h3>
            <p className="relative text-sm text-white/80">
              Automatic resource routing active across Tarlac Health Network.
            </p>
            {/* TODO(Phase 7b): open the rule-based referral matcher (beds + specialist + distance) */}
            <button
              type="button"
              className={cn(
                "relative mt-auto w-full rounded-xl bg-white py-3",
                "font-bold uppercase text-wah-purple transition-transform hover:scale-105",
              )}
            >
              Routing Engine
            </button>
          </section>
        </div>
      </div>

      <AdmitDialog preset={admitPreset} staffName={staffName} onClose={() => setAdmitPreset(null)} />
    </div>
  );
}
