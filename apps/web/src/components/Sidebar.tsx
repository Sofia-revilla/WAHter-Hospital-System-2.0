"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ChevronRight, PanelLeftClose, Search, X } from "lucide-react";
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
      className="h-12 w-12 shrink-0 rounded-full shadow-xl transition-transform hover:scale-110"
    />
  );
}

interface SidebarItemProps {
  tab: TabId;
  isActive: boolean;
  isExpanded: boolean;
  onSelect: (tab: TabId) => void;
}

export function SidebarItem({ tab, isActive, isExpanded, onSelect }: SidebarItemProps) {
  const { icon: Icon, label, description } = TABS[tab];

  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center rounded-xl transition-all duration-200",
        isExpanded
          ? "flex-row gap-3 px-4 py-3 short:py-2.5"
          : "flex-col gap-1 py-3 short:py-2",
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

      <Icon
        size={isExpanded ? 20 : 24}
        className="shrink-0 transition-transform group-hover:scale-110"
      />

      {isExpanded ? (
        <span className="truncate text-sm font-semibold">{label}</span>
      ) : (
        <>
          <span className="text-[9px] font-black uppercase tracking-tight">{tab}</span>

          {/* tooltips only in the rail; the expanded list already shows the names */}
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
        </>
      )}
    </button>
  );
}

interface SidebarProps {
  role: StaffRole;
  activeTab: TabId;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (tab: TabId) => void;
}

export function Sidebar({ role, activeTab, isExpanded, onToggle, onSelect }: SidebarProps) {
  const [query, setQuery] = useState("");

  const roleTabs = ROLE_TABS[role];
  // the search box only narrows the module list; it's a quick jump, not patient search
  const needle = query.trim().toLowerCase();
  const visibleTabs = isExpanded && needle
    ? roleTabs.filter((tab) => TABS[tab].label.toLowerCase().includes(needle))
    : roleTabs;

  function selectAndClear(tab: TabId) {
    onSelect(tab);
    setQuery("");
  }

  return (
    // No overflow-y-auto on purpose: any overflow setting clips the rail's
    // tooltips (and the expand button) that stick out to the right. Instead the
    // items tighten up on short screens so IT Admin's nine tabs still fit ~700px.
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col gap-6 short:gap-4",
        "border-r border-glass-border bg-card-bg py-5 short:py-3",
        "transition-[width] duration-300",
        // widths must stay in sync with App's ml-64 / ml-20
        isExpanded
          ? "w-64 px-4"
          : // px-1, not px-2: "ARCHITECTURE" at 9px black needs ~70px of the 80
            "w-20 items-center px-1",
      )}
    >
      {isExpanded ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="truncate text-2xl font-black">
              WAH<span className="text-wah-accent">ter</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className={cn(
              "shrink-0 rounded-lg p-2 text-text-muted transition-colors",
              "hover:bg-glass-bg hover:text-foreground",
            )}
          >
            <PanelLeftClose size={20} />
          </button>
        </div>
      ) : (
        <Logo />
      )}

      {/* collapsed rail: a small tab on the edge instead of a full row, so the
          rail doesn't lose any height to the toggle */}
      {!isExpanded && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className={cn(
            "absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full",
            "border border-glass-border bg-card-bg text-text-muted shadow-md",
            "transition-colors hover:text-wah-neon",
          )}
        >
          <ChevronRight size={14} />
        </button>
      )}

      {isExpanded && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-3 py-2",
            "focus-within:ring-2 focus-within:ring-wah-purple/40",
          )}
        >
          <Search size={16} className="shrink-0 text-text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && visibleTabs[0]) selectAndClear(visibleTabs[0]);
              if (event.key === "Escape") setQuery("");
            }}
            placeholder="Search"
            aria-label="Search modules"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-secondary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="shrink-0 text-text-muted hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <nav className="flex w-full flex-col gap-1.5">
        {visibleTabs.map((tab) => (
          <SidebarItem
            key={tab}
            tab={tab}
            isActive={tab === activeTab}
            isExpanded={isExpanded}
            onSelect={selectAndClear}
          />
        ))}
        {visibleTabs.length === 0 && (
          <p className="px-4 py-3 text-sm text-text-muted">No module matches “{query}”.</p>
        )}
      </nav>
    </aside>
  );
}
