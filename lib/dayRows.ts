import { WorkLogRow } from "./db";

export const MIN_ROWS = 10;

/** The user-editable fields of a row, independent of DB bookkeeping. */
export type RowFields = Omit<WorkLogRow, "id" | "order" | "date">;

/** A row as it exists in the grid: editable fields required, DB bookkeeping optional/absent. */
export type EditableWorkLogRow = RowFields &
    Partial<Pick<WorkLogRow, "id" | "order" | "date">>;

/**
 * Fields that make a row worth keeping. Editing one of them on a synced row
 * invalidates the remote work log, so the same list drives both the blank-row
 * check and the unsync-on-edit rule.
 */
const CONTENT_FIELDS = ["workItem", "timeSpent", "description"] as const;

/** True when the field is one of the content-bearing row fields. */
export function isContentField(prop: string): boolean {
    return (CONTENT_FIELDS as readonly string[]).includes(prop);
}

/** True when the row has anything worth persisting or syncing. */
export function rowHasContent(row?: RowFields | null): boolean {
    if (!row) return false;

    return CONTENT_FIELDS.some((field) => Boolean(row[field]));
}

const BLANK_ROW: RowFields = {
    workItem: "",
    timeSpent: "",
    notes: "",
    description: "",
};

/**
 * Trims trailing rows that are completely blank (no work item, time or description).
 */
export function trimTrailingBlankRows<T extends RowFields>(rows: T[]): T[] {
    let lastNonBlank = rows.length - 1;
    while (lastNonBlank >= 0 && !rowHasContent(rows[lastNonBlank])) {
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
 * Assigns `order` index and `date` to each row and returns WorkLogRow objects (without `id`).
 */
export function withOrder<T extends RowFields>(
    rows: T[],
    date: string,
): WorkLogRow[] {
    return rows.map((r, i) => ({
        workItem: r.workItem ?? "",
        timeSpent: r.timeSpent ?? "",
        notes: r.notes ?? "",
        description: r.description ?? "",
        synced: r.synced,
        remoteId: r.remoteId,
        order: i,
        date,
    }));
}
