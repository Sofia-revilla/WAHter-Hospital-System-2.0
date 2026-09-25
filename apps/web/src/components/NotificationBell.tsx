"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useData } from "@/context/DataContext";
import type { StaffRole } from "@/types";
import { MewsChip } from "./MewsChip";

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

interface NotificationBellProps {
  role: StaffRole;
  // clicking an alert takes you to the dashboard, where it can be acknowledged
  onOpenAlerts: () => void;
}

export function NotificationBell({ role, onOpenAlerts }: NotificationBellProps) {
  const { mewsAlerts } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // IT has no clinical access (paper: IT portal sees no patient data), so MEWS
  // alerts never reach its inbox
  const notifications = role === "IT" ? [] : mewsAlerts.filter((alert) => !alert.acknowledgedAt);

  // close on outside click or Escape, like any other dropdown
  useEffect(() => {
    if (!isOpen) return;
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={
          notifications.length > 0 ? `Notifications, ${notifications.length} unread` : "Notifications"
        }
        aria-expanded={isOpen}
        className={cn(
          "glass relative flex h-10 w-10 items-center justify-center rounded-xl",
          "text-text-muted transition-colors hover:text-wah-neon",
        )}
      >
        <Bell size={18} />
        {notifications.length > 0 && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1",
              "bg-rose-500 text-[10px] font-black text-white",
            )}
          >
            {notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Notifications"
            className={cn(
              "absolute right-0 top-12 z-40 w-80 overflow-hidden rounded-2xl",
              "border border-glass-border bg-card-bg shadow-2xl",
            )}
          >
            <div className="flex items-center justify-between border-b border-glass-border px-4 py-3">
              <p className="font-bold">Notifications</p>
              <span className="text-[10px] font-bold uppercase text-text-muted">
                {notifications.length} unread
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <BellOff size={28} className="text-text-muted opacity-50" />
                <p className="font-semibold">No notifications available</p>
                <p className="text-xs text-text-muted">You&apos;re all caught up.</p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto p-2">
                {notifications.map((alert) => (
                  <li key={alert.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAlerts();
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-glass-bg"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          MEWS alert · {alert.patientName}
                        </span>
                        <MewsChip risk={alert.risk} score={alert.mewsScore} />
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {alert.patientId} · {timeAgo(alert.raisedAt)} · tap to acknowledge
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
