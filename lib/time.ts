function parseTimeToMinutes(timeSpent: string): number {
    if (!timeSpent) return 0;

    const match = timeSpent.match(/^(?:(?<hours>\d+)h)?(?:(?<minutes>\d+)m)?$/);
    if (!match?.groups) return 0;

    const hours = Number(match.groups.hours ?? 0);
    const minutes = Number(match.groups.minutes ?? 0);
    return hours * 60 + minutes;
}

function formatMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

export function calculateTotal(entries: string[]): string {
    const totalMinutes = entries.reduce(
        (acc, entry) => acc + parseTimeToMinutes(entry),
        0,
    );

    return formatMinutes(totalMinutes);
}
