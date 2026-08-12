export interface TimeEntry {
    id: number;
    workItem: string;
    timeSpent: string;
    description: string;
}

export interface Log extends TimeEntry {
    workItemId?: number;
    synced?: boolean;
    remoteId?: string;
}

export interface JiraIssue {
    id: number;
    key: string;
}