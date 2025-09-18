import {drizzle} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import {env} from '$env/dynamic/private';

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
    if (database) {
        return database;
    }

    const connectionString = env.DATABASE_URL ?? process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
    }

    const client = postgres(connectionString);
    database = drizzle(client, {schema});

    return database;
}
