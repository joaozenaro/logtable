import { WorkLogRow } from "./db";

export const MIN_ROWS = 10;

/** The user-editable fields of a row, independent of DB bookkeeping. */
export type RowFields = Omit<WorkLogRow, "id" | "order" | "date">;

/** A row as it exists in the grid: editable fields required, DB bookkeeping optional/absent. */
export type EditableWorkLogRow = RowFields &
    Partial<Pick<WorkLogRow, "id" | "order" | "date">>;

/**
 * Fields that make a row worth keeping. A row with none of these is padding
 * and is not persisted, so `billable` is deliberately absent: ticking the box
 * on an otherwise empty row should not create a work log.
 */
const CONTENT_FIELDS = ["workItem", "timeSpent", "description"] as const;

/**
 * Fields whose value is sent to 7pace. Editing any of them on a synced row
 * invalidates the remote work log, so they drive the unsync-on-edit rule. This
 * is a superset of CONTENT_FIELDS: `billable` alone never justifies a row, but
 * changing it does change what 7pace stores.
 */
const SYNCED_FIELDS = [...CONTENT_FIELDS, "billable"] as const;

/** True when editing this field means the remote work log is now out of date. */
export function invalidatesRemoteLog(prop: string): boolean {
    return (SYNCED_FIELDS as readonly string[]).includes(prop);
}

/** True when the row has anything worth persisting or syncing. */
export function rowHasContent(row?: RowFields | null): boolean {
    if (!row) return false;

    return CONTENT_FIELDS.some((field) => Boolean(row[field]));
}

/**
 * True when the row holds content 7pace does not already have. A row that is
 * still `synced` is left out: the header dot already marks it as done, so
 * sending it again would only cost an API call. Editing a synced field clears
 * the flag (see `invalidatesRemoteLog`), which is what puts the row back in
 * this set.
 */
export function rowNeedsSync(row?: RowFields | null): boolean {
    if (!row) return false;

    return !row.synced && rowHasContent(row);
}

const BLANK_ROW: RowFields = {
    workItem: "",
    timeSpent: "",
    notes: "",
    description: "",
    // Matches the 7pace toggle's own default, so a fresh row is billable.
    billable: true,
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
 * Fills in the `billable` default for rows stored before the column existed.
 *
 * The grid renders this column as a checkbox, which treats a missing value as
 * invalid and shows the text "Invalid value" rather than an empty box. The
 * default matches the 7pace toggle's own default, so this normalises the
 * display without changing what any row means.
 */
export function withBillableDefault<T extends RowFields>(
    rows: readonly T[],
): Array<T & { billable: boolean }> {
    return rows.map((row) => ({ ...row, billable: row.billable ?? true }));
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
        // Undefined means the row predates the field, which is billable.
        billable: r.billable ?? true,
        order: i,
        date,
    }));
}
