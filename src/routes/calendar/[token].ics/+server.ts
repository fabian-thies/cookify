import {error, type RequestHandler} from '@sveltejs/kit';
import {buildMealPlanCalendar} from '$lib/server/calendar';
import {getCalendarEvents, getUserIdByCalendarToken} from '$lib/server/db/meal-plan';
import {getDb} from '$lib/server/db';
import {user} from '$lib/server/db/schema';
import {eq} from 'drizzle-orm';

async function getCalendarName(userId: string): Promise<string | undefined> {
    const [row] = await getDb()
        .select({username: user.username})
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    return row ? `${row.username}'s meal plan` : undefined;
}

export const GET: RequestHandler = async ({params, url}) => {
    const token = params.token;
    if (!token) {
        throw error(404, 'Not found');
    }

    const userId = await getUserIdByCalendarToken(token);
    if (!userId) {
        throw error(404, 'Not found');
    }

    const [events, calendarName] = await Promise.all([
        getCalendarEvents(userId),
        getCalendarName(userId)
    ]);

    const body = buildMealPlanCalendar(events, url.origin, calendarName);

    return new Response(body, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'inline; filename="cookify-meal-plan.ics"',
            'Cache-Control': 'private, max-age=300',
            'X-Robots-Tag': 'noindex, nofollow'
        }
    });
};
