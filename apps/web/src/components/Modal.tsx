"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  width?: "md" | "lg";
}

// A form dialog. Portaled to <body> because the tab content animates with a
// transform, and a transformed parent traps position:fixed children inside it.
export function Modal({ isOpen, title, eyebrow, onClose, children, width = "md" }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* click-to-close backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[250] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-none fixed inset-0 z-[260] flex items-center justify-center overflow-y-auto p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={cn(
                "glass pointer-events-auto max-h-[90vh] w-full overflow-y-auto rounded-xl bg-card-bg p-5 shadow-2xl",
                width === "lg" ? "max-w-2xl" : "max-w-lg",
              )}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  {eyebrow && <p className="text-sm font-semibold text-wah-purple">{eyebrow}</p>}
                  <h2 className="text-xl font-bold">{title}</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-lg p-2 text-text-muted hover:bg-glass-bg hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export const fieldClass = cn(
  "w-full rounded-lg border border-glass-border bg-glass-bg p-3 text-sm text-foreground",
  "outline-none focus:ring-1 focus:ring-wah-purple",
);

export const labelClass = "text-[10px] font-bold uppercase tracking-widest text-text-muted";
