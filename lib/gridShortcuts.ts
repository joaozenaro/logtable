import type Handsontable from "handsontable/base";
import { WORK_ITEM_COLUMN_INDEX } from "./gridColumns";

interface GridShortcut {
    /** Key combination registered with Handsontable. */
    keys: string[][];
    /** Key combination as displayed in the UI hint. */
    hintKeys: string[];
    /** Human readable description of the action. */
    label: string;
    /** Action performed by the shortcut. */
    run: (hot: Handsontable) => void;
}

const GRID_SHORTCUTS: GridShortcut[] = [
    {
        keys: [["Alt", "Enter"]],
        hintKeys: ["Alt", "Enter"],
        label: "Open work item",
        run: (hot) => {
            const selected = hot.getSelected();
            if (!selected) return;

            const [row] = selected[0];
            const key = hot.getDataAtCell(row, WORK_ITEM_COLUMN_INDEX);
            if (!key) return;

            window.open(
                `/api/redirect-work-item?key=${encodeURIComponent(String(key))}`,
                "_blank",
                "noopener,noreferrer",
            );
        },
    },
    {
        keys: [["Control", "Enter"]],
        hintKeys: ["Ctrl", "Enter"],
        label: "Add row",
        run: (hot) => {
            const newRowIndex = hot.countRows();
            hot.alter("insert_row_below", Math.max(0, newRowIndex - 1), 1);
            hot.selectCell(newRowIndex, 0);
        },
    },
    {
        keys: [["Shift", "Backspace"]],
        hintKeys: ["Shift", "⌫"],
        label: "Delete row",
        run: (hot) => {
            const selected = hot.getSelectedRangeLast();
            if (!selected) return;

            // The first row is never removed.
            const rowIndex = selected.from.row ?? 0;
            if (rowIndex > 0) hot.alter("remove_row", rowIndex, 1);

            const nextRow = Math.min(rowIndex, hot.countRows() - 1);
            if (nextRow >= 0) hot.selectCell(nextRow, 0);
        },
    },
];

/** Shortcut hints for the UI, in the order they are declared. */
export const GRID_SHORTCUT_HINTS = GRID_SHORTCUTS.map(
    ({ hintKeys, label }) => ({ keys: hintKeys, label }),
);

/** Registers the shared grid shortcuts on the given Handsontable instance. */
export function registerGridShortcuts(hot: Handsontable) {
    const gridContext = hot.getShortcutManager().getContext("grid");
    if (!gridContext) return;

    gridContext.addShortcuts(
        GRID_SHORTCUTS.map(({ keys, run }) => ({
            keys,
            group: "customActions",
            callback: (event: KeyboardEvent) => {
                event.preventDefault();
                run(hot);
            },
        })),
    );
}
