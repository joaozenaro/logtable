import { TimeRow } from "./db";

export const MIN_ROWS = 10;

/** The user-editable fields of a row, independent of DB bookkeeping. */
export type RowFields = Omit<TimeRow, "id" | "order" | "date">;

/** A row as it exists in the grid: editable fields required, DB bookkeeping optional/absent. */
export type GridRow = RowFields &
    Partial<Pick<TimeRow, "id" | "order" | "date">>;

const BLANK_ROW: RowFields = { workItem: "", timeSpent: "", description: "", notes: "" };

/**
 * Trims trailing rows that are completely blank (empty workItem, timeSpent, description, and notes).
 */
export function trimTrailingBlankRows<T extends RowFields>(rows: T[]): T[] {
    let lastNonBlank = rows.length - 1;
    while (
        lastNonBlank >= 0 &&
        !rows[lastNonBlank].workItem &&
        !rows[lastNonBlank].timeSpent &&
        !rows[lastNonBlank].description &&
        !rows[lastNonBlank].notes
    ) {
        lastNonBlank--;
    }
    return rows.slice(0, lastNonBlank + 1);
}

/**
 * Pads the row array to ensure it has at least `min` elements.
 */
export function padToMinRows<T extends RowFields>(
    rows: T[],
    min: number,
): Array<T | RowFields> {
    if (rows.length >= min) {
        return rows;
    }
    return [
        ...rows,
        ...Array(min - rows.length)
            .fill(null)
            .map(() => ({ ...BLANK_ROW })),
    ];
}

/**
 * Assigns `order` index and `date` to each row and returns TimeRow objects (without `id`).
 */
export function withOrder<T extends RowFields>(
    rows: T[],
    date: string,
): TimeRow[] {
    return rows.map((r, i) => ({
        workItem: r.workItem ?? "",
        timeSpent: r.timeSpent ?? "",
        description: r.description ?? "",
        notes: r.notes ?? "",
        synced: r.synced,
        remoteId: r.remoteId,
        order: i,
        date,
    }));
}
