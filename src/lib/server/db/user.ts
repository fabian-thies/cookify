import {getDb} from "$lib/server/db/index";
import {eq, inArray} from "drizzle-orm";
import {
    collectionToRecipe,
    collections,
    favorite,
    recipeRating,
    recipes,
    session,
    user
} from "$lib/server/db/schema";
import type {UserLanguage} from "$lib/types/languages";
import {deleteRecipe} from "$lib/server/db/recipe";

export async function saveProfile(userId: string, username: string, email: string, avatar: string, language: UserLanguage) {
    const db = getDb();
    return db.update(user)
        .set({username, email, avatar, language})
        .where(eq(user.id, userId));
}

export async function updatePassword(userId: string, passwordHash: string) {
    const db = getDb();
    return db.update(user)
        .set({passwordHash})
        .where(eq(user.id, userId));
}

export async function getUsers() {
    const db = getDb();

    return db.select(
        {
            id: user.id,
            email: user.email,
            age: user.age,
            username: user.username,
            administrator: user.administrator,
            avatar: user.avatar,
            language: user.language
        }
    ).from(user);
}

export async function updateUserEmail(userId: string, email: string) {
    const db = getDb();

    return db.update(user)
        .set({email})
        .where(eq(user.id, userId));
}

export async function deleteUserAccount(userId: string) {
    const db = getDb();

    const userRecipes = await db.select({id: recipes.id}).from(recipes).where(eq(recipes.userId, userId));
    for (const {id} of userRecipes) {
        await deleteRecipe(userId, id);
    }

    const userCollections = await db.select({id: collections.id}).from(collections).where(eq(collections.userId, userId));
    const collectionIds = userCollections.map((collection) => collection.id);
    if (collectionIds.length > 0) {
        await db.delete(collectionToRecipe).where(inArray(collectionToRecipe.collectionId, collectionIds));
        await db.delete(collections).where(inArray(collections.id, collectionIds));
    }

    await db.delete(recipeRating).where(eq(recipeRating.userId, userId));
    await db.delete(favorite).where(eq(favorite.userId, userId));
    await db.delete(session).where(eq(session.userId, userId));

    return db.delete(user).where(eq(user.id, userId));
}
