"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/db";
import type { TimeRow } from "@/lib/db";
import {
    trimTrailingBlankRows,
    padToMinRows,
    withOrder,
    MIN_ROWS,
} from "@/lib/timetable";

export type SyncStatus = "synced" | "syncing" | "error";

export type GridRow = Omit<TimeRow, "id" | "order" | "date"> &
    Partial<Pick<TimeRow, "id" | "order" | "date">>;

export function useDayRows(date: string | null) {
    const [initialRows, setInitialRows] = useState<GridRow[] | null>(null);
    const [status, setStatus] = useState<SyncStatus>("synced");

    const dateRef = useRef<string | null>(null);
    const loadedDateRef = useRef<string | null>(null);
    const generationRef = useRef<number>(0);
    const lastKnownRowsRef = useRef<GridRow[]>([]);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
        undefined,
    );
    const activeSavePromiseRef = useRef<Promise<void> | null>(null);
    const isMountedRef = useRef<boolean>(true);

    // Track mounted status to avoid setting state after unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Core save function - the ONLY place that touches db.rows
    const save = useCallback(async (rows: GridRow[], targetDate: string) => {
        const trimmed = trimTrailingBlankRows(rows);
        const withOrderRows = withOrder(trimmed, targetDate);

        await db.transaction("rw", db.rows, async () => {
            await db.rows.where("date").equals(targetDate).delete();
            await db.rows.bulkAdd(withOrderRows);
        });
    }, []);

    // Private helper to run a save and manage status/active promise
    const runSave = useCallback(
        async (rows: GridRow[], targetDate: string, targetGen: number) => {
            const savePromise = (async () => {
                try {
                    await save(rows, targetDate);
                    if (
                        isMountedRef.current &&
                        targetGen === generationRef.current
                    ) {
                        setStatus("synced");
                    }
                } catch (err) {
                    console.error(err);
                    if (
                        isMountedRef.current &&
                        targetGen === generationRef.current
                    ) {
                        setStatus("error");
                    }
                }
            })();

            activeSavePromiseRef.current = savePromise;
            await savePromise;

            if (activeSavePromiseRef.current === savePromise) {
                activeSavePromiseRef.current = null;
            }
        },
        [save],
    );

    // Flush function to cancel pending timer and save immediately
    const flush = useCallback(async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = undefined;

            const targetDate = dateRef.current;
            const targetGen = generationRef.current;
            if (targetDate) {
                if (activeSavePromiseRef.current) {
                    await activeSavePromiseRef.current;
                }
                await runSave(lastKnownRowsRef.current, targetDate, targetGen);
            }
        } else if (activeSavePromiseRef.current) {
            // If no timer is pending but a save is already in progress, just await it
            await activeSavePromiseRef.current;
        }
    }, [runSave]);

    // Schedule save with debounce
    const scheduleSave = useCallback(
        (rows: GridRow[]) => {
            const targetDate = dateRef.current;
            if (!targetDate) return;

            const targetGen = generationRef.current;
            setStatus("syncing");

            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = setTimeout(() => {
                saveTimeoutRef.current = undefined;
                runSave(rows, targetDate, targetGen);
            }, 400);
        },
        [runSave],
    );

    // Notify hook that grid rows have changed
    const notifyChange = useCallback(
        (rows: GridRow[]) => {
            // Correctness check: only schedule saves if the data matches the currently loaded date in the grid
            if (!dateRef.current || dateRef.current !== loadedDateRef.current)
                return;
            lastKnownRowsRef.current = rows;
            scheduleSave(rows);
        },
        [scheduleSave],
    );

    // Keep flush ref fresh for use in useEffect cleanup
    const flushRef = useRef(flush);
    useEffect(() => {
        flushRef.current = flush;
    }, [flush]);

    // Handle date loading & cleanups (including flush on date change and unmount)
    useEffect(() => {
        if (!date) {
            // Flush any pending changes for the previous date before resetting
            flushRef.current();
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setInitialRows(null);
            dateRef.current = null;
            loadedDateRef.current = null;
            return;
        }

        const currentGen = ++generationRef.current;

        const load = async () => {
            // First flush any pending changes for the previous date
            await flushRef.current();

            // Check generation before continuing load
            if (currentGen !== generationRef.current) return;

            // Set current date ref
            dateRef.current = date;

            setStatus("syncing");

            try {
                const rows = await db.rows
                    .where("date")
                    .equals(date)
                    .sortBy("order");

                if (currentGen !== generationRef.current) return;

                const padded = padToMinRows(rows, MIN_ROWS);
                lastKnownRowsRef.current = padded;
                loadedDateRef.current = date; // Set loaded date right before updating state
                setInitialRows(padded);
                setStatus("synced");
            } catch (err) {
                console.error(err);
                if (
                    isMountedRef.current &&
                    currentGen === generationRef.current
                ) {
                    setStatus("error");
                }
            }
        };

        load();

        return () => {
            // Unmount/date change safety: flush pending save synchronously-attempted on teardown
            flushRef.current();
        };
    }, [date]);

    return {
        initialRows,
        status,
        notifyChange,
        flush,
    };
}
