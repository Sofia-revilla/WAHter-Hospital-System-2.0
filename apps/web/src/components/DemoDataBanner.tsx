"use client";

import { Info } from "lucide-react";
import { currentSession, isApiMode } from "@/lib/api";

// Shown when this build is meant to use the live services (NEXT_PUBLIC_API_URL
// is set) but sign-in fell back to the built-in demo data because the
// gateway couldn't be reached, e.g. the demo tunnel is off.
export function DemoDataBanner() {
  if (!isApiMode || currentSession()) return null;

  return (
    <p
      role="status"
      className="mb-6 flex items-start gap-3 rounded-xl border border-wah-purple/30 bg-wah-purple/5 px-4 py-3 text-sm"
    >
      <Info size={18} className="mt-0.5 shrink-0 text-wah-purple" />
      <span>
        <strong>Showing demo data.</strong> The hospital services can&apos;t be reached right now, so
        this is the built-in sample data and nothing you change is saved.
      </span>
    </p>
  );
}
