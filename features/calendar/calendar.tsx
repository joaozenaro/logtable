"use client";

import dynamic from "next/dynamic";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/mui/breezy/theme.css";

const EventCalendar = dynamic(
  () => import("@fullcalendar/mui/breezy/EventCalendar"),
  { ssr: false }
);

export default function Calendar() {
  return (
    <EventCalendar
      initialView="dayGridMonth"
      availableViews={[]}
      selectable={true}
    />
  );
}
