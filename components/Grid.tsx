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
    CheckboxCellType,
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
import { toCsv } from "@/lib/csv";
import { handsontableTheme } from "@/lib/handsontableTheme";
import {
    GRID_SHORTCUT_HINTS,
    registerGridShortcuts,
} from "@/lib/gridShortcuts";
import {
    buildColumns,
    COLUMN_TITLES,
    COLUMN_WIDTHS,
    NOTES_COLUMN_INDEX,
    TIME_SPENT_COLUMN_INDEX,
} from "@/lib/gridColumns";
import {
    markEditedRowsUnsynced,
    readRows,
    renderRowHeader,
} from "@/lib/gridRows";
import {
    MIN_ROWS,
    rowHasContent,
    type EditableWorkLogRow,
} from "@/lib/dayRows";
import { useDayRows } from "@/hooks/useDayRows";
import { useRemoteSync } from "@/hooks/useRemoteSync";
import { useLocalStorageFlag } from "@/hooks/useLocalStorageFlag";
import LocalSaveBadge from "@/components/LocalSaveBadge";
import Shortcut from "./Shortcut";
import { useToast } from "./ToastProvider";
import { authClient } from "@/lib/auth-client";
import DOMPurify from "dompurify";
import { Button, Typography, Box, useColorScheme } from "@mui/material";
import dayjs from "dayjs";

registerCellType(TextCellType);
registerCellType(AutocompleteCellType);
registerCellType(CheckboxCellType);

registerEditor(AutocompleteEditor);
registerRenderer(autocompleteRenderer);
registerValidator(autocompleteValidator);

registerPlugin(CopyPaste);
registerPlugin(HiddenColumns);
registerPlugin(ManualColumnResize);
registerPlugin(ManualRowMove);
registerPlugin(StretchColumns);
registerPlugin(UndoRedo);

const NOTES_VISIBLE_KEY = "logtable:notesVisible";

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
    const { mode, systemMode } = useColorScheme();
    const [notesVisible, setNotesVisible] =
        useLocalStorageFlag(NOTES_VISIBLE_KEY);

    const { loadedRows, saveStatus, onRowsChange } = useDayRows(date);
    const { remoteSyncing, sync, pendingRows } = useRemoteSync({
        hotRef,
        date,
        onRowsChange,
    });

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
        const stringForExport = toCsv(COLUMN_TITLES, hot?.getData() ?? []);

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

    // Load from IndexedDB when loadedRows changes (date load complete)
    useEffect(() => {
        if (!loadedRows) return;
        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        isLoadingDataRef.current = true;
        hot.loadData(loadedRows);
        isLoadingDataRef.current = false;
        updateTotal();
    }, [loadedRows]);

    const onGridChanged = () => {
        if (isLoadingDataRef.current) return;

        const hot = hotRef.current?.hotInstance;
        if (!hot) return;

        updateTotal();
        onRowsChange(readRows(hot));
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
                        gap: 1.5,
                        color: "text.primary",
                    }}
                >
                    {date && (
                        <>
                            <span>{dayjs(date).format("ddd, MMM D")}</span>
                            <Box
                                component="span"
                                aria-hidden
                                sx={{
                                    color: "text.disabled",
                                    fontSize: "1.25rem",
                                    lineHeight: 1,
                                }}
                            >
                                •
                            </Box>
                        </>
                    )}
                    <span>Total:</span>
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
                            onClick={sync}
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
                    colWidths={COLUMN_WIDTHS}
                    columns={buildColumns(autocompleteSource)}
                    hiddenColumns={{
                        columns: notesVisible ? [] : [NOTES_COLUMN_INDEX],
                        indicators: true,
                        copyPasteEnabled: false,
                    }}
                    manualColumnResize={true}
                    stretchH="last"
                    rowHeaders={(row: number) => {
                        const hot = hotRef.current?.hotInstance;
                        const physicalRow = hot ? hot.toPhysicalRow(row) : row;
                        const rowData = hot?.getSourceDataAtRow(physicalRow) as
                            EditableWorkLogRow | undefined;

                        return renderRowHeader(row + 1, {
                            hasContent: rowHasContent(rowData),
                            isPending: pendingRows.current.has(physicalRow),
                            isSynced: Boolean(rowData?.synced),
                            hasRemoteId: Boolean(rowData?.remoteId),
                        });
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
                            markEditedRowsUnsynced(hot, changes);
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
