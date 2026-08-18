"use client";

import {
    CopyPaste,
    HiddenColumns,
    ManualColumnResize,
    ManualRowMove,
    registerPlugin,
    StretchColumns,
    UndoRedo,
} from "handsontable/plugins";

import {
    AutocompleteCellType,
    registerCellType,
    TextCellType,
} from "handsontable/cellTypes";
import { HotTable, HotTableRef } from "@handsontable/react-wrapper";

import { useEffect, useRef, useState } from "react";
import { AutocompleteEditor, registerEditor } from "handsontable/editors";
import { autocompleteRenderer, registerRenderer } from "handsontable/renderers";
import {
    autocompleteValidator,
    registerValidator,
} from "handsontable/validators";
import { CellChange, ChangeSource, ThemeColorScheme } from "handsontable";
import Handsontable from "handsontable";
import { mainTheme, registerTheme } from 'handsontable/themes';

import { calculateTotal } from "@/lib/time";
import { useDayRows } from "@/hooks/useDayRows";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import { MIN_ROWS } from "@/lib/timetable";
import DOMPurify from "dompurify";
import { Button, Typography, Box, useColorScheme } from "@mui/material";
import Shortcut from "./Shortcut";
import { useToast } from "./ToastProvider";
import { authClient } from "@/lib/auth-client";
import type { GridRow } from "@/hooks/useDayRows";

registerCellType(TextCellType);
registerCellType(AutocompleteCellType);

registerEditor(AutocompleteEditor);
registerRenderer(autocompleteRenderer);
registerValidator(autocompleteValidator);

registerPlugin(CopyPaste);
registerPlugin(HiddenColumns);
registerPlugin(ManualColumnResize);
registerPlugin(ManualRowMove);
registerPlugin(StretchColumns);
registerPlugin(UndoRedo);

const theme = registerTheme(mainTheme)
    .setColorScheme('auto');

const SHORTCUTS = [
    { keys: ["Alt", "Enter"], label: "Open work item" },
    { keys: ["Ctrl", "Enter"], label: "Add row" },
    { keys: ["Shift", "⌫"], label: "Delete row" },
];

const WORK_ITEM_COLUMN_INDEX = 0;
const TIME_SPENT_COLUMN_INDEX = 1;
const COLUMN_TITLES = ["Work Item", "Time Spent", "Description", "Notes"];

interface SyncEvent {
    kind: "sync" | "delete";
    index: number;
    status: "synced" | "deleted" | "error";
    remoteId?: string;
    error?: string;
}

interface GridProps {
    date: string | null;
    autocompleteSource?: string[];
}

