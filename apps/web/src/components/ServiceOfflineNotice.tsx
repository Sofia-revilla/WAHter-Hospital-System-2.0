"use client";

import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICE_LABELS, timeAgo, type ServiceName } from "@/lib/api";
import { useData } from "@/context/DataContext";

interface ServiceOfflineNoticeProps {
  // the services the open tab reads from (TABS[tab].services)
  services: ServiceName[];
}

// Shown above a tab when one of its services stops answering. It makes the
// paper's fault-isolation goal visible: the rest of the screen keeps working,
// and staff can see exactly which part is stale and why.
export function ServiceOfflineNotice({ services }: ServiceOfflineNoticeProps) {
  const { offlineServices, isSystemOffline } = useData();

  // Everything down at once (Docker stopped, tunnel gone) reads better as one
  // message than as a notice per service
  if (isSystemOffline) {
    return (
      <p
        role="alert"
        className={cn(
          "mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3",
          "text-sm text-rose-700",
        )}
      >
        <CloudOff size={18} className="mt-0.5 shrink-0" />
        <span>
          <strong>The hospital system is offline.</strong> None of the services are answering, so
          nothing can load or save. This screen picks it up again by itself once they&apos;re back.
        </span>
      </p>
    );
  }

  const affected = offlineServices.filter((offline) => services.includes(offline.service));
  if (affected.length === 0) return null;

  return (
    <div role="status" className="mb-6 space-y-2">
      {affected.map(({ service, lastSeenAt }) => (
        <p
          key={service}
          className={cn(
            "flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3",
            "text-sm text-amber-700",
          )}
        >
          <CloudOff size={18} className="mt-0.5 shrink-0" />
          <span>
            <strong>{SERVICE_LABELS[service]} is offline.</strong>{" "}
            {lastSeenAt
              ? `Showing the last data it sent (${timeAgo(lastSeenAt)}). Changes that need it won't save until it's back; the rest of this screen still works.`
              : "Its data can't load right now. The rest of this screen still works."}
          </span>
        </p>
      ))}
    </div>
  );
}
