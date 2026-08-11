"use client";

import { useEffect, useState } from "react";
import { useColorScheme } from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

export default function ThemeSwitcher() {
  const { mode, systemMode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeMode = mode === "system" ? systemMode : mode;
  const isDark = activeMode === "dark";

  const toggleMode = () => {
    setMode(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <IconButton size="small" aria-label="Toggle theme">
        <DarkModeIcon />
      </IconButton>
    );
  }

  return (
    <Tooltip
      title={isDark ? "Light mode" : "Dark mode"}
      enterDelay={1000}
    >
      <IconButton
        size="small"
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        onClick={toggleMode}
      >
        {isDark ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}