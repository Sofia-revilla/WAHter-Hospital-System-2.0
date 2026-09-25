"use client";

import { motion } from "motion/react";
import { Activity, Bed, History, Network, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/staff";
import { useData } from "@/context/DataContext";
import type { StaffRole, Ward } from "@/types";
import { StatCard } from "./StatCard";

// Fixed numbers from the UI design. Heads up: the mock wards add up to 70 beds
// and 24 free, not 23. They'll match once both come from Scheduling (Phase 4).
const STAT_CARDS = [
  { title: "Total Beds", value: "70", sub: "Hospital Capacity", icon: Bed },
  { title: "Available", value: "23", sub: "Ready for Admission", icon: Plus, trend: "Open" },
  { title: "Waitlist", value: "08", sub: "Pending ER", icon: History, trend: "Urgent" },
];

// a ward with more than this many empty beds shows up in "Near-Empty Wards"
const NEAR_EMPTY_THRESHOLD = 5;

function vacantBeds(ward: Ward) {
  return ward.capacity - ward.occupied;
}

interface WardCardProps {
  ward: Ward;
  canManageBeds: boolean;
}

function WardCard({ ward, canManageBeds }: WardCardProps) {
  const occupancy = ward.capacity === 0 ? 0 : (ward.occupied / ward.capacity) * 100;

  return (
    <div
      className={cn(
        "group cursor-pointer rounded-[2rem] border border-glass-border bg-glass-bg p-6",
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
          {ward.occupied}/{ward.capacity} Beds
        </span>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2.5">
        {Array.from({ length: ward.capacity }, (_, index) => {
          const isOccupied = index < ward.occupied;
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.1 }}
              aria-label={`Bed ${index + 1}: ${isOccupied ? "occupied" : "available"}`}
              className={cn(
                "aspect-square rounded-lg",
                isOccupied
                  ? "bg-wah-purple shadow-md ring-1 ring-white/10"
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
          // TODO(Phase 4): open this ward on the Scheduling service's bed board
          <button
            type="button"
            className={cn(
              "rounded-xl bg-white px-3 py-1.5 text-[10px] font-black uppercase text-wah-deep",
              "opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100",
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
}

export function BedManagementView({ role }: BedManagementViewProps) {
  const { wards } = useData();
  // admitting and moving patients between beds is the registrar's or nurse's job (UC-04)
  const canManageBeds = can(role, "admitPatient");
  const nearEmptyWards = wards.filter((ward) => vacantBeds(ward) > NEAR_EMPTY_THRESHOLD);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-wah-purple">Facility Management</p>
        <h2 className="text-3xl font-bold tracking-tight">Bed Management Board</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-[2rem] p-8 xl:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Wards &amp; Occupancy</h3>
              <p className="text-xs text-text-muted">Visual Grid Layout</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-wah-purple" /> Occupied
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border border-glass-border bg-glass-bg" /> Available
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {wards.map((ward) => (
              <WardCard key={ward.id} ward={ward} canManageBeds={canManageBeds} />
            ))}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-8 xl:col-span-4">
          <section className="glass rounded-[2rem] p-8">
            <h3 className="mb-6 text-lg font-bold">Near-Empty Wards</h3>
            {nearEmptyWards.length === 0 ? (
              <p className="text-sm text-text-muted">Every ward is close to full right now.</p>
            ) : (
              <ul className="space-y-3">
                {nearEmptyWards.map((ward) => (
                  <li
                    key={ward.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-wah-lavender/5 p-4"
                  >
                    <div className="min-w-0">
                      {/* type is included because two wards are both "General Ward" */}
                      <p className="font-semibold">
                        {ward.name} <span className="text-text-muted">· {ward.type}</span>
                      </p>
                      <p className="font-mono text-xs uppercase text-wah-neon">
                        {vacantBeds(ward)} Vacant Slots
                      </p>
                    </div>
                    {canManageBeds && (
                      // TODO(Phase 9a): start an admission into this ward
                      <button
                        type="button"
                        aria-label={`Admit a patient to ${ward.name} (${ward.type})`}
                        className="rounded-xl bg-wah-purple p-2.5 text-white transition-colors hover:bg-wah-neon"
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
              "relative flex flex-1 flex-col gap-4 overflow-hidden rounded-[2rem] p-8",
              "bg-gradient-to-br from-wah-purple to-wah-neon",
            )}
          >
            <Activity
              size={200}
              aria-hidden
              className="pointer-events-none absolute -bottom-12 -right-12 text-white/10"
            />
            <div className="relative w-fit rounded-2xl bg-white/20 p-3 text-white">
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
                "relative mt-auto w-full rounded-2xl bg-white py-3",
                "font-bold uppercase text-wah-purple transition-transform hover:scale-105",
              )}
            >
              Routing Engine
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
