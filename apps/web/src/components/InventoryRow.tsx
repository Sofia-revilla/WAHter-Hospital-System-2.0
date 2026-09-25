"use client";

import { Box, History, Pill, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/types";

// minStock is the reorder point, so we treat 2× minStock as a "full" bar.
// Paracetamol (1250 / min 500) caps at 100%; gloves (45 / min 100) sit near 22%.
function stockPercent(item: InventoryItem) {
  return Math.min(item.stock / (item.minStock * 2), 1) * 100;
}

const STATUS_STYLES: Record<InventoryItem["status"], { bar: string; badge: string }> = {
  Critical: { bar: "bg-rose-500", badge: "bg-rose-500/10 text-rose-500" },
  Low: { bar: "bg-orange-400", badge: "bg-orange-400/10 text-orange-400" },
  Good: { bar: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500" },
};

function categoryStyle(category: string) {
  // the design names Medication and Supply; anything else falls back to purple
  if (category === "Medication") return { icon: Pill, box: "bg-blue-500/10 text-blue-400" };
  if (category === "Supply") return { icon: Syringe, box: "bg-amber-500/10 text-amber-500" };
  return { icon: Box, box: "bg-wah-purple/10 text-wah-neon" };
}

interface InventoryRowProps {
  item: InventoryItem;
}

export function InventoryRow({ item }: InventoryRowProps) {
  const { icon: Icon, box } = categoryStyle(item.category);
  const status = STATUS_STYLES[item.status];

  return (
    <tr className="group border-t border-glass-border transition-colors hover:bg-glass-bg">
      <td className="py-4 pr-4">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-xl p-2", box)}>
            <Icon size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="font-mono text-[10px] text-text-muted">{item.id}</p>
          </div>
        </div>
      </td>
      <td className="py-4 pr-4 font-mono text-sm">
        {item.stock.toLocaleString()} <span className="text-text-muted">{item.unit}</span>
      </td>
      <td className="py-4 pr-4">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-glass-bg">
          <div className={cn("h-full rounded-full", status.bar)} style={{ width: `${stockPercent(item)}%` }} />
        </div>
      </td>
      <td className="py-4 pr-4">
        <span className={cn("rounded-md px-2 py-1 text-[9px] font-black uppercase", status.badge)}>
          {item.status}
        </span>
      </td>
      <td className="py-4 text-right">
        {/* TODO(Prompt: Inventory tab): open this item's history panel */}
        <button
          type="button"
          aria-label={`View history for ${item.name}`}
          className={cn(
            "rounded-lg p-1.5 text-text-muted opacity-0 transition-opacity",
            "hover:text-wah-neon group-hover:opacity-100",
          )}
        >
          <History size={16} />
        </button>
      </td>
    </tr>
  );
}
