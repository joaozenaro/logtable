"use client";

import { TimeEntry } from "@/types";
import { useMemo, useState } from "react";

function parseTimeToMinutes(timeSpent: string): number {
  if (!timeSpent) return 0;

  const match = timeSpent.match(/^(?:(?<hours>\d+)h)?(?:(?<minutes>\d+)m)?$/);
  if (!match?.groups) return 0;
  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes ?? 0);
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export default function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([
    { workItem: "XX", timeSpent: "0h0m", description: "description" },
  ]);

  const totalTime = useMemo(() => {
    const totalMinutes = entries.reduce(
      (acc, entry) => acc + parseTimeToMinutes(entry.timeSpent),
      0,
    );

    return formatMinutes(totalMinutes);
  }, [entries]);

  return {
    entries,
    setEntries,
    totalTime,
  };
}
