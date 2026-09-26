"use client";

import { useEffect, useState } from "react";
import { SERVICE_LABELS } from "@/lib/api";
import { useData } from "@/context/DataContext";
import { LoadingScreen } from "./LoadingScreen";

// Long enough to read, short enough not to feel like a fake wait. Without a
// floor the screen flashes for a few frames when everything answers at once.
const MIN_VISIBLE_MS = 700;

interface WorkspaceLoaderProps {
  roleLabel: string;
}

// Covers the portal until its first data load finishes. Only the services
// this role actually reads from are listed (a pharmacist never waits on beds).
export function WorkspaceLoader({ roleLabel }: WorkspaceLoaderProps) {
  const { isLoading, loadSteps } = useData();
  const [hasMinTimePassed, setHasMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasMinTimePassed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoading && hasMinTimePassed) return null;

  const settled = loadSteps.filter((step) => step.state !== "loading").length;
  const progress = loadSteps.length === 0 ? (hasMinTimePassed ? 100 : 60) : (settled / loadSteps.length) * 100;

  return (
    <LoadingScreen
      title={`Preparing the ${roleLabel} portal`}
      subtitle={loadSteps.length > 0 ? "Connecting to the hospital services" : "Loading your workspace"}
      progress={progress}
      steps={loadSteps.map((step) => ({ label: SERVICE_LABELS[step.service], state: step.state }))}
    />
  );
}
