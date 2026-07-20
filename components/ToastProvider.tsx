"use client";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";

type Severity = "success" | "info" | "warning" | "error";

interface ToastOptions {
    message: string;
    severity?: Severity;
    duration?: number;
}

interface ToastContextValue {
    showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastState {
    message: string;
    severity: Severity;
    duration: number;
    key: number;
}

// Lazy initialiser: runs once on first render, client-side only.
// Returns document.body (available in the browser) or null (SSR).
function getPortalTarget(): Element | null {
    return typeof document !== "undefined" ? document.body : null;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState<ToastState>({
        message: "",
        severity: "success",
        duration: 2500,
        key: 0,
    });
    const keyRef = useRef(0);
    const [portalTarget] = useState<Element | null>(getPortalTarget);

    const showToast = useCallback(
        ({ message, severity = "success", duration = 2500 }: ToastOptions) => {
            keyRef.current += 1;
            setToast({ message, severity, duration, key: keyRef.current });
            setOpen(true);
        },
        [],
    );

    const handleClose = (_: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === "clickaway") return;
        setOpen(false);
    };

    const snackbar = (
        <Snackbar
            key={toast.key}
            open={open}
            autoHideDuration={toast.duration}
            onClose={handleClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
            <Alert
                onClose={handleClose}
                severity={toast.severity}
                variant="filled"
                sx={{ width: "100%" }}
            >
                {toast.message}
            </Alert>
        </Snackbar>
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {portalTarget && createPortal(snackbar, portalTarget)}
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return ctx;
}
