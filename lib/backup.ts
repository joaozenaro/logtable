import { db, type WorkLogRow } from "./db";
import { rowHasContent } from "./dayRows";

/**
 * Bumped when the payload shape changes incompatibly, so an old file is
 * rejected instead of being imported with missing fields.
 */
export const BACKUP_VERSION = 1;

export interface Backup {
    version: number;
    exportedAt: string;
    rows: WorkLogRow[];
}

/** Raised when a file is not a backup this app wrote. */
export class InvalidBackupError extends Error {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

/**
 * Validates the parsed JSON and returns it as a backup, or throws
 * InvalidBackupError. Never trust a file: every field is coerced to the type
 * the DB expects, and rows that carry no content are dropped so a hand-edited
 * file cannot inject blank rows.
 */
export function parseBackup(json: unknown): Backup {
    if (!isPlainObject(json)) {
        throw new InvalidBackupError("File is not a backup object.");
    }

    if (json.version !== BACKUP_VERSION) {
        throw new InvalidBackupError(
            `Unsupported backup version: ${String(json.version)}`,
        );
    }

    if (!Array.isArray(json.rows)) {
        throw new InvalidBackupError("Backup has no rows array.");
    }

    const rows = json.rows.flatMap((raw, index) => {
        if (!isPlainObject(raw)) {
            throw new InvalidBackupError(`Row ${index + 1} is not an object.`);
        }

        const date = asString(raw.date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new InvalidBackupError(
                `Row ${index + 1} has an invalid date: "${date}".`,
            );
        }

        const row: WorkLogRow = {
            workItem: asString(raw.workItem).trim(),
            timeSpent: asString(raw.timeSpent).trim(),
            notes: asString(raw.notes),
            description: asString(raw.description),
            order: Number(raw.order) || 0,
            date,
            // Sync metadata is preserved so a restore does not re-push every
            // row to 7pace, but malformed values are dropped.
            synced: typeof raw.synced === "boolean" ? raw.synced : undefined,
            remoteId: asString(raw.remoteId) || undefined,
        };

        return rowHasContent(row) ? [row] : [];
    });

    return {
        version: BACKUP_VERSION,
        exportedAt: asString(json.exportedAt),
        rows,
    };
}

/** Builds a backup of every locally stored day. */
export async function buildBackup(): Promise<Backup> {
    const rows = await db.rows.orderBy("order").toArray();

    return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        // `id` is local to this browser's autoincrement; it is meaningless
        // elsewhere and would collide on import.
        rows: rows.map((row) => {
            const { id, ...rest } = row;
            void id;
            return rest;
        }),
    };
}

/**
 * Replaces the rows of every date present in the backup. Dates absent from the
 * file are left untouched, so a partial file cannot wipe unrelated days.
 */
export async function restoreBackup(backup: Backup): Promise<number> {
    const dates = [...new Set(backup.rows.map((row) => row.date))];

    if (dates.length === 0) return 0;

    await db.transaction("rw", db.rows, async () => {
        for (const date of dates) {
            await db.rows.where("date").equals(date).delete();
        }

        await db.rows.bulkAdd(backup.rows);
    });

    return backup.rows.length;
}

/** Groups rows by date, for the summary shown before importing. */
export function groupByDate(
    rows: WorkLogRow[],
): Map<string, { count: number; hasSynced: number }> {
    const dates = new Map<string, { count: number; hasSynced: number }>();

    for (const row of rows) {
        const entry = dates.get(row.date) ?? { count: 0, hasSynced: 0 };
        entry.count += 1;

        if (row.synced) entry.hasSynced += 1;

        dates.set(row.date, entry);
    }

    return dates;
}
