"use client";

import { Box, Button, Typography } from "@mui/material";
import useTimeEntries from "@/features/time-entries/use-time-entries";
import TimeGrid from "@/features/time-entries/time-grid";
import { authClient } from "@/lib/auth-client";
import dynamic from "next/dynamic";

const DayCalendar = dynamic(
  () => import("@/features/time-entries/day-calendar"),
  {
    ssr: false,
  },
);

export default function Home() {
  const { entries, setEntries, totalTime } = useTimeEntries();

  const { data: session } = authClient.useSession();

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* ── Left Sidebar ── */}
      <Box
        sx={{
          width: 300,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          bgcolor: "action.hover",
          borderRight: "1px solid",
          borderColor: "divider",
          p: 2,
          gap: 2,
          overflow: "hidden",
        }}
      >
        {/* Calendar */}
        <Box sx={{ flex: 0 }}>
          <DayCalendar />
        </Box>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Auth area */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            pt: 1,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {!session && (
            <Button
              onClick={() => authClient.signIn.social({ provider: "github" })}
              variant="contained"
              sx={{ textTransform: "none", width: "100%" }}
            >
              Sign in with GitHub
            </Button>
          )}
          {session && (
            <Button
              onClick={() => authClient.signOut()}
              variant="outlined"
              sx={{ width: "100%" }}
            >
              Sign Out
            </Button>
          )}
        </Box>
      </Box>

      {/* ── Right Main Area ── */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Title bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 3,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              backgroundClip: "text",
            }}
          >
            Time Tracker
          </Typography>
        </Box>

        {/* Grid area */}
        <Box sx={{ flex: 1, overflow: "hidden", p: 2 }}>
          <TimeGrid
            entries={entries}
            setEntries={setEntries}
            totalTime={totalTime}
          />
        </Box>
      </Box>
    </Box>
  );
}
