"use client";

import React from "react";

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
        <div className="flex items-center gap-2 group relative cursor-pointer">
            <span className="relative flex h-2 w-2">
                {status === "syncing" && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                )}
                <span
                    className={`relative inline-flex rounded-full h-2 w-2 transition-all duration-300 ${meta.colorClass}`}
                />
            </span>
            <span className="text-xs text-neutral-400">{meta.label}</span>

            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-neutral-900 text-neutral-200 text-xs px-2.5 py-1 rounded shadow-lg border border-neutral-800 whitespace-nowrap z-150">
                {meta.tooltip}
            </div>
        </div>
    );
}
