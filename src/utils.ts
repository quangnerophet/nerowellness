/** Get today's date as YYYY-MM-DD */
export function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

/** Format date for display: "Wed, Feb 25" */
export function formatDateShort(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone issues
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

/** Format date for display: "Tuesday, February 25" */
export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

/** Get greeting based on time of day */
export function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

/** Navigate date by +/- days */
export function shiftDate(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}
