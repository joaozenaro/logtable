"use client";

import { Dispatch, SetStateAction } from "react";
import { Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";

interface CalendarProps {
    day: Dayjs | null;
    setDay: Dispatch<SetStateAction<Dayjs | null>>;
}

export default function Calendar({ day, setDay }: CalendarProps) {
    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar
                value={day}
                onChange={(newValue) => setDay(newValue)}
            />
        </LocalizationProvider>
    );
}
