"use client";

import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  // optional: some cards (Pharmacy's "Expired Soon") have no trend badge
  trend?: string;
}

export function StatCard({ title, value, sub, icon: Icon, trend }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="glass relative overflow-hidden rounded-2xl p-5"
    >
      {/* oversized watermark; overflow-hidden on the card crops it to a corner */}
      <Icon
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 size-[120px] text-wah-purple opacity-10"
      />

      <div className="relative flex items-start justify-between">
        <div className="rounded-xl bg-wah-purple/20 p-2.5 text-wah-neon">
          <Icon size={20} />
        </div>
        {trend && (
          <span
            className={cn(
              "rounded-full bg-wah-neon/10 px-2 py-0.5",
              "text-[10px] font-bold uppercase text-wah-neon",
            )}
          >
            {trend}
          </span>
        )}
      </div>

      <p className="relative mt-4 text-sm text-text-secondary">{title}</p>
      <p className="relative mt-1 text-2xl font-bold text-foreground">{value}</p>
      <p className="relative mt-1 font-mono text-xs uppercase tracking-widest text-text-muted">
        {sub}
      </p>
    </motion.div>
  );
}
