export type PoyaType = 'Full' | 'New';

export interface PoyaEntry {
    date: Date;
    type: PoyaType;
    details?: string;
    name?: string;
}

export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function parseSchedule(csv: string): PoyaEntry[] {
    return csv
        .split(/\r?\n/)
        .slice(1)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            const parts = line.split(/\t+|\s{2,}/);
            const dateStr = parts[0];
            const type = (parts[1]?.trim() ?? '') as PoyaType;
            const details = parts[2]?.trim();
            const name = parts[3]?.trim();

            const [month, day, year] = dateStr.split('/').map((part) => Number(part));
            // Create date as UTC midnight
            const date = new Date(Date.UTC(year, month - 1, day));
            return { date, type, details, name };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Returns a UTC Date object representing the start of the UTC day for the given local date.
 */
export function startOfUTCDate(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function daysBetween(a: Date, b: Date): number {
    // Both dates are UTC midnights, so the difference is an exact multiple of MS_PER_DAY
    return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function findNextPoya(
    entries: PoyaEntry[],
    today: Date,
): { entry: PoyaEntry; daysUntil: number } | undefined {
    const todayStart = startOfUTCDate(today);
    for (const entry of entries) {
        const diff = daysBetween(todayStart, entry.date);
        if (diff >= 0) {
            return { entry, daysUntil: diff };
        }
    }
    return undefined;
}

export function iconPathForEntry(type: PoyaType, daysUntil: number): string {
    const prefix = type === 'New' ? 'new' : 'full';
    const suffix = String(daysUntil).padStart(2, '0');
    return `images/${prefix}-${suffix}.png`;
}

export function abbreviateDetails(details?: string): string {
    if (!details) return '';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let result = details;
    for (const day of days) {
        const regex = new RegExp(day, 'g');
        result = result.replace(regex, day.substring(0, 3));
    }
    return result;
}

export function formatPoyaTitle(entry: PoyaEntry, daysUntil: number): string {
    const titleDate = entry.date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    let title = `Next uposatha: ${entry.type} moon on ${titleDate} (${daysUntil} day${daysUntil === 1 ? '' : 's'
        } away)`;

    const abbreviatedDetails = abbreviateDetails(entry.details);
    if (abbreviatedDetails) {
        title += `\n${abbreviatedDetails}`;
    }
    if (entry.name) {
        title += ` - ${entry.name}`;
    }

    return title;
}
