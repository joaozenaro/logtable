"use client";

import Grid from "@/components/Grid";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";

import dynamic from "next/dynamic";
import ListEditor from "@/components/ListEditor";

const Calendar = dynamic(() => import("@/components/Calendar"), {
    ssr: false,
});

export default function Home() {
    const [day, setDay] = useState<Dayjs | null>(dayjs());

    return (
        <div className="flex h-full">
            <aside className="w-xs pt-4 h-full flex flex-col border-r border-gray-200 dark:border-gray-700">
                <Calendar day={day} setDay={setDay} />
                <ListEditor />
            </aside>
            <main className="flex-1">
                <Grid date={day ? day.format("YYYY-MM-DD") : null} />
            </main>
        </div>
    );
}
