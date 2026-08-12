"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastProvider } from "@/components/ToastProvider";

const theme = createTheme({
    cssVariables: {
        colorSchemeSelector: 'class'
    },
    colorSchemes: { light: true, dark: true },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AppRouterCacheProvider>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <ToastProvider>{children}</ToastProvider>
                </ThemeProvider>
            </LocalizationProvider>
        </AppRouterCacheProvider>
    );
}
