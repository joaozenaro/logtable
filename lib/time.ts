export enum ParseReturn {
    Minutes,
    Seconds
}

export function parseTime(timeSpent: string, type: ParseReturn = ParseReturn.Minutes): number {
    if (!timeSpent) return 0;

    const match = timeSpent.match(/^(?:(?<hours>\d+)h)?(?:(?<minutes>\d+)m)?$/);
    if (!match?.groups) return 0;

    const hours = Number(match.groups.hours ?? 0);
    const minutes = Number(match.groups.minutes ?? 0);

    if (type == ParseReturn.Minutes) {
        return hours * 60 + minutes;
    }

    return hours * 3600 + minutes * 60;
}

export function calculateTotal(entries: string[]): string {
    const totalMinutes = entries.reduce(
        (acc, entry) => acc + parseTime(entry),
        0,
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}
