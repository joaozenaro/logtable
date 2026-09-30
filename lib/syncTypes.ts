/** A single work log as sent to POST /api/sync. */
export interface SyncLogPayload {
    id?: number;
    workItem: string;
    timeSpent: string;
    description: string;
    synced?: boolean;
    remoteId?: string;
}

/**
 * Body accepted by POST /api/sync.
 *
 * A bare array of logs is also accepted, for clients predating deletes/date.
 * `date` is null when the grid has no day selected, which the server reads as
 * "use today".
 */
export interface SyncRequestBody {
    logs?: SyncLogPayload[];
    deletes?: string[];
    date?: string | null;
}

/**
 * Progress event streamed back by POST /api/sync while syncing to 7pace.
 *
 * `index` refers to the position in the `logs` (for `kind: "sync"`) or
 * `deletes` (for `kind: "delete"`) array of the request. A negative index means
 * a failure that aborted the whole stream rather than a single entry.
 */
export interface SyncEvent {
    kind: "sync" | "delete";
    index: number;
    status: "synced" | "deleted" | "error";
    remoteId?: string;
    error?: string;
}

/** Serializes an event into a server-sent events data frame. */
export function toSseData(event: SyncEvent): string {
    return `data: ${JSON.stringify(event)}\n\n`;
}
