import {integer, pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
    id: text('id').primaryKey(),
    age: integer('age'),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull()
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
});

export const ingredient = pgTable('ingredient', {
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

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Recipe = typeof recipe.$inferSelect;
export type Ingredient = typeof ingredient.$inferSelect;
export type Instructions = typeof instructions.$inferSelect;