"use client";

import Grid from "@/components/Grid";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import type { WorkItemHint } from "@/components/ListEditor";

const Calendar = dynamic(() => import("@/components/Calendar"), {
    ssr: false,
});

const ListEditor = dynamic(() => import("@/components/ListEditor"), {
    ssr: false,
});

const STORAGE_KEY = "items";

export default function Home() {
    const [day, setDay] = useState<Dayjs | null>(dayjs());
    const [items, setItems] = useState<WorkItemHint[]>(() => {
        if (typeof window === "undefined") return [];
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error(e);
            }
        }
        return [];
    });

    const handleItemsChange = useCallback((next: WorkItemHint[]) => {
        setItems(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }, []);

    const autocompleteKeys = useMemo(() => items.map((i) => i.key), [items]);

    return (
        <div className="flex h-full">
            <aside className="w-xs pt-2 h-full flex flex-col border-r border-divider">
                <Calendar day={day} setDay={setDay} />
                <ListEditor items={items} onItemsChange={handleItemsChange} />
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
