"use client";

import { useState } from "react";
import { Activity, AlertTriangle, DollarSign, History, Package, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import type { InventoryItem } from "@/types";
import { StatCard } from "./StatCard";

const STAT_CARDS = [
  { title: "Total SKU", value: "482", sub: "Active Items", icon: Package },
  {
    title: "Critical Stock",
    value: "12",
    sub: "Immediate Action",
    icon: AlertTriangle,
    trend: "Urgent",
  },
  { title: "Value", value: "₱ 2.4M", sub: "On-Hand Total", icon: DollarSign },
  { title: "Turnover", value: "84%", sub: "Monthly Ratio", icon: Activity, trend: "+4.2%" },
];

const FILTERS = ["All", "Meds", "Equip", "Surgical"] as const;
type InventoryFilter = (typeof FILTERS)[number];

// The mock data only has "Medication" and "Supply". Every Supply item so far
// is surgical/clinical consumables, so Surgical maps there; Equip waits for an
// "Equipment" category and shows the empty state until then.
function matchesFilter(item: InventoryItem, filter: InventoryFilter) {
  const category: string = item.category;
  if (filter === "All") return true;
  if (filter === "Meds") return category === "Medication";
  if (filter === "Surgical") return category === "Supply";
  return category === "Equipment";
}

type ExpiryStatus = "Critical" | "Warning" | "Safe";

const EXPIRY_WATCH: { name: string; date: string; status: ExpiryStatus }[] = [
  { name: "Cefuroxime 500", date: "12 Days", status: "Critical" },
  { name: "Surgical Kit B", date: "24 Days", status: "Warning" },
  { name: "N95 Mask Box", date: "45 Days", status: "Safe" },
];

const EXPIRY_DOT: Record<ExpiryStatus, string> = {
  Critical: "bg-red-500 shadow-[0_0_8px_#ef4444]",
  Warning: "bg-orange-400 shadow-[0_0_8px_#fb923c]",
  Safe: "bg-emerald-500 shadow-[0_0_8px_#10b981]",
};

export function InventoryView() {
  const { inventory } = useData();
  const [filter, setFilter] = useState<InventoryFilter>("All");

  const visibleItems = inventory.filter((item) => matchesFilter(item, filter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-wah-purple">Supply Chain &amp; Logistics</p>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
        </div>
        <div className="flex gap-3">
          {/* TODO: stock audit and batch intake need an inventory backend, which is out of
              scope for WAH2.0 (master prompt §1); these stay visual for the prototype */}
          <button
            type="button"
            className={cn(
              "glass rounded-lg px-4 py-3",
              "text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-foreground",
            )}
          >
            Stock Audit
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-lg bg-wah-purple px-4 py-3",
              "text-[10px] font-bold uppercase tracking-widest text-white",
              "shadow-lg shadow-wah-purple/30 transition-transform hover:scale-105",
            )}
          >
            <Plus size={14} /> Add New Batch
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-glass-border bg-glass-bg p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-wah-neon">Module Vision</p>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          <span className="font-semibold text-foreground">
            Automated Inter-Hospital Resource Routing:
          </span>{" "}
          Utilizing an Automatic Logic Engine to manage medical supply distribution. The system
          continuously scans inventory for items nearing expiration and matches them with hospitals
          reporting low stock levels, effectively eliminating medical waste and optimizing
          life-saving resource turnover.
        </p>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <section className="glass min-w-0 rounded-xl p-5 xl:col-span-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-bold">Comprehensive Inventory</h3>
            <div
              role="tablist"
              aria-label="Category filter"
              className="flex rounded-lg bg-white/5 p-1"
            >
              {FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="tab"
                  aria-selected={filter === option}
                  onClick={() => setFilter(option)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                    filter === option
                      ? "bg-wah-purple text-white"
                      : "text-text-muted hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr
                  className={cn(
                    "border-b border-glass-border",
                    "text-[10px] font-bold uppercase tracking-widest text-text-muted",
                  )}
                >
                  <th className="pb-4">Item Details</th>
                  <th className="pb-4">Category</th>
                  <th className="pb-4">Stock</th>
                  <th className="pb-4">Min. Threshold</th>
                  <th className="pb-4">Expiry</th>
                  <th className="pb-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-text-muted">
                      <Package size={32} className="mx-auto opacity-30" />
                      <p className="mt-3 font-semibold text-foreground">No items in this category</p>
                      <p className="text-sm">Try another filter.</p>
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => (
                    <tr
                      key={item.id}
                      className="group border-b border-glass-border/50 transition-colors hover:bg-glass-bg"
                    >
                      <td className="py-4 pr-4">
                        <p className="font-semibold">{item.name}</p>
                        <p className="font-mono text-xs italic text-text-muted">{item.id}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={cn(
                            "rounded border border-glass-border bg-glass-bg px-2 py-0.5",
                            "text-[9px] font-bold uppercase",
                          )}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-mono text-sm">
                        {item.stock.toLocaleString()} {item.unit}
                      </td>
                      <td className="py-4 pr-4 font-mono text-sm text-text-muted">
                        {item.minStock.toLocaleString()}
                      </td>
                      {/* hardcoded per the design; the mock items don't carry expiry dates */}
                      <td className="py-4 pr-4 font-mono text-sm">05/2026</td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          aria-label={`View history for ${item.name}`}
                          className={cn(
                            "rounded-lg p-1.5 text-wah-neon opacity-0 transition-opacity",
                            "group-hover:opacity-100 focus:opacity-100",
                          )}
                        >
                          <History size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-6 xl:col-span-4">
          <section className="glass rounded-xl border-l-4 border-l-wah-lavender/30 p-5">
            <h3 className="mb-6 text-lg font-bold">Expiry Watch</h3>
            <ul className="space-y-3">
              {EXPIRY_WATCH.map((item) => (
                <li
                  key={item.name}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg p-3",
                    "border border-glass-border bg-glass-bg",
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="font-mono text-[10px] uppercase text-text-muted">
                      Expires in {item.date}
                    </p>
                  </div>
                  <span
                    aria-label={item.status}
                    className={cn("h-2 w-2 shrink-0 rounded-full", EXPIRY_DOT[item.status])}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={cn(
                "mt-6 w-full rounded-lg bg-wah-lavender/10 py-3",
                "text-xs font-black uppercase tracking-widest text-wah-lavender",
                "transition-colors hover:bg-wah-lavender/20",
              )}
            >
              Routing Suggestions
            </button>
          </section>

          <section
            className={cn(
              "relative overflow-hidden rounded-xl p-5",
              "bg-gradient-to-br from-wah-purple/40 to-wah-neon/10",
            )}
          >
            <Activity
              size={120}
              aria-hidden
              className="pointer-events-none absolute -bottom-6 -right-6 text-white/5"
            />
            <h3 className="relative font-bold">Automated Ordering</h3>
            <p className="relative mt-2 text-[11px] text-wah-lavender/70">
              AI detected low levels in 4 critical items. Re-order drafts created.
            </p>
            <button
              type="button"
              className="relative mt-6 rounded-lg bg-white px-4 py-2 text-sm font-bold text-wah-deep"
            >
              Review Drafts
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
