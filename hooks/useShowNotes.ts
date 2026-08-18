import { useState, useEffect } from "react";

export function useShowNotes() {
    const [showNotes, setShowNotes] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("showNotes");
        if (stored !== null) {
            setTimeout(() => {
                setShowNotes(stored === "true");
                setIsMounted(true);
            }, 0);
        } else {
            setTimeout(() => {
                setIsMounted(true);
            }, 0);
        }
    }, []);

    useEffect(() => {
        if (isMounted) {
            localStorage.setItem("showNotes", showNotes.toString());
        }
    }, [showNotes, isMounted]);

    return { showNotes, setShowNotes, isMounted };
}
