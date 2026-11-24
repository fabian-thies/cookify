import {getDb} from "$lib/server/db/index";
import {eq, inArray} from "drizzle-orm";
import {
    collectionToRecipe,
    collections,
    cookHistory,
    difficultyToRecipe,
    favorite,
    ingredients,
    mealPlan,
    passkey,
    recipeRating,
    recipes,
    session,
    shoppingListItems,
    steps,
    tags,
    tips,
    user
} from "$lib/server/db/schema";
import type {UserLanguage} from "$lib/types/languages";

export async function saveProfile(userId: string, username: string, email: string, avatar: string, language: UserLanguage) {
    const db = getDb();
    return db.update(user)
        .set({username, email, avatar, language})
        .where(eq(user.id, userId));
}

export async function getUserPasswordHash(userId: string): Promise<string | null> {
    const db = getDb();
    const rows = await db
        .select({passwordHash: user.passwordHash})
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

    return rows[0]?.passwordHash ?? null;
}

export async function updatePassword(userId: string, passwordHash: string) {
    const db = getDb();
    return await db.transaction(async (tx) => {
        const result = await tx.update(user)
            .set({passwordHash})
            .where(eq(user.id, userId));
        await tx.delete(session).where(eq(session.userId, userId));
        return result;
    });
}

export async function getUsers() {
    const db = getDb();

    return await db.select(
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

export type PublicUserProfile = {
    id: string;
    username: string;
    avatar: string | null;
};

export async function getUserById(userId: string): Promise<PublicUserProfile | null> {
    const db = getDb();

    const rows = await db.select(
        {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
        }
    ).from(user).where(eq(user.id, userId)).limit(1);

    return rows[0] ?? null;
}

export async function updateUserEmail(userId: string, email: string) {
    const db = getDb();

    return db.update(user)
        .set({email})
        .where(eq(user.id, userId));
}

export async function deleteUserAccount(userId: string) {
    const db = getDb();

    return await db.transaction(async (tx) => {
        const userRecipes = await tx.select({id: recipes.id}).from(recipes).where(eq(recipes.userId, userId));
        const recipeIds = userRecipes.map((recipe) => recipe.id);
        if (recipeIds.length > 0) {
            await tx.delete(mealPlan).where(inArray(mealPlan.recipeId, recipeIds));
            await tx.delete(favorite).where(inArray(favorite.recipeId, recipeIds));
            await tx.delete(recipeRating).where(inArray(recipeRating.recipeId, recipeIds));
            await tx.delete(cookHistory).where(inArray(cookHistory.recipeId, recipeIds));
            await tx.delete(collectionToRecipe).where(inArray(collectionToRecipe.recipeId, recipeIds));
            await tx.delete(difficultyToRecipe).where(inArray(difficultyToRecipe.recipeId, recipeIds));
            await tx.delete(ingredients).where(inArray(ingredients.recipeId, recipeIds));
            await tx.delete(steps).where(inArray(steps.recipeId, recipeIds));
            await tx.delete(tags).where(inArray(tags.recipeId, recipeIds));
            await tx.delete(tips).where(inArray(tips.recipeId, recipeIds));
            await tx.delete(recipes).where(inArray(recipes.id, recipeIds));
        }

        const userCollections = await tx.select({id: collections.id}).from(collections).where(eq(collections.userId, userId));
        const collectionIds = userCollections.map((collection) => collection.id);
        if (collectionIds.length > 0) {
            await tx.delete(collectionToRecipe).where(inArray(collectionToRecipe.collectionId, collectionIds));
            await tx.delete(collections).where(inArray(collections.id, collectionIds));
        }

        await tx.delete(recipeRating).where(eq(recipeRating.userId, userId));
        await tx.delete(cookHistory).where(eq(cookHistory.userId, userId));
        await tx.delete(favorite).where(eq(favorite.userId, userId));
        await tx.delete(passkey).where(eq(passkey.userId, userId));
        await tx.delete(mealPlan).where(eq(mealPlan.userId, userId));
        await tx.delete(shoppingListItems).where(eq(shoppingListItems.userId, userId));
        await tx.delete(session).where(eq(session.userId, userId));

        return tx.delete(user).where(eq(user.id, userId));
    });
}

export async function getLocaleByUserId(userId: string) {
    const db = getDb();

    const rows = await db.select({language: user.language}).from(user).where(eq(user.id, userId)).limit(1);

    return rows[0]?.language ?? "en";
}
