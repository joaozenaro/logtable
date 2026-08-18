import Dexie, { Table } from "dexie";

export interface TimeRow {
    id?: number;
    workItem: string;
    timeSpent: string;
    description: string;
    notes?: string;
    order: number; // preserves manual row order
    date: string; // scoped per day (YYYY-MM-DD format)
    synced?: boolean;
    remoteId?: string;
}

class TimeDB extends Dexie {
    rows!: Table<TimeRow, number>;

    constructor() {
        super("LogTableDB");
        this.version(1).stores({
            rows: "++id, order, date",
        });
    }
}

export const db = new TimeDB();
