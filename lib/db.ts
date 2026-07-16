import { TimeEntry } from "@/types";

const DB_NAME = "TimeTrackerDB";
const STORE_NAME = "entries";
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "date" });
      }
    };
  });
}

export async function getEntriesForDate(
  dateStr: string,
): Promise<TimeEntry[] | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(dateStr);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.entries);
      } else {
        resolve(null);
      }
    };
  });
}

export async function saveEntriesForDate(
  dateStr: string,
  entries: TimeEntry[],
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ date: dateStr, entries });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
