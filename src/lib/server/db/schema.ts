import {integer, pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core';
import {primaryKey} from "drizzle-orm/pg-core/primary-keys";

export const user = pgTable('user', {
    id: text('id').primaryKey(),
    age: integer('age'),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', {withTimezone: true}).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).defaultNow().notNull(),
});

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    expiresAt: timestamp('expires_at', {withTimezone: true, mode: 'date'}).notNull()
});

export const recipe = pgTable('recipe', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    title: text('title').notNull(),
    description: text('description').notNull(),
    imageUrl: text('image_url').notNull(),
    prepTime: integer('prep_time'), // in minutes
    cookTime: integer('cook_time'), // in minutes
    servings: integer('servings'),
    status: text('status').default('draft').notNull(), // 'draft' or 'published'
    createdAt: timestamp('created_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow()
});

export const saved_recipes = pgTable('saved_recipes', {
        userId: text('user_id').notNull().references(() => user.id),
        recipeId: integer('recipe_id').notNull().references(() => recipe.id),
        createdAt: timestamp('created_at', {withTimezone: true, mode: 'date'}).notNull().defaultNow()
    },
    (table) => [
        primaryKey({columns: [table.userId, table.recipeId]})
    ]
);

export const ingredients = pgTable('ingredients', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipe.id),
    name: text('name').notNull(),
    quantity: text('quantity').notNull()
});

export const instructions = pgTable('instructions', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipe.id),
    instruction: text('instruction').notNull()
});

export const category = pgTable('category', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
});

export const recipeCategory = pgTable('recipe_category', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipe.id),
    categoryId: integer('category_id').notNull().references(() => category.id),
});

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Recipe = typeof recipe.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type Instructions = typeof instructions.$inferSelect;
export type Category = typeof category.$inferSelect;
export type RecipeCategory = typeof recipeCategory.$inferSelect;
export type SavedRecipe = typeof saved_recipes.$inferSelect;