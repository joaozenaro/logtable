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

import { calculateTotal } from "@/lib/time";
import { handsontableTheme } from "@/lib/handsontableTheme";
import type { SyncEvent } from "@/lib/syncTypes";
import {
    GRID_SHORTCUT_HINTS,
    registerGridShortcuts,
} from "@/lib/gridShortcuts";
import { useDayRows } from "@/hooks/useDayRows";
import LocalSaveBadge from "@/components/LocalSaveBadge";
import { MIN_ROWS, type EditableWorkLogRow } from "@/lib/timetable";
import DOMPurify from "dompurify";
import { Button, Typography, Box, useColorScheme } from "@mui/material";
import Shortcut from "./Shortcut";
import { useToast } from "./ToastProvider";
import { authClient } from "@/lib/auth-client";
import { useLocalStorageFlag } from "@/hooks/useLocalStorageFlag";

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

const TIME_SPENT_COLUMN_INDEX = 1;
const NOTES_COLUMN_INDEX = 2;
const COLUMN_TITLES = ["Work Item", "Time Spent", "Notes", "Description"];

const NOTES_VISIBLE_KEY = "logtable:notesVisible";

/**
 * Escapes a single CSV field per RFC 4180: fields containing a comma, a double
 * quote or a line break are wrapped in quotes, with inner quotes doubled.
 */
