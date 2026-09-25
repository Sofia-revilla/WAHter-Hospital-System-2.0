"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ROLE_TABS, TABS, type TabId } from "@/navigation";
import type { StaffRole } from "@/types";

export function Logo() {
  return (
    <Image
      src="/wah-logo.png"
      alt="WAHter logo"
      width={48}
      height={48}
      priority
      className="h-12 w-12 rounded-full shadow-xl transition-transform hover:scale-110"
    />
  );
}

interface SidebarItemProps {
  tab: TabId;
  isActive: boolean;
  onSelect: (tab: TabId) => void;
}

export function SidebarItem({ tab, isActive, onSelect }: SidebarItemProps) {
  const { icon: Icon, label, description } = TABS[tab];

  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex w-full flex-col items-center gap-1 rounded-xl py-3 short:py-2",
        "transition-all duration-200",
        isActive
          ? "bg-wah-purple text-white shadow-lg shadow-wah-purple/20"
          : "text-text-muted hover:bg-glass-bg hover:text-foreground",
      )}
    >
      {/* layoutId lets motion slide this bar from the old tab to the new one
          instead of it popping in, since every item renders its own copy */}
      {isActive && (
        <motion.span
          layoutId="active-nav"
          className="absolute left-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r-full bg-white"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      <Icon size={24} className="transition-transform group-hover:scale-110" />
      <span className="text-[9px] font-black uppercase tracking-tight">{tab}</span>

      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-24 top-1/2 z-50 w-56 -translate-y-1/2",
          "origin-left scale-0 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left",
          "opacity-0 shadow-2xl transition-all duration-200",
          "group-hover:scale-100 group-hover:opacity-100",
        )}
      >
        <span className="block text-[10px] font-black uppercase tracking-widest text-wah-neon">
          Module: {label}
        </span>
        <span className="mt-1 block text-xs normal-case text-slate-300">{description}</span>
      </span>
    </button>
  );
}

interface SidebarProps {
  role: StaffRole;
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
}

export function Sidebar({ role, activeTab, onSelect }: SidebarProps) {
  return (
    // No overflow-y-auto on purpose: any overflow setting clips the tooltips
    // that stick out to the right. Instead the items tighten up on short
    // screens (the "short:" variant) so IT Admin's nine tabs still fit at ~700px.
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-20 flex-col items-center gap-6 short:gap-4",
        // px-1, not px-2: "ARCHITECTURE" at 9px black needs ~70px of the 80
        "border-r border-glass-border bg-card-bg px-1 py-5 short:py-3",
      )}
    >
      <Logo />
      <nav className="flex w-full flex-col gap-1.5">
        {ROLE_TABS[role].map((tab) => (
          <SidebarItem key={tab} tab={tab} isActive={tab === activeTab} onSelect={onSelect} />
        ))}
      </nav>
    </aside>
  );
}
