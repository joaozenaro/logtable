import Dexie, { Table } from "dexie";

export interface WorkLogRow {
    id?: number;
    workItem: string;
    timeSpent: string;
    notes: string;
    description: string;
    order: number; // preserves manual row order
    date: string; // scoped per day (YYYY-MM-DD format)
    synced?: boolean;
    remoteId?: string;
    /**
     * Mirrors the 7pace "Billable" custom toggle. Optional because rows
     * written before this field existed have no value; callers treat a missing
     * value as true, matching the toggle's own default.
     */
    billable?: boolean;
}

class TimeDB extends Dexie {
    rows!: Table<WorkLogRow, number>;

    constructor() {
        super("LogTableDB");
        this.version(1).stores({
            rows: "++id, order, date",
        });
    }
}

export const db = new TimeDB();
