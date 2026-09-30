import type Handsontable from "handsontable/base";
import type { CellChange } from "handsontable";
import { isContentField, type EditableWorkLogRow } from "./dayRows";

/** Reads every row of the grid in display order, as stored source data. */
export function readRows(hot: Handsontable): EditableWorkLogRow[] {
    const rows: EditableWorkLogRow[] = [];

    for (let i = 0; i < hot.countRows(); i++) {
        const row = hot.getSourceDataAtRow(
            hot.toPhysicalRow(i),
        ) as EditableWorkLogRow | null;

        if (row) rows.push(row);
    }

    return rows;
}

/**
 * Clears the `synced` flag on rows whose content changed, so the next sync
 * updates the remote work log instead of leaving it stale.
 */
export function markEditedRowsUnsynced(
    hot: Handsontable,
    changes: CellChange[],
): void {
    for (const [row, prop, oldValue, newValue] of changes) {
        if (!isContentField(String(prop)) || oldValue === newValue) continue;

        const physicalRow = hot.toPhysicalRow(row as number);
        const rowData = hot.getSourceDataAtRow(
            physicalRow,
        ) as EditableWorkLogRow | null;

        if (rowData?.synced) {
            hot.setSourceDataAtCell(physicalRow, "synced", false);
        }
    }
}

/** Remote sync state of a single row, as shown by its header dot. */
export interface RowSyncState {
    hasContent: boolean;
    isPending: boolean;
    isSynced: boolean;
    hasRemoteId: boolean;
}

/**
 * Renders a row header: the 1-based row number plus a status dot, if any.
 * Handsontable row headers are HTML strings, not React nodes.
 */
export function renderRowHeader(
    rowNumber: number,
    { hasContent, isPending, isSynced, hasRemoteId }: RowSyncState,
): string {
    let dotColor = "";

    if (hasContent) {
        if (isPending) {
            dotColor = "bg-yellow-700";
        } else if (isSynced) {
            dotColor = "bg-green-700";
        } else if (hasRemoteId) {
            // Previously synced, edited since - next sync will update it.
            dotColor = "bg-yellow-700";
        }
    }

    const dotHtml = dotColor
        ? `<div class="absolute top-1 right-1 rounded-full w-1 h-1 ${dotColor}"></div>`
        : "";

    return `${rowNumber}${dotHtml}`;
}
