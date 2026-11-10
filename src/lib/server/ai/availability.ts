import {isAiConfigured} from '$lib/server/ai';
import {getAiEnabled} from '$lib/server/db/site';

export async function isAiAvailable(): Promise<boolean> {
    return isAiConfigured() && await getAiEnabled();
}
