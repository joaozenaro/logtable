"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastProvider } from "@/components/ToastProvider";

const theme = createTheme({
    cssVariables: true,
    colorSchemes: { light: true, dark: true },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AppRouterCacheProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
        </AppRouterCacheProvider>
    );
}
