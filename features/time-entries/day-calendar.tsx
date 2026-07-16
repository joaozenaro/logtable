"use client";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { Dayjs } from "dayjs";

interface DayCalendarProps {
  value: Dayjs;
  onChange: (newValue: Dayjs | null) => void;
}

export default function DayCalendar({ value, onChange }: DayCalendarProps) {
  return (
    <div style={{ maxWidth: 340 }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateCalendar
          value={value}
          onChange={onChange}
          sx={{ width: "100%" }}
          showDaysOutsideCurrentMonth
          fixedWeekNumber={6}
        />
      </LocalizationProvider>
    </div>
  );
}
