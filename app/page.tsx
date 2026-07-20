"use client";

import Grid from "@/components/Grid";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useMemo, useState } from "react";

import dynamic from "next/dynamic";
import type { Entry } from "@/components/ListEditor";

const Calendar = dynamic(() => import("@/components/Calendar"), {
    ssr: false,
});

const ListEditor = dynamic(() => import("@/components/ListEditor"), {
    ssr: false,
});

const STORAGE_KEY = "items";

export default function Home() {
    const [day, setDay] = useState<Dayjs | null>(dayjs());
    const [items, setItems] = useState<Entry[]>(() => {
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

    const handleItemsChange = useCallback((next: Entry[]) => {
        setItems(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }, []);

    const autocompleteKeys = useMemo(() => items.map((i) => i.key), [items]);

    return (
        <div className="flex h-full">
            <aside className="w-xs pt-4 h-full flex flex-col border-r border-gray-200 dark:border-gray-700">
                <Calendar day={day} setDay={setDay} />
                <ListEditor items={items} onItemsChange={handleItemsChange} />
            </aside>
            <main className="flex-1">
                <Grid
                    date={day ? day.format("YYYY-MM-DD") : null}
                    autocompleteSource={autocompleteKeys}
                />
            </main>
        </div>
    );
}
