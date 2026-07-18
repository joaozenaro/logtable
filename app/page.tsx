"use client";

import Grid from "@/components/Grid";
import dayjs, { Dayjs } from "dayjs";
import { useState } from "react";

import dynamic from "next/dynamic";

const Calendar = dynamic(() => import("@/components/Calendar"), {
    ssr: false,
});

export default function Home() {
    const [day, setDay] = useState<Dayjs | null>(dayjs());

    return (
        <div className="flex">
            <div className="w-xs">
                <Calendar day={day} setDay={setDay} />
            </div>
            <div className="flex-1">
                <Grid date={day ? day.format("YYYY-MM-DD") : null}></Grid>
            </div>
        </div>
    );
}
