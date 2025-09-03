import {integer, pgTable, primaryKey, serial, text, timestamp} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id').notNull().references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull()
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
    userId: text('user_id').notNull().references(() => user.id)
});

export const difficulty = pgTable('difficulty', {
    id: serial('id').primaryKey().notNull(),
    difficulty: text('difficulty', {enum: ['easy', 'medium', 'hard']}).notNull(),
})

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
})

export const steps = pgTable('steps', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipes.id),
    step: text('step').notNull(),
    number: integer('number').notNull(),
})

export type Session = typeof session.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type Step = typeof steps.$inferSelect;
export type User = typeof user.$inferSelect;
export type Difficulty = typeof difficulty.$inferSelect;
export type DifficultyToRecipe = typeof difficultyToRecipe.$inferSelect;
