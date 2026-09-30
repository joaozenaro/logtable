"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "@/lib/db";
import {
    EditableWorkLogRow,
    trimTrailingBlankRows,
    padToMinRows,
    withOrder,
    MIN_ROWS,
} from "@/lib/dayRows";

/** Status of saving the day's rows to the local IndexedDB database. */
export type SaveStatus = "saved" | "saving" | "error";

export function useDayRows(date: string | null) {
    const [loadedRows, setInitialRows] = useState<EditableWorkLogRow[] | null>(
        null,
    );
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

    const dateRef = useRef<string | null>(null);
    const loadedDateRef = useRef<string | null>(null);
    const generationRef = useRef<number>(0);
    const lastKnownRowsRef = useRef<EditableWorkLogRow[]>([]);
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
    const save = useCallback(
        async (rows: EditableWorkLogRow[], targetDate: string) => {
            const trimmed = trimTrailingBlankRows(rows);
            const withOrderRows = withOrder(trimmed, targetDate);

            await db.transaction("rw", db.rows, async () => {
                await db.rows.where("date").equals(targetDate).delete();
                await db.rows.bulkAdd(withOrderRows);
            });
        },
        [],
    );

    // Private helper to run a save and manage status/active promise
    const runSave = useCallback(
        async (
            rows: EditableWorkLogRow[],
            targetDate: string,
            targetGen: number,
        ) => {
            const savePromise = (async () => {
                try {
                    await save(rows, targetDate);
                    if (
                        isMountedRef.current &&
                        targetGen === generationRef.current
                    ) {
                        setSaveStatus("saved");
                    }
                } catch (err) {
                    console.error(err);
                    if (
                        isMountedRef.current &&
                        targetGen === generationRef.current
                    ) {
                        setSaveStatus("error");
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
        (rows: EditableWorkLogRow[]) => {
            const targetDate = dateRef.current;
            if (!targetDate) return;

            const targetGen = generationRef.current;
            setSaveStatus("saving");

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

    // Report that the grid's rows changed, scheduling a debounced save.
    const onRowsChange = useCallback(
        (rows: EditableWorkLogRow[]) => {
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

            setSaveStatus("saving");

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
                setSaveStatus("saved");
            } catch (err) {
                console.error(err);
                if (
                    isMountedRef.current &&
                    currentGen === generationRef.current
                ) {
                    setSaveStatus("error");
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
        loadedRows,
        saveStatus,
        onRowsChange,
    };
}
