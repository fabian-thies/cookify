import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }

    const client = postgres(connectionString, { max: 1 });

    const db = drizzle(client);

    await migrate(db, { migrationsFolder: 'drizzle' });

    await client.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
