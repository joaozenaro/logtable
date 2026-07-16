"use client";

import { TimeEntry } from "@/types";
import { useEffect, useRef, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { getEntriesForDate, saveEntriesForDate } from "@/lib/db";

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

function calculateTotal(entries: TimeEntry[]): string {
  const totalMinutes = entries.reduce(
    (acc, entry) => acc + parseTimeToMinutes(entry.timeSpent),
    0,
  );
  return formatMinutes(totalMinutes);
}

export default function useTimeEntries() {
  const [selectedDate, setSelectedDateState] = useState<Dayjs>(() => dayjs());
  const [entries, setEntriesState] = useState<TimeEntry[]>([]);
  const [totalTime, setTotalTime] = useState<string>("0h 0m");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isDirtyRef = useRef(false);
  const selectedDateRef = useRef(selectedDate);

  // Sync selectedDate ref for immediate save on date change
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // Load entries when selectedDate changes
  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      const dateStr = selectedDate.format("YYYY-MM-DD");
      try {
        const stored = await getEntriesForDate(dateStr);
        if (!active) return;

        if (stored && stored.length > 0) {
          setEntriesState(stored);
          setTotalTime(calculateTotal(stored));
        } else {
          // Default entry for a new day
          const defaults = [
            { workItem: "", timeSpent: "0h0m", description: "" },
          ];
          setEntriesState(defaults);
          setTotalTime(calculateTotal(defaults));
        }
        // Mark as clean since we just loaded it from the database
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Failed to load entries from IndexedDB:", err);
        if (active) {
          const defaults = [
            { workItem: "", timeSpent: "0h0m", description: "" },
          ];
          setEntriesState(defaults);
          setTotalTime(calculateTotal(defaults));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [selectedDate]);

  // Save entries to IndexedDB (debounced)
  useEffect(() => {
    if (!isDirtyRef.current || isLoading) return;

    const timer = setTimeout(async () => {
      const dateStr = selectedDate.format("YYYY-MM-DD");
      try {
        await saveEntriesForDate(dateStr, entries);
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Failed to save entries to IndexedDB:", err);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [entries, selectedDate, isLoading]);

  // Change date (saves current day immediately if dirty)
  const changeDate = async (newDate: Dayjs | null) => {
    if (!newDate) return;
    if (isDirtyRef.current) {
      const dateStr = selectedDateRef.current.format("YYYY-MM-DD");
      try {
        // Save immediately before switching
        await saveEntriesForDate(dateStr, entries);
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Failed to save entries before changing date:", err);
      }
    }
    setSelectedDateState(newDate);
  };

  // State update wrapper that optionally recalculates total time
  const updateEntries = (
    newEntries: TimeEntry[] | ((prev: TimeEntry[]) => TimeEntry[]),
    timeSpentChanged: boolean = true,
  ) => {
    setEntriesState((prev) => {
      const resolved =
        typeof newEntries === "function" ? newEntries(prev) : newEntries;

      // Mark as dirty so it will be saved to IndexedDB
      isDirtyRef.current = true;

      // Recalculate totalTime only if timeSpentChanged is true
      if (timeSpentChanged) {
        setTotalTime(calculateTotal(resolved));
      }

      return resolved;
    });
  };

  return {
    entries,
    updateEntries,
    totalTime,
    selectedDate,
    setSelectedDate: changeDate,
    isLoading,
  };
}