function escapeCsvField(value: unknown): string {
    const text = value === null || value === undefined ? "" : String(value);

    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
    const [remoteSyncing, setRemoteSyncing] = useState(false);
    const { mode, systemMode } = useColorScheme();
    const pendingSyncRowsRef = useRef<Set<number>>(new Set());
    const [notesVisible, setNotesVisible] =
        useLocalStorageFlag(NOTES_VISIBLE_KEY);

    const toggleNotes = () => {
        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        const plugin = hot.getPlugin("hiddenColumns");
        const next = !notesVisible;

        if (next) {
            plugin.showColumn(NOTES_COLUMN_INDEX);
        } else {
            plugin.hideColumn(NOTES_COLUMN_INDEX);
        }

        hot.render();
        setNotesVisible(next);
    };

    useEffect(() => {
        const activeMode = mode === "system" ? systemMode : mode;
        const colorScheme: ThemeColorScheme =
            activeMode === "dark"
                ? "dark"
                : activeMode === "light"
                  ? "light"
                  : "auto";
        handsontableTheme.setColorScheme(colorScheme);
    }, [mode, systemMode]);

    const { initialRows, saveStatus, notifyChange } = useDayRows(date);

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
            .map((row) => row.map(escapeCsvField).join(","))
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

    const handleRemoteSync = async () => {
        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        // Collect non-empty rows to create/update, and blank rows that were
        // previously synced to delete remotely.
        const nonEmptyRows: {
            physicalRow: number;
            data: EditableWorkLogRow;
        }[] = [];
        const deleteRows: { physicalRow: number; remoteId: string }[] = [];
        const count = hot.countRows();
        for (let i = 0; i < count; i++) {
            const physicalRow = hot.toPhysicalRow(i);
            const rowData = hot.getSourceDataAtRow(
                physicalRow,
            ) as EditableWorkLogRow | null;
            if (
                rowData?.workItem ||
                rowData?.timeSpent ||
                rowData?.description
            ) {
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
        pendingSyncRowsRef.current = new Set([
            ...nonEmptyRows.map((r) => r.physicalRow),
            ...deleteRows.map((r) => r.physicalRow),
        ]);
        hot.render();

        setRemoteSyncing(true);

        try {
            const res = await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    logs: nonEmptyRows.map((r) => r.data),
                    deletes: deleteRows.map((r) => r.remoteId),
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
                        if (event.index < 0 || event.index >= deleteRows.length)
                            continue;
                        physicalRow = deleteRows[event.index].physicalRow;

                        if (event.status === "deleted") {
                            // getSourceDataAtRow returns a clone, so write through
                            // setSourceDataAtCell to mutate the actual row data.
                            hot.setSourceDataAtCell(
                                physicalRow,
                                "remoteId",
                                undefined,
                            );
                            hot.setSourceDataAtCell(
                                physicalRow,
                                "synced",
                                false,
                            );
                            doneCount++;
                        } else {
                            errorCount++;
                        }
                    } else {
                        // Skip global errors (index -1)
                        if (
                            event.index < 0 ||
                            event.index >= nonEmptyRows.length
                        )
                            continue;
                        physicalRow = nonEmptyRows[event.index].physicalRow;

                        if (event.status === "synced") {
                            hot.setSourceDataAtCell(
                                physicalRow,
                                "synced",
                                true,
                            );
                            if (event.remoteId) {
                                hot.setSourceDataAtCell(
                                    physicalRow,
                                    "remoteId",
                                    event.remoteId,
                                );
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
            const rows: EditableWorkLogRow[] = [];
            for (let i = 0; i < hot.countRows(); i++) {
                const physicalIndex = hot.toPhysicalRow(i);
                const rowData = hot.getSourceDataAtRow(
                    physicalIndex,
                ) as EditableWorkLogRow | null;
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
            setRemoteSyncing(false);
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
        const rows: EditableWorkLogRow[] = [];
        for (let i = 0; i < count; i++) {
            const physicalIndex = hot.toPhysicalRow(i);
            const rowData = hot.getSourceDataAtRow(
                physicalIndex,
            ) as EditableWorkLogRow | null;
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

        registerGridShortcuts(hot);
        registeredHotRef.current = hot;
    });

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between py-2">
                <Typography
                    variant="subtitle2"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "text.primary",
                    }}
                >
                    Total:&nbsp;
                    <Box component="span" sx={{ color: "primary.main" }}>
                        {timeSpent}
                    </Box>
                </Typography>

                <div className="flex gap-2">
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={toggleNotes}
                    >
                        {notesVisible ? "Hide notes" : "Show notes"}
                    </Button>
                    {session && (
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={handleRemoteSync}
                            disabled={remoteSyncing}
                        >
                            {remoteSyncing ? "Syncing..." : "Sync"}
                        </Button>
                    )}
                    <Button variant="outlined" size="small" onClick={copyAsCsv}>
                        Copy as CSV
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <HotTable
                    theme={handsontableTheme}
                    ref={hotRef}
                    width="100%"
                    height="auto"
                    autoWrapRow={true}
                    autoWrapCol={true}
                    startRows={MIN_ROWS}
                    sanitizer={(html: string) => DOMPurify.sanitize(html)}
                    colHeaders={COLUMN_TITLES}
                    colWidths={[160, 120, 200, null]}
                    columns={[
                        {
                            data: "workItem",
                            type: "autocomplete",
                            source: autocompleteSource,
                            strict: false,
                        },
                        { data: "timeSpent", type: "text" },
                        { data: "notes", type: "text" },
                        { data: "description", type: "text" },
                    ]}
                    hiddenColumns={{
                        columns: notesVisible ? [] : [NOTES_COLUMN_INDEX],
                        indicators: true,
                        copyPasteEnabled: false,
                    }}
                    manualColumnResize={true}
                    stretchH="last"
                    rowHeaders={(row: number) => {
                        const hot = hotRef.current?.hotInstance;
                        let dotColor = "";

                        if (hot) {
                            const physicalRow = hot.toPhysicalRow(row);
                            const rowData = hot.getSourceDataAtRow(
                                physicalRow,
                            ) as EditableWorkLogRow;
                            const hasContent =
                                rowData?.workItem ||
                                rowData?.timeSpent ||
                                rowData?.description;

                            if (hasContent) {
                                if (
                                    pendingSyncRowsRef.current.has(physicalRow)
                                ) {
                                    dotColor = "bg-yellow-700";
                                } else if (rowData?.synced) {
                                    dotColor = "bg-green-700";
                                } else if (rowData?.remoteId) {
                                    // Previously synced, edited since - next sync will update it.
                                    dotColor = "bg-yellow-700";
                                }
                            }
                        }

                        const dotHtml = dotColor
                            ? `<div class="absolute top-1 right-1 rounded-full w-1 h-1 ${dotColor}"></div>`
                            : "";

                        return `${row + 1}${dotHtml}`;
                    }}
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
                            for (const [
                                row,
                                prop,
                                oldValue,
                                newValue,
                            ] of changes) {
                                if (
                                    (prop === "workItem" ||
                                        prop === "timeSpent" ||
                                        prop === "description") &&
                                    oldValue !== newValue
                                ) {
                                    const physicalRow = hot.toPhysicalRow(
                                        row as number,
                                    );
                                    const rowData = hot.getSourceDataAtRow(
                                        physicalRow,
                                    ) as EditableWorkLogRow | null;
                                    if (rowData?.synced) {
                                        hot.setSourceDataAtCell(
                                            physicalRow,
                                            "synced",
                                            false,
                                        );
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
                <LocalSaveBadge status={saveStatus} />

                <div className="flex gap-4">
                    {GRID_SHORTCUT_HINTS.map((shortcut) => (
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
