"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  icon: LucideIcon;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Small yes/no dialog. Portaled to <body> for the same reason as the other
// dialogs: animated (transformed) parents trap position:fixed children.
export function ConfirmDialog({
  isOpen,
  icon: Icon,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Escape cancels, like closing any other dialog
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* backdrop: clicking outside counts as Cancel */}
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[310] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="confirm-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-none fixed inset-0 z-[320] flex items-center justify-center p-4"
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              className="glass pointer-events-auto w-full max-w-sm rounded-xl p-6 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-wah-purple/10 p-2 text-wah-purple">
                  <Icon size={20} />
                </span>
                <div>
                  <h2 id="confirm-title" className="font-bold">
                    {title}
                  </h2>
                  <p id="confirm-message" className="mt-1 text-sm text-text-muted">
                    {message}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  autoFocus
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-text-muted hover:bg-glass-bg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={cn(
                    "rounded-lg bg-wah-purple px-4 py-2 text-sm font-semibold text-white",
                    "transition-colors hover:bg-wah-neon",
                  )}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
