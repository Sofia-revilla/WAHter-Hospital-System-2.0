"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  // optional: some cards have nothing worth flagging next to the number
  trend?: string;
}

// Compact KPI card: label on top, big number with a small chip beside it,
// caption underneath. Flat and bordered to match the rest of the layout.
export function StatCard({ title, value, sub, icon: Icon, trend }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="glass rounded-xl p-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="rounded-md bg-wah-purple/10 p-1.5 text-wah-purple">
          <Icon size={15} />
        </span>
        {title}
      </p>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {trend && (
          <span
            className={cn(
              "rounded-md bg-wah-neon/10 px-1.5 py-0.5",
              "text-[10px] font-semibold text-wah-purple",
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-text-muted">{sub}</p>
    </motion.div>
  );
}
