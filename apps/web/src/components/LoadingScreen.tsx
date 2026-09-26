"use client";

import Image from "next/image";

interface LoadingScreenProps {
  title: string;
  subtitle?: string;
  // 0–100; leave out for an indeterminate bar
  progress?: number;
}

// Full-screen loader for app start and the first data load after sign-in:
// the logo, a line of text, and a progress bar. A service that's down shows
// up afterwards as the offline notice on its tabs.
export function LoadingScreen({ title, subtitle, progress }: LoadingScreenProps) {
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

        <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-text-muted">
          UNICA-HIJA · Hospital Management System
        </p>
      </div>
    </div>
  );
}
