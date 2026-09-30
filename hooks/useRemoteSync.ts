"use client";

import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import type { HotTableRef } from "@handsontable/react-wrapper";

import type { SyncEvent, SyncRequestBody } from "@/lib/syncTypes";
import { forEachSyncEvent } from "@/lib/syncStream";
import { readRows, rowHasContent } from "@/lib/gridRows";
import type { EditableWorkLogRow } from "@/lib/timetable";
import { useToast } from "@/components/ToastProvider";

interface UseRemoteSyncOptions {
    /** Ref to the Handsontable wrapper, read at the time each sync starts. */
    hotRef: RefObject<HotTableRef | null>;
    /** Day the synced rows belong to. */
    date: string | null;
    /** Called once the sync is done, with the rows to persist locally. */
    onRowsChange: (rows: EditableWorkLogRow[]) => void;
}

interface UseRemoteSyncResult {
    remoteSyncing: boolean;
    sync: () => Promise<void>;
    /** Physical row indexes currently being synced, for the row header dots. */
    pendingRows: RefObject<Set<number>>;
}

/**
 * Pushes the day's rows to 7pace via POST /api/sync and applies the streamed
 * progress back to the grid: `synced`/`remoteId` flags are written through to
 * the source data, and the caller persists them.
 */
export function useRemoteSync({
    hotRef,
    date,
    onRowsChange,
}: UseRemoteSyncOptions): UseRemoteSyncResult {
    const { showToast } = useToast();
    const [remoteSyncing, setRemoteSyncing] = useState(false);
    const pendingRows = useRef<Set<number>>(new Set());

    const sync = useCallback(async () => {
        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        // Collect non-empty rows to create/update, and blank rows that were
        // previously synced to delete remotely.
        const nonEmptyRows: {
            physicalRow: number;
            data: EditableWorkLogRow;
        }[] = [];
        const deleteRows: { physicalRow: number; remoteId: string }[] = [];

        for (let i = 0; i < hot.countRows(); i++) {
            const physicalRow = hot.toPhysicalRow(i);
            const rowData = hot.getSourceDataAtRow(
                physicalRow,
            ) as EditableWorkLogRow | null;

            if (rowData && rowHasContent(rowData)) {
                nonEmptyRows.push({ physicalRow, data: rowData });
            } else if (rowData?.remoteId) {
                deleteRows.push({ physicalRow, remoteId: rowData.remoteId });
            }
        }

        if (nonEmptyRows.length === 0 && deleteRows.length === 0) {
            showToast({
                message: "Nothing to do.",
                severity: "info",
                duration: 2000,
            });
            return;
        }

        const total = nonEmptyRows.length + deleteRows.length;

        // Mark all affected rows as pending
        pendingRows.current = new Set([
            ...nonEmptyRows.map((r) => r.physicalRow),
            ...deleteRows.map((r) => r.physicalRow),
        ]);
        hot.render();

        setRemoteSyncing(true);

        // getSourceDataAtRow returns a clone, so writes have to go through
        // setSourceDataAtCell to mutate the actual row data. Returns whether
        // the event reported success.
        const applyEvent = (event: SyncEvent, physicalRow: number): boolean => {
            if (event.kind === "delete") {
                if (event.status === "deleted") {
                    hot.setSourceDataAtCell(physicalRow, "remoteId", undefined);
                    hot.setSourceDataAtCell(physicalRow, "synced", false);
                    return true;
                }
                return false;
            }

            if (event.status === "synced") {
                hot.setSourceDataAtCell(physicalRow, "synced", true);
                if (event.remoteId) {
                    hot.setSourceDataAtCell(
                        physicalRow,
                        "remoteId",
                        event.remoteId,
                    );
                }
                return true;
            }

            return false;
        };

        /** Resolves an event's index to its physical row, or null to skip. */
        const resolveRow = (event: SyncEvent): number | null => {
            const rows = event.kind === "delete" ? deleteRows : nonEmptyRows;

            // A negative index is a failure that aborted the whole stream.
            if (event.index < 0 || event.index >= rows.length) return null;

            return rows[event.index].physicalRow;
        };

        try {
            const res = await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    logs: nonEmptyRows.map((r) => r.data),
                    deletes: deleteRows.map((r) => r.remoteId),
                    date,
                } satisfies SyncRequestBody),
            });

            if (!res.ok || !res.body) {
                showToast({ message: "Sync failed", severity: "error" });
                pendingRows.current.clear();
                hot.render();
                return;
            }

            let doneCount = 0;
            let errorCount = 0;

            await forEachSyncEvent(res.body, (event) => {
                const physicalRow = resolveRow(event);
                if (physicalRow === null) return;

                if (applyEvent(event, physicalRow)) {
                    doneCount++;
                } else {
                    errorCount++;
                }

                pendingRows.current.delete(physicalRow);

                // Re-render to update dot colors
                hot.render();

                showToast({
                    message: `Synced ${doneCount} of ${total}...`,
                    severity: "info",
                    duration: 60000,
                });
            });

            // Persist updated synced/remoteId to IndexedDB
            onRowsChange(readRows(hot));

            // Final toast
            if (errorCount > 0) {
                showToast({
                    message: `Synced ${doneCount} of ${total} (${errorCount} failed)`,
                    severity: "warning",
                });
            } else {
                showToast({
                    message: `Synced ${doneCount} of ${total}`,
                    severity: "success",
                });
            }
        } catch {
            showToast({ message: "Sync failed", severity: "error" });
        } finally {
            pendingRows.current.clear();
            hotRef.current?.hotInstance?.render();
            setRemoteSyncing(false);
        }
    }, [hotRef, date, onRowsChange, showToast]);

    return { remoteSyncing, sync, pendingRows };
}
