import { error, json } from '@sveltejs/kit';
import { getTableName, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import fs from 'node:fs';
import path from 'node:path';
import { readBackup, RESTORE_DIRECTORY_PREFIX } from '../archive';

let restoreInProgress = false;

function stageUploads(uploads: Awaited<ReturnType<typeof readBackup>>['uploads']) {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    // Stage on the same filesystem so a Docker bind mount stays in place during the moves.
    fs.mkdirSync(uploadsDir, {recursive: true});
    const workDir = fs.mkdtempSync(path.join(uploadsDir, RESTORE_DIRECTORY_PREFIX));
    const incoming = path.join(workDir, 'incoming');
    const previous = path.join(workDir, 'previous');
    const savedNames: string[] = [];
    const restoredNames: string[] = [];
    const cleanup = () => fs.rmSync(workDir, {recursive: true, force: true});

    try {
        fs.mkdirSync(incoming);
        fs.mkdirSync(previous);
        for (const entry of uploads) {
            const destination = path.join(incoming, entry.entryName.slice('uploads/'.length));
            fs.mkdirSync(path.dirname(destination), {recursive: true});
            fs.writeFileSync(destination, entry.getData(), {flag: 'wx'});
        }
    } catch (error) {
        cleanup();
        throw error;
    }

    return {
        replace() {
            for (const name of fs.readdirSync(uploadsDir)) {
                if (name.startsWith(RESTORE_DIRECTORY_PREFIX)) continue;
                fs.renameSync(path.join(uploadsDir, name), path.join(previous, name));
                savedNames.push(name);
            }
            for (const name of fs.readdirSync(incoming)) {
                fs.renameSync(path.join(incoming, name), path.join(uploadsDir, name));
                restoredNames.push(name);
            }
        },
        rollback() {
            for (const name of restoredNames) {
                fs.rmSync(path.join(uploadsDir, name), {recursive: true, force: true});
            }
            for (const name of savedNames) {
                fs.renameSync(path.join(previous, name), path.join(uploadsDir, name));
            }
        },
        cleanup,
    };
}

export const POST = async ({ locals, request }) => {
    if (!locals.user?.administrator) {
        throw error(401, 'Unauthorized');
    }

    const {data, uploads} = await readBackup(request);
    if (restoreInProgress) throw error(409, 'A backup restore is already in progress');
    restoreInProgress = true;
    let staged: ReturnType<typeof stageUploads> | undefined;
    let committed = false;

    try {
        const db = getDb();
        staged = stageUploads(uploads);
        const uploadRestore = staged;
        await db.transaction(async (tx) => {
            const tables = [
                table.passkey, table.recipeRating, table.favorite, table.tips, table.tags,
                table.steps, table.ingredients, table.difficultyToRecipe, table.collectionToRecipe,
                table.collections, table.difficulty, table.mealPlan, table.shoppingListItems, table.shoppingListShares,
                table.recipeNotes, table.cookHistory, table.session, table.recipes, table.siteSettings, table.user,
            ];
            // Wait for active shared-list operations before taking locks on the list items they update.
            await tx.execute(sql`LOCK TABLE ${sql.identifier(getTableName(table.shoppingListShares))} IN EXCLUSIVE MODE`);
            const names = tables.map(target => sql.identifier(getTableName(target)));
            await tx.execute(sql`LOCK TABLE ${sql.join(names, sql`, `)} IN SHARE ROW EXCLUSIVE MODE`);
            // The table list is in reverse dependency order.
            for (const target of tables) await tx.delete(target);

            // Insert in dependency order (parents first)
            if (data.users?.length) {
                await tx.insert(table.user).values(data.users as typeof table.user.$inferInsert[]);
            }
            if (data.passkey?.length) {
                await tx.insert(table.passkey).values(data.passkey as typeof table.passkey.$inferInsert[]);
            }
            if (data.siteSettings?.length) {
                await tx.insert(table.siteSettings).values(data.siteSettings as typeof table.siteSettings.$inferInsert[]);
            }
            if (data.recipes?.length) {
                await tx.insert(table.recipes).values(data.recipes as typeof table.recipes.$inferInsert[]);
            }
            if (data.recipeNotes?.length) {
                await tx.insert(table.recipeNotes).values(data.recipeNotes as typeof table.recipeNotes.$inferInsert[]);
            }
            if (data.cookHistory?.length) {
                await tx.insert(table.cookHistory).values(data.cookHistory as typeof table.cookHistory.$inferInsert[]);
            }
            if (data.difficulty?.length) {
                await tx.insert(table.difficulty).values(data.difficulty as typeof table.difficulty.$inferInsert[]);
            }
            if (data.difficultyToRecipe?.length) {
                await tx.insert(table.difficultyToRecipe).values(data.difficultyToRecipe as typeof table.difficultyToRecipe.$inferInsert[]);
            }
            if (data.ingredients?.length) {
                await tx.insert(table.ingredients).values(data.ingredients as typeof table.ingredients.$inferInsert[]);
            }
            if (data.steps?.length) {
                await tx.insert(table.steps).values(data.steps as typeof table.steps.$inferInsert[]);
            }
            if (data.tags?.length) {
                await tx.insert(table.tags).values(data.tags as typeof table.tags.$inferInsert[]);
            }
            if (data.tips?.length) {
                await tx.insert(table.tips).values(data.tips as typeof table.tips.$inferInsert[]);
            }
            if (data.favorite?.length) {
                await tx.insert(table.favorite).values(data.favorite as typeof table.favorite.$inferInsert[]);
            }
            if (data.recipeRating?.length) {
                await tx.insert(table.recipeRating).values(data.recipeRating as typeof table.recipeRating.$inferInsert[]);
            }
            if (data.collections?.length) {
                await tx.insert(table.collections).values(data.collections as typeof table.collections.$inferInsert[]);
            }
            if (data.collectionToRecipe?.length) {
                await tx.insert(table.collectionToRecipe).values(data.collectionToRecipe as typeof table.collectionToRecipe.$inferInsert[]);
            }
            if (data.mealPlan?.length) {
                await tx.insert(table.mealPlan).values(data.mealPlan as typeof table.mealPlan.$inferInsert[]);
            }
            if (data.shoppingListItems?.length) {
                await tx.insert(table.shoppingListItems).values(data.shoppingListItems as typeof table.shoppingListItems.$inferInsert[]);
            }
            if (data.shoppingListShares?.length) {
                await tx.insert(table.shoppingListShares).values(data.shoppingListShares as typeof table.shoppingListShares.$inferInsert[]);
            }
            // Restart sequences transactionally so a failed restore keeps the previous counters.
            const serialTables = [
                'site_settings', 'recipes', 'difficulty', 'ingredients', 'steps',
                'favorite', 'tags', 'tips', 'recipe_rating', 'collections', 'collection_to_recipe',
                'meal_plan', 'shopping_list_items', 'cook_history'
            ];
            for (const tableName of serialTables) {
                await tx.execute(sql.raw(
                    `DO $restore$
                    DECLARE
                        sequence_name regclass := pg_get_serial_sequence('${tableName}', 'id');
                        next_id bigint;
                    BEGIN
                        SELECT COALESCE(MAX(id), 0)::bigint + 1 INTO next_id FROM "${tableName}";
                        EXECUTE format('ALTER SEQUENCE %s RESTART WITH %s', sequence_name, next_id);
                    END;
                    $restore$;`
                ));
            }
            uploadRestore.replace();
        });
        committed = true;
        return json({success: true});
    } catch (e) {
        console.error('Import failed:', e);
        throw error(500, 'Failed to import backup');
    } finally {
        if (staged) {
            try {
                if (!committed) staged.rollback();
                staged.cleanup();
            } catch (e) {
                // Leave the recovery directory in place if restoring the old files fails.
                console.error('Could not clean up restored uploads:', e);
            }
        }
        restoreInProgress = false;
    }
};
