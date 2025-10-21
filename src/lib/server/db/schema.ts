import {integer, boolean, pgTable, primaryKey, serial, text, timestamp, unique} from 'drizzle-orm/pg-core';
import {DIFFICULTIES, LANGUAGES} from "../../constants";

export const user = pgTable('user', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    age: integer('age'),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    avatar: text('avatar'),
    language: text('language', {enum: [...LANGUAGES]}).notNull().default(LANGUAGES[0]),
});

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    expiresAt: timestamp('expires_at', {withTimezone: true, mode: 'date'}).notNull()
});

export const recipes = pgTable('recipes', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    image: text('image').notNull(),
    createdAt: timestamp('created_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow(),
    cookingTime: integer('cooking_time').notNull(),
    servings: integer('servings').notNull(),
    userId: text('user_id').notNull().references(() => user.id),
    viewCount: integer('view_count').notNull().default(0)
});

export const difficulty = pgTable('difficulty', {
    id: serial('id').primaryKey().notNull(),
    difficulty: text('difficulty', {enum: [...DIFFICULTIES]}).notNull().default(DIFFICULTIES[0]),
});

export const difficultyToRecipe = pgTable('difficulty_to_recipe', {
    difficultyId: integer('difficulty_id').notNull().references(() => difficulty.id),
    recipeId: integer('recipe_id').notNull().references(() => recipes.id),
}, (table) => [
    primaryKey({columns: [table.difficultyId, table.recipeId]})
]);

export const ingredients = pgTable('ingredients', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipes.id),
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),
    unit: text('unit').notNull(),
});

export const steps = pgTable('steps', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipes.id),
    step: text('step').notNull(),
    number: integer('number').notNull(),
});

export const favorite = pgTable('favorite', {
        id: serial('id').primaryKey(),
        recipeId: integer('recipe_id').notNull().references(() => recipes.id),
        userId: text('user_id').notNull().references(() => user.id),
        favorite: boolean('favorite').notNull().default(false),
    }, (t) => [
        unique('favorite_recipe_user_unique').on(t.recipeId, t.userId),
    ]
);

export const tags = pgTable('tags', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipes.id),
    name: text('name').notNull(),
});

export const recipeRating = pgTable('recipe_rating', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipes.id),
    userId: text('user_id').notNull().references(() => user.id),
    rating: integer('rating').notNull(),
    createdAt: timestamp('created_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow(),
}, (t) => [
    unique('recipe_rating_recipe_user_unique').on(t.recipeId, t.userId),
]);

export const collections = pgTable('collections', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    title: text('title').notNull()
});

export const collectionToRecipe = pgTable('collection_to_recipe', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipes.id),
    collectionId: integer('collection_id').notNull().references(() => collections.id),
})


export type Session = typeof session.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type Step = typeof steps.$inferSelect;
export type User = typeof user.$inferSelect;
export type PublicUser = Omit<User, 'passwordHash'>;
export type Difficulty = typeof difficulty.$inferSelect;
export type DifficultyToRecipe = typeof difficultyToRecipe.$inferSelect;
export type Favorite = typeof favorite.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type RecipeRating = typeof recipeRating.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type CollectionToRecipe = typeof collectionToRecipe.$inferSelect;
