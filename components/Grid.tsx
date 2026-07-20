"use client";

import {
    CopyPaste,
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

import "handsontable/styles/handsontable.min.css";
import "handsontable/styles/ht-theme-main.min.css";
import { useEffect, useRef, useState } from "react";
import { AutocompleteEditor, registerEditor } from "handsontable/editors";
import { autocompleteRenderer, registerRenderer } from "handsontable/renderers";
import {
    autocompleteValidator,
    registerValidator,
} from "handsontable/validators";
import { CellChange, ChangeSource } from "handsontable";
import Handsontable from "handsontable";
import { calculateTotal } from "@/lib/time";
import { useDayRows, GridRow } from "@/hooks/useDayRows";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import { MIN_ROWS } from "@/lib/timetable";
import DOMPurify from "dompurify";
import Button from "@mui/material/Button";
import Shortcut from "./Shortcut";
import { useToast } from "./ToastProvider";

registerCellType(TextCellType);
registerCellType(AutocompleteCellType);

registerEditor(AutocompleteEditor);
registerRenderer(autocompleteRenderer);
registerValidator(autocompleteValidator);

registerPlugin(CopyPaste);
registerPlugin(ManualRowMove);
registerPlugin(StretchColumns);
registerPlugin(UndoRedo);

const SHORTCUTS = [
    { keys: ["Alt", "Enter"], label: "Open work item" },
    { keys: ["Ctrl", "Enter"], label: "Add row" },
    { keys: ["Shift", "⌫"], label: "Delete row" },
];

const WORK_ITEM_COLUMN_INDEX = 0;
const TIME_SPENT_COLUMN_INDEX = 1;
const COLUMN_TITLES = ["Work Item", "Time Spent", "Description"];

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

                    const workItemUrl = process.env.WORK_ITEM_URL;
                    if (workItemUrl) {
                        const targetUrl = workItemUrl.replace(
                            "{key}",
                            encodeURIComponent(String(key)),
                        );
                        window.open(targetUrl, "_blank", "noopener,noreferrer");
                    }
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
        <div className="h-full flex flex-col p-4">
            <div className="flex justify-between py-2">
                <span className="flex items-center justify-end text-sm font-medium text-neutral-600 dark:text-neutral-300">
                    Total: {timeSpent}
                </span>

                <Button variant="outlined" size="small" onClick={copyAsCsv}>
                    Copy as CSV
                </Button>
            </div>

            <div className="flex-1">
                <HotTable
                    className="ht-theme-main-dark-auto"
                    ref={hotRef}
                    width="100%"
                    height="auto"
                    autoWrapRow={true}
                    autoWrapCol={true}
                    startRows={MIN_ROWS}
                    sanitizer={(html: string) => DOMPurify.sanitize(html)}
                    colHeaders={COLUMN_TITLES}
                    colWidths={[160, 120, null]}
                    columns={[
                        {
                            data: "workItem",
                            type: "autocomplete",
                            source: autocompleteSource,
                            strict: false,
                        },
                        { data: "timeSpent", type: "text" },
                        { data: "description", type: "text" },
                    ]}
                    stretchH="last"
                    rowHeaders={true}
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
