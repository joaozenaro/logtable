"use client";

import Grid from "@/components/Grid";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import type { WorkItemHint } from "@/components/WorkItemHints";

const Calendar = dynamic(() => import("@/components/Calendar"), {
    ssr: false,
});

const WorkItemHints = dynamic(() => import("@/components/WorkItemHints"), {
    ssr: false,
});

const STORAGE_KEY = "items";

const createEmptyWorkItemHint = (): WorkItemHint => ({
    key: "",
    description: "",
});

export default function Home() {
    const [day, setDay] = useState<Dayjs | null>(dayjs());
    const [workItemHints, setWorkItemHints] = useState<WorkItemHint[]>(() => {
        if (typeof window === "undefined") {
            return [createEmptyWorkItemHint()];
        }

        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
            try {
                const parsed = JSON.parse(saved);

                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            } catch (e) {
                console.error(e);
            }
        }

        return [createEmptyWorkItemHint()];
    });

    const handleWorkItemHintsChange = useCallback((next: WorkItemHint[]) => {
        const workItemHints =
            next.length > 0 ? next : [createEmptyWorkItemHint()];

        setWorkItemHints(workItemHints);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workItemHints));
    }, []);

    const autocompleteKeys = useMemo(
        () => workItemHints.map((item) => item.key).filter(Boolean),
        [workItemHints],
    );

    return (
        <div className="flex h-full">
            <aside className="w-xs pt-2 h-full flex flex-col border-r border-divider">
                <Calendar day={day} setDay={setDay} />
                <WorkItemHints
                    items={workItemHints}
                    onItemsChange={handleWorkItemHintsChange}
                />
            </aside>

            <main className="flex-1 min-w-0 h-full pt-2 p-4">
                <Grid
                    date={day ? day.format("YYYY-MM-DD") : null}
                    autocompleteSource={autocompleteKeys}
                />
            </main>
        </div>
    );
}
