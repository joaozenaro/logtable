/**
 * Escapes a single CSV field per RFC 4180: fields containing a comma, a double
 * quote or a line break are wrapped in quotes, with inner quotes doubled.
 */
function escapeCsvField(value: unknown): string {
    const text = value === null || value === undefined ? "" : String(value);

    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** True when every cell in the row is empty. */
function isBlankRow(row: readonly unknown[]): boolean {
    return !row.some(
        (cell) => cell !== null && cell !== undefined && cell !== "",
    );
}

/**
 * Serializes a header and its data rows to CSV, skipping fully blank rows
 * (grid padding rows the user never filled in).
 */
export function toCsv(
    header: readonly string[],
    rows: readonly (readonly unknown[])[],
): string {
    return [header, ...rows.filter((row) => !isBlankRow(row))]
        .map((row) => row.map(escapeCsvField).join(","))
        .join("\r\n");
}
