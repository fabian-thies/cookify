import {integer, pgTable, serial, text, timestamp} from 'drizzle-orm/pg-core';

// User Table
export const userTable = pgTable('user', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', {
        withTimezone: true,
        mode: 'date'
    }).defaultNow().notNull()
});

// Session Table
export const sessionTable = pgTable('session', {
    token: text('session_token').notNull().unique().primaryKey(),
    userId: integer('user_id')
        .notNull()
        .references(() => userTable.id),
    expiresAt: timestamp('expires_at', {
        withTimezone: true,
        mode: 'date'
    }).notNull()
});

// Role Table
export const roleTable = pgTable('role', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at', {
        withTimezone: true,
        mode: 'date'
    }).notNull()
});

// User-Role Linking Table
export const userRoleTable = pgTable('user_role', {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
        .notNull()
        .references(() => userTable.id),
    roleId: integer('role_id')
        .notNull()
        .references(() => roleTable.id)
});

// Permission Table
export const permissionTable = pgTable('permission', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at', {
        withTimezone: true,
        mode: 'date'
    }).notNull()
});

// Role-Permission Linking Table
export const rolePermissionTable = pgTable('role_permission', {
    id: serial('id').primaryKey(),
    roleId: integer('role_id')
        .notNull()
        .references(() => roleTable.id),
    permissionId: integer('permission_id')
        .notNull()
        .references(() => permissionTable.id)
});

// Audit Log Table
// export const auditLogTable = pgTable('audit_log', {
//     id: serial('id').primaryKey(),
//     userId: integer('user_id').references(() => userTable.id),
//     action: text('action').notNull(),
//     details: text('details'),
//     createdAt: timestamp('created_at', {
//         withTimezone: true,
//         mode: 'date'
//     }).notNull()
// });
