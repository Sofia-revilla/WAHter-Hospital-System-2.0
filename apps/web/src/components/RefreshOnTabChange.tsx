"use client";

import { useEffect } from "react";
import { useData } from "@/context/DataContext";

interface RefreshOnTabChangeProps {
  tab: string;
}

// Opening a tab re-reads its data right away, so a service that stopped (or
// came back) a moment ago shows up without waiting for the next refresh.
export function RefreshOnTabChange({ tab }: RefreshOnTabChangeProps) {
  const { refreshNow } = useData();

  useEffect(() => {
    refreshNow();
  }, [tab, refreshNow]);

  return null;
}
