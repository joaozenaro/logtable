export enum TimeUnit {
    Minutes,
    Seconds,
}

export function parseTime(
    timeSpent: string,
    unit: TimeUnit = TimeUnit.Minutes,
): number {
    if (!timeSpent) return 0;

    const match = timeSpent.match(/^(?:(?<hours>\d+)h)?(?:(?<minutes>\d+)m)?$/);
    if (!match?.groups) return 0;

    const hours = Number(match.groups.hours ?? 0);
    const minutes = Number(match.groups.minutes ?? 0);

    if (unit == TimeUnit.Minutes) {
        return hours * 60 + minutes;
    }

    return hours * 3600 + minutes * 60;
}

export function calculateTotal(timeSpents: string[]): string {
    const totalMinutes = timeSpents.reduce(
        (acc, timeSpent) => acc + parseTime(timeSpent),
        0,
    );

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}
