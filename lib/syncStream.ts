import type { SyncEvent } from "./syncTypes";

const DATA_PREFIX = "data: ";

/**
 * Reads a server-sent events response body and invokes `onEvent` for every
 * complete data frame, in order. Frames that are not valid JSON are skipped.
 */
export async function forEachSyncEvent(
    body: ReadableStream<Uint8Array>,
    onEvent: (event: SyncEvent) => void,
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const handleLine = (line: string) => {
        if (!line.startsWith(DATA_PREFIX)) return;

        try {
            onEvent(JSON.parse(line.slice(DATA_PREFIX.length)));
        } catch {
            // Skip malformed frames rather than aborting the whole stream.
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(handleLine);
    }

    // Flush a trailing frame that arrived without a closing newline.
    buffer += decoder.decode();
    buffer.split("\n").forEach(handleLine);
}
