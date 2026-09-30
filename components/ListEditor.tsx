"use client";

import { useEffect, useRef, useState } from "react";
import Handsontable from "handsontable/base";
import { CellChange, ChangeSource } from "handsontable";
import {
    AutoColumnSize,
    ColumnSorting,
    DropdownMenu,
    Filters,
    HiddenRows,
    registerPlugin,
} from "handsontable/plugins";
import { handsontableTheme } from "@/lib/handsontableTheme";
import { registerGridShortcuts } from "@/lib/gridShortcuts";
import { CheckboxCellType, registerCellType } from "handsontable/cellTypes";
import { Input, InputAdornment, OutlinedInput, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

registerPlugin(ColumnSorting);
registerPlugin(Filters);

registerCellType(CheckboxCellType);

registerPlugin(AutoColumnSize);
registerPlugin(DropdownMenu);
registerPlugin(HiddenRows);

/** A work item key plus the hint used to recognize it. */
export type WorkItemHint = {
    key: string;
    description: string;
};

interface ListEditorProps {
    items: WorkItemHint[];
    onItemsChange: (items: WorkItemHint[]) => void;
}

export default function ListEditor({ items, onItemsChange }: ListEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const hotRef = useRef<Handsontable | null>(null);

    const [hintFilter, setHintFilter] = useState("");

    const onItemsChangeRef = useRef(onItemsChange);

    useEffect(() => {
        onItemsChangeRef.current = onItemsChange;
    }, [onItemsChange]);

    const lastCommittedItemsRef = useRef<WorkItemHint[]>(items);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const commitTableData = (instance: Handsontable) => {
            const sourceData =
                instance.getSourceData() as Partial<WorkItemHint>[];

            const nextItems = sourceData
                .map((item) => ({
                    key: String(item.key ?? "").trim(),
                    description: String(item.description ?? "").trim(),
                }))
                .filter((item) => item.key.length > 0);

            lastCommittedItemsRef.current = nextItems;

            onItemsChangeRef.current(nextItems);
        };

        const hot = new Handsontable(container, {
            data: items.map((item) => ({
                key: item.key,
                description: item.description,
            })),

            theme: handsontableTheme,

            width: "100%",
            height: "auto",

            colHeaders: ["Work Item", "Text hint"],
            columnSorting: true,
            filters: true,

            columns: [
                {
                    data: "key",
                    type: "text",
                },
                {
                    data: "description",
                    type: "text",
                },
            ],

            colWidths: [110, 170],
            stretchH: "last",

            hiddenRows: {
                indicators: false,
            },

            licenseKey: "non-commercial-and-evaluation",

            afterChange: function (
                this: Handsontable,
                changes: CellChange[] | null,
                source: ChangeSource,
            ) {
                if (
                    !changes ||
                    source === "loadData" ||
                    source === "updateData"
                ) {
                    return;
                }

                commitTableData(this);
            },

            afterRemoveRow: function (this: Handsontable) {
                commitTableData(this);
            },

            afterCreateRow: function (this: Handsontable) {
                commitTableData(this);
            },
        });

        hotRef.current = hot;

        registerGridShortcuts(hot);

        return () => {
            hot.destroy();
            hotRef.current = null;
        };
    }, []);

    /*
     * React -> Handsontable synchronization.
     */
    useEffect(() => {
        const hot = hotRef.current;

        if (!hot) {
            return;
        }

        const lastCommitted = lastCommittedItemsRef.current;

        const isSameData =
            items.length === lastCommitted.length &&
            items.every(
                (item, index) =>
                    item.key === lastCommitted[index]?.key &&
                    item.description === lastCommitted[index]?.description,
            );

        if (isSameData) {
            return;
        }

        const nextData = items.map((item) => ({
            key: item.key,
            description: item.description,
        }));

        lastCommittedItemsRef.current = nextData;

        hot.updateData(nextData);
    }, [items]);

    /*
     * Hint filter.
     *
     * We don't change the underlying Handsontable data.
     * We only hide rows whose description doesn't contain
     * the search text.
     */
    useEffect(() => {
        const hot = hotRef.current;

        if (!hot) {
            return;
        }

        const hiddenRows = hot.getPlugin("hiddenRows");

        if (!hiddenRows) {
            return;
        }

        const filter = hintFilter.trim().toLowerCase();

        const rowsToHide: number[] = [];

        for (let row = 0; row < hot.countRows(); row++) {
            const description = String(
                hot.getDataAtCell(row, 1) ?? "",
            ).toLowerCase();

            if (filter && !description.includes(filter)) {
                rowsToHide.push(row);
            }
        }

        hiddenRows.showRows(
            Array.from({ length: hot.countRows() }, (_, index) => index),
        );

        if (rowsToHide.length > 0) {
            hiddenRows.hideRows(rowsToHide);
        }

        hot.render();
    }, [hintFilter]);

    return (
        <section className="flex-1 min-h-0 px-4 pb-4 flex flex-col">
            <OutlinedInput
                size="small"
                value={hintFilter}
                onChange={(event) => setHintFilter(event.target.value)}
                placeholder="Search work items by hint"
                startAdornment={
                    <InputAdornment position="start">
                        <SearchIcon />
                    </InputAdornment>
                }
                className="mb-2"
            />

            <div ref={containerRef} className="flex-1 min-h-0" />
        </section>
    );
}
