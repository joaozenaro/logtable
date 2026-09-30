/** A single work log as sent to POST /api/sync. */
export interface SyncLogPayload {
    id?: number;
    workItem: string;
    timeSpent: string;
    description: string;
    synced?: boolean;
    remoteId?: string;
}

export interface JiraIssue {
    id: number;
    key: string;
}
