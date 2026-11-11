type CalendarEvent = {
    id: number;
    date: string;
    createdAt: Date;
    recipeId: number;
    title: string;
    cookingTime: number;
    servings: number;
};

const encoder = new TextEncoder();
// 74 bytes per chunk leaves room for the single leading space on continuation lines.
const LINE_LIMIT = 74;

function escapeText(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/\r?\n/g, '\\n')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,');
}

function formatUtc(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function formatDate(date: string): string {
    return date.replaceAll('-', '');
}

function nextDate(date: string): string {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + 1);
    return formatDate(value.toISOString().slice(0, 10));
}

// RFC 5545: fold at 75 octets without splitting multi-byte characters.
function foldLine(line: string): string {
    if (encoder.encode(line).length <= LINE_LIMIT) {
        return line;
    }

    const chunks: string[] = [];
    let current = '';
    let bytes = 0;

    for (const character of line) {
        const size = encoder.encode(character).length;
        if (bytes + size > LINE_LIMIT) {
            chunks.push(current);
            current = '';
            bytes = 0;
        }
        current += character;
        bytes += size;
    }

    if (current) {
        chunks.push(current);
    }

    return chunks.join('\r\n ');
}

export function buildMealPlanCalendar(events: CalendarEvent[], origin: string, calendarName = 'Cookify meal plan'): string {
    const stamp = formatUtc(new Date());
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Cookify//Meal Plan//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeText(calendarName)}`,
        'X-WR-CALDESC:Your planned meals from Cookify',
        'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
        'X-PUBLISHED-TTL:PT12H'
    ];

    for (const event of events) {
        const recipeUrl = `${origin}/recipe/${event.recipeId}`;
        const description = [
            recipeUrl,
            `${event.cookingTime} min`,
            `${event.servings} servings`
        ].join('\n');

        lines.push(
            'BEGIN:VEVENT',
            `UID:cookify-meal-${event.id}@cookify`,
            `DTSTAMP:${stamp}`,
            `LAST-MODIFIED:${formatUtc(event.createdAt)}`,
            `DTSTART;VALUE=DATE:${formatDate(event.date)}`,
            `DTEND;VALUE=DATE:${nextDate(event.date)}`,
            `SUMMARY:${escapeText(event.title)}`,
            `DESCRIPTION:${escapeText(description)}`,
            `URL:${recipeUrl}`,
            'TRANSP:TRANSPARENT',
            'END:VEVENT'
        );
    }

    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n') + '\r\n';
}
