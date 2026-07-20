import Dexie, { Table } from "dexie";

export interface TimeRow {
    id?: number;
    workItem: string;
    timeSpent: string;
    description: string;
    order: number; // preserves manual row order
    date: string; // scoped per day (YYYY-MM-DD format)
}

class TimeDB extends Dexie {
    rows!: Table<TimeRow, number>;

    constructor() {
        super("TimeTrackerDB");
        this.version(1).stores({
            rows: "++id, order, date",
        });
    }
}

export const db = new TimeDB();
