"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a boolean flag from localStorage via useSyncExternalStore.
 * Server snapshot always returns `false` to avoid hydration mismatches.
 */
export function useLocalStorageFlag(
    key: string,
): [boolean, (value: boolean) => void] {
    const subscribe = useCallback(
        (callback: () => void) => {
            // cross-tab changes
            const onStorage = (e: StorageEvent) => {
                if (e.key === key) callback();
            };
            window.addEventListener("storage", onStorage);
            // same-tab changes via setValue below
            window.addEventListener(`ls:${key}`, callback);
            return () => {
                window.removeEventListener("storage", onStorage);
                window.removeEventListener(`ls:${key}`, callback);
            };
        },
        [key],
    );

    const getSnapshot = useCallback(
        () => localStorage.getItem(key) === "true",
        [key],
    );

    const getServerSnapshot = useCallback(() => false, []);

    const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const setValue = useCallback(
        (next: boolean) => {
            localStorage.setItem(key, String(next));
            window.dispatchEvent(new Event(`ls:${key}`));
        },
        [key],
    );

    return [value, setValue];
}
