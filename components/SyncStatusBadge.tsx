"use client";

import Tooltip from "./Tooltip";

export type SyncStatus = "synced" | "syncing" | "error";

interface SyncStatusBadgeProps {
    status: SyncStatus;
}

const STATUS_META = {
    synced: {
        colorClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
        label: "Saved",
        tooltip: "All changes saved to IndexedDB",
    },
    syncing: {
        colorClass: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
        label: "Saving...",
        tooltip: "Syncing changes to IndexedDB...",
    },
    error: {
        colorClass: "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
        label: "Sync Error",
        tooltip: "Failed to save changes to IndexedDB",
    },
};

export default function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
    const meta = STATUS_META[status] || STATUS_META.synced;

    return (
        <Tooltip title={meta.tooltip}>
            <div className="inline-flex items-center gap-2 cursor-pointer">
                <span className="relative flex h-2 w-2">
                    {status === "syncing" && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    )}
                    <span
                        className={`relative inline-flex rounded-full h-2 w-2 transition-all duration-300 ${meta.colorClass}`}
                    />
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {meta.label}
                </span>
            </div>
        </Tooltip>
    );
}
