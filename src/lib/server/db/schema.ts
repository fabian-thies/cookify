import {integer, pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core';
import {relations} from 'drizzle-orm';

export const user = pgTable('user', {
    id: text('id').primaryKey(),
    age: integer('age'),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).defaultNow().notNull(),
});

export const userRelations = relations(user, ({many}) => ({
    recipes: many(recipe),
    sessions: many(session)
}));

export const session = pgTable('session', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id),
    expiresAt: timestamp('expires_at', {withTimezone: true, mode: 'date'}).notNull()
});

export const sessionRelations = relations(session, ({one}) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id]
    })
}));

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

export const recipeRelations = relations(recipe, ({one, many}) => ({
    user: one(user, {
        fields: [recipe.userId],
        references: [user.id]
    }),
    ingredients: many(ingredient),
    instructions: many(instructions),
    recipeCategories: many(recipeCategory)
}));

export const ingredient = pgTable('ingredient', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipe.id),
    name: text('name').notNull(),
    quantity: text('quantity').notNull()
});

export const ingredientRelations = relations(ingredient, ({one}) => ({
    recipe: one(recipe, {
        fields: [ingredient.recipeId],
        references: [recipe.id]
    })
}));

export const instructions = pgTable('instructions', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipe.id),
    instruction: text('instruction').notNull()
});

export const instructionsRelations = relations(instructions, ({one}) => ({
    recipe: one(recipe, {
        fields: [instructions.recipeId],
        references: [recipe.id]
    })
}));

export const category = pgTable('category', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
});

export const categoryRelations = relations(category, ({many}) => ({
    recipeCategories: many(recipeCategory)
}));

export const recipeCategory = pgTable('recipe_category', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull().references(() => recipe.id),
    categoryId: integer('category_id').notNull().references(() => category.id),
});

export const recipeCategoryRelations = relations(recipeCategory, ({one}) => ({
    recipe: one(recipe, {
        fields: [recipeCategory.recipeId],
        references: [recipe.id]
    }),
    category: one(category, {
        fields: [recipeCategory.categoryId],
        references: [category.id]
    })
}));

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Recipe = typeof recipe.$inferSelect;
export type Ingredient = typeof ingredient.$inferSelect;
export type Instructions = typeof instructions.$inferSelect;
export type Category = typeof category.$inferSelect;
export type RecipeCategory = typeof recipeCategory.$inferSelect;