export default function Grid({ date, autocompleteSource = [] }: GridProps) {
    const hotRef = useRef<HotTableRef>(null);
    const [timeSpent, setTimeSpent] = useState<string>("00h00m");
    const registeredHotRef = useRef<Handsontable | null>(null);
    const isLoadingDataRef = useRef<boolean>(false);
    const { showToast } = useToast();
    const { data: session } = authClient.useSession();
    const [syncing, setSyncing] = useState(false);
    const { mode, systemMode } = useColorScheme();
    const pendingSyncRowsRef = useRef<Set<number>>(new Set());
    const [showNotes, setShowNotes] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const storedShowNotes = localStorage.getItem("showNotes");
        if (storedShowNotes !== null) {
            setShowNotes(storedShowNotes === "true");
        }
    }, []);

    useEffect(() => {
        if (isMounted) {
            localStorage.setItem("showNotes", showNotes.toString());
        }
    }, [showNotes, isMounted]);

    useEffect(() => {
        const activeMode = mode === "system" ? systemMode : mode;
        const colorScheme: ThemeColorScheme = activeMode === "dark" ? "dark" : activeMode === "light" ? "light" : "auto";
        theme.setColorScheme(colorScheme);
    }, [mode, systemMode]);

    const { initialRows, status, notifyChange } = useDayRows(date);

    const updateTotal = () => {
        const hot = hotRef.current?.hotInstance;
        if (!hot) return;
        const total = calculateTotal(
            hot.getDataAtCol(TIME_SPENT_COLUMN_INDEX) as string[],
        );
        setTimeSpent(total);
    };

    const copyAsCsv = () => {
        const hot = hotRef.current?.hotInstance;
        const data = hot?.getData();
        const filteredData =
            data?.filter((row) =>
                row.some(
                    (cell) =>
                        cell !== null && cell !== undefined && cell !== "",
                ),
            ) ?? [];

        const csvData = [COLUMN_TITLES, ...filteredData];

        const stringForExport = csvData
            .map((row) => row.join(","))
            .join("\r\n");
        if (stringForExport) {
            navigator.clipboard
                .writeText(stringForExport)
                .then(() => {
                    showToast({ message: "Copied CSV to clipboard" });
                })
                .catch((err) => {
                    console.error("Failed to copy text: ", err);
                });
        }
    };

    const handleSync = async () => {
        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        // Collect non-empty rows to create/update, and blank rows that were
        // previously synced to delete remotely.
        const nonEmptyRows: { physicalRow: number; data: GridRow }[] = [];
        const deleteRows: { physicalRow: number; remoteId: string }[] = [];
        const count = hot.countRows();
        for (let i = 0; i < count; i++) {
            const physicalRow = hot.toPhysicalRow(i);
            const rowData = hot.getSourceDataAtRow(physicalRow) as GridRow | null;
            if (rowData?.workItem || rowData?.timeSpent || rowData?.description) {
                nonEmptyRows.push({ physicalRow, data: rowData });
            } else if (rowData?.remoteId) {
                deleteRows.push({ physicalRow, remoteId: rowData.remoteId });
            }
        }

        if (nonEmptyRows.length === 0 && deleteRows.length === 0) {
            showToast({ message: "Nothing to do.", severity: "info", duration: 2000 });
            return;
        }

        const total = nonEmptyRows.length + deleteRows.length;

        // Mark all affected rows as pending
        pendingSyncRowsRef.current = new Set([
            ...nonEmptyRows.map(r => r.physicalRow),
            ...deleteRows.map(r => r.physicalRow),
        ]);
        hot.render();

        setSyncing(true);

        try {
            const res = await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    logs: nonEmptyRows.map(r => {
                        const { notes, ...rest } = r.data;
                        return rest;
                    }),
                    deletes: deleteRows.map(r => r.remoteId),
                    date,
                }),
            });

            if (!res.ok || !res.body) {
                showToast({ message: "Sync failed", severity: "error" });
                pendingSyncRowsRef.current.clear();
                hot.render();
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let doneCount = 0;
            let errorCount = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;

                    let event: SyncEvent;
                    try {
                        event = JSON.parse(line.slice(6));
                    } catch {
                        continue;
                    }

                    let physicalRow: number;

                    if (event.kind === "delete") {
                        // Skip global errors (index -1)
                        if (event.index < 0 || event.index >= deleteRows.length) continue;
                        physicalRow = deleteRows[event.index].physicalRow;

                        if (event.status === "deleted") {
                            // getSourceDataAtRow returns a clone, so write through
                            // setSourceDataAtCell to mutate the actual row data.
                            hot.setSourceDataAtCell(physicalRow, "remoteId", undefined);
                            hot.setSourceDataAtCell(physicalRow, "synced", false);
                            doneCount++;
                        } else {
                            errorCount++;
                        }
                    } else {
                        // Skip global errors (index -1)
                        if (event.index < 0 || event.index >= nonEmptyRows.length) continue;
                        physicalRow = nonEmptyRows[event.index].physicalRow;

                        if (event.status === "synced") {
                            hot.setSourceDataAtCell(physicalRow, "synced", true);
                            if (event.remoteId) {
                                hot.setSourceDataAtCell(physicalRow, "remoteId", event.remoteId);
                            }
                            doneCount++;
                        } else {
                            errorCount++;
                        }
                    }

                    pendingSyncRowsRef.current.delete(physicalRow);

                    // Re-render to update dot colors
                    hot.render();

                    showToast({
                        message: `Synced ${doneCount} of ${total}...`,
                        severity: "info",
                        duration: 60000,
                    });
                }
            }

            // Persist updated synced/remoteId to IndexedDB
            const rows: GridRow[] = [];
            for (let i = 0; i < hot.countRows(); i++) {
                const physicalIndex = hot.toPhysicalRow(i);
                const rowData = hot.getSourceDataAtRow(physicalIndex) as GridRow | null;
                if (rowData) {
                    rows.push(rowData);
                }
            }
            notifyChange(rows);

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
            pendingSyncRowsRef.current.clear();
            hotRef.current?.hotInstance?.render();
            setSyncing(false);
        }
    };

    // Load from IndexedDB when initialRows changes (date load complete)
    useEffect(() => {
        if (!initialRows) return;
        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        isLoadingDataRef.current = true;
        hot.loadData(initialRows);
        isLoadingDataRef.current = false;
        updateTotal();
    }, [initialRows]);

    const onGridChanged = () => {
        if (isLoadingDataRef.current) return;

        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        updateTotal();

        // Extract rows from Handsontable
        const count = hot.countRows();
        const rows: GridRow[] = [];
        for (let i = 0; i < count; i++) {
            const physicalIndex = hot.toPhysicalRow(i);
            const rowData = hot.getSourceDataAtRow(
                physicalIndex,
            ) as GridRow | null;
            if (rowData) {
                rows.push(rowData);
            }
        }

        notifyChange(rows);
    };

    // Setup shortcuts once hotInstance is available
    useEffect(() => {
        const hot = hotRef.current?.hotInstance;
        if (!hot || registeredHotRef.current === hot) return;

        const shortcutManager = hot.getShortcutManager();
        const gridContext = shortcutManager.getContext("grid")!;

        gridContext.addShortcuts([
            {
                keys: [["Alt", "Enter"]],
                group: "customActions",
                callback: (event) => {
                    event.preventDefault();

                    const selected = hot.getSelected();
                    if (!selected) return;

                    const [row] = selected[0];
                    const key = hot.getDataAtCell(row, WORK_ITEM_COLUMN_INDEX);
                    if (!key) return;

                    window.open(`/api/redirect-work-item?key=${encodeURIComponent(String(key))}`, "_blank", "noopener,noreferrer");
                },
            },
            {
                keys: [["Control", "Enter"]],
                group: "customActions",
                callback: (event) => {
                    event.preventDefault();
                    const newRowIndex = hot.countRows();
                    hot.alter("insert_row_below", newRowIndex - 1, 1);
                    hot.selectCell(newRowIndex, 0);
                },
            },
            {
                keys: [["Shift", "Backspace"]],
                group: "customActions",
                callback: (event) => {
                    event.preventDefault();

                    const selected = hot.getSelectedRangeLast();
                    if (!selected) return;

                    const rowIndex = selected.from.row ?? 0;
                    if (rowIndex > 0) hot.alter("remove_row", rowIndex, 1);

                    const newRowCount = hot.countRows();
                    const nextRow = Math.min(rowIndex, newRowCount - 1);

                    if (nextRow >= 0) {
                        hot.selectCell(nextRow, 0);
                    }
                },
            },
        ]);
        registeredHotRef.current = hot;
    });

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between py-2">
                <Typography variant="subtitle2" sx={{ display: "flex", alignItems: "center", color: "text.primary" }}>
                    Total:&nbsp;
                    <Box component="span" sx={{ color: "primary.main" }}>
                        {timeSpent}
                    </Box>
                </Typography>

                <div className="flex gap-2">
                    <Button variant="outlined" size="small" onClick={() => setShowNotes(!showNotes)}>
                        {showNotes ? "Hide Notes" : "Show Notes"}
                    </Button>
                    {session && (
                        <Button variant="outlined" size="small" onClick={handleSync} disabled={syncing}>
                            {syncing ? "Syncing..." : "Sync"}
                        </Button>
                    )}
                    <Button variant="outlined" size="small" onClick={copyAsCsv}>
                        Copy as CSV
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <HotTable
                    theme={theme}
                    ref={hotRef}
                    width="100%"
                    height="auto"
                    autoWrapRow={true}
                    autoWrapCol={true}
                    startRows={MIN_ROWS}
                    sanitizer={(html: string) => DOMPurify.sanitize(html)}
                    colHeaders={COLUMN_TITLES}
                    colWidths={[160, 120, null, 200]}
                    columns={[
                        {
                            data: "workItem",
                            type: "autocomplete",
                            source: autocompleteSource,
                            strict: false,
                        },
                        { data: "timeSpent", type: "text" },
                        { data: "description", type: "text" },
                        { data: "notes", type: "text" },
                    ]}
                    hiddenColumns={{
                        columns: showNotes ? [] : [3],
                        indicators: true,
                    }}
                    stretchH="all"
                    rowHeaders={(row: number) => {
                        const hot = hotRef.current?.hotInstance;
                        let dotColor = '';

                        if (hot) {
                            const physicalRow = hot.toPhysicalRow(row);
                            const rowData = hot.getSourceDataAtRow(physicalRow) as GridRow;
                            const hasContent = rowData?.workItem || rowData?.timeSpent || rowData?.description;

                            if (hasContent) {
                                if (pendingSyncRowsRef.current.has(physicalRow)) {
                                    dotColor = 'bg-yellow-700';
                                } else if (rowData?.synced) {
                                    dotColor = 'bg-green-700';
                                } else if (rowData?.remoteId) {
                                    // Previously synced, edited since - next sync will update it.
                                    dotColor = 'bg-yellow-700';
                                }
                            }
                        }

                        const dotHtml = dotColor
                            ? `<div class="absolute top-1 right-1 rounded-full w-1 h-1 ${dotColor}"></div>`
                            : "";

                        return `${row + 1}${dotHtml}`;
                    }}
                    manualColumnResize={true}
                    manualRowMove={true}
                    imeFastEdit={true}
                    enterMoves={{ row: 0, col: 1 }}
                    afterChange={(
                        changes: CellChange[] | null,
                        source: ChangeSource,
                    ) => {
                        if (!changes || source === "loadData") {
                            return;
                        }

                        const hot = hotRef.current?.hotInstance;
                        if (hot) {
                            for (const [row, prop, oldValue, newValue] of changes) {
                                if (
                                    (prop === "workItem" || prop === "timeSpent" || prop === "description") &&
                                    oldValue !== newValue
                                ) {
                                    const physicalRow = hot.toPhysicalRow(row as number);
                                    const rowData = hot.getSourceDataAtRow(physicalRow) as GridRow | null;
                                    if (rowData?.synced) {
                                        hot.setSourceDataAtCell(physicalRow, "synced", false);
                                    }
                                }
                            }
                        }

                        onGridChanged();
                    }}
                    afterRemoveRow={onGridChanged}
                    afterCreateRow={onGridChanged}
                    afterRowMove={onGridChanged}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>
            <div className="flex justify-between mt-4 px-2 select-none">
                <SyncStatusBadge status={status} />

                <div className="flex gap-4">
                    {SHORTCUTS.map((shortcut) => (
                        <Shortcut
                            key={shortcut.label}
                            keys={shortcut.keys}
                            label={shortcut.label}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
