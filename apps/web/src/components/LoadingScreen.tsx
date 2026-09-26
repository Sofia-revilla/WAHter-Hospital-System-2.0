"use client";

import Image from "next/image";
import { Check, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStep {
  label: string;
  state: "loading" | "ready" | "offline";
}

interface LoadingScreenProps {
  title: string;
  subtitle?: string;
  // 0–100; leave out for an indeterminate bar
  progress?: number;
  steps?: LoadingStep[];
}

// Full-screen loader for app start and the first data load after sign-in.
// It lists each service as it answers, so a slow or stopped service shows up
// here by name instead of as a blank screen.
export function LoadingScreen({ title, subtitle, progress, steps }: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[400] flex items-center justify-center bg-background p-6 text-foreground"
    >
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto h-20 w-20">
          <span className="absolute inset-0 animate-ping rounded-full bg-wah-purple/20" />
          <span className="absolute inset-1 rounded-full bg-card-bg shadow-lg ring-1 ring-wah-purple/20" />
          <Image
            src="/wah-logo.png"
            alt=""
            width={56}
            height={56}
            priority
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          />
        </div>

        <p className="mt-6 text-xl font-black tracking-tight">
          WAH<span className="text-wah-neon">ter</span>
        </p>
        <p className="mt-1 text-sm font-semibold">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-wah-purple/10">
          {progress === undefined ? (
            <div className="wah-loading-indeterminate h-full w-1/3 rounded-full bg-wah-purple" />
          ) : (
            <div
              className="h-full rounded-full bg-wah-purple transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(6, Math.min(100, progress))}%` }}
            />
          )}
        </div>

        {steps && steps.length > 0 && (
          <ul className="mt-6 space-y-2 text-left">
            {steps.map((step) => (
              <li
                key={step.label}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                  "border border-glass-border bg-card-bg",
                )}
              >
                <span className="font-semibold">{step.label}</span>
                {step.state === "loading" && (
                  <span className="flex items-center gap-1.5 text-text-muted">
                    <Loader2 size={14} className="animate-spin" /> Connecting
                  </span>
                )}
                {step.state === "ready" && (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <Check size={14} /> Ready
                  </span>
                )}
                {step.state === "offline" && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <CloudOff size={14} /> Offline
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-text-muted">
          UNICA-HIJA · Hospital Management System
        </p>
      </div>
    </div>
  );
}
