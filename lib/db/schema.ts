import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  numeric,
} from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------

// An account / envelope. `kind` is "asset" or "liability". `category` groups
// accounts in the tracker (e.g. cash, savings, investments, credit_cards) and
// is fully customizable. `creditLimit` is only used for credit cards.
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull().default('cash'),
  kind: text('kind').notNull().default('asset'),
  balance: numeric('balance', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  creditLimit: numeric('creditLimit', { precision: 14, scale: 2 }),
  sortOrder: integer('sortOrder').notNull().default(0),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// A manual transaction. `type` is "inflow", "outflow", or "transfer".
// For transfers, toAccountId is the destination account.
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  accountId: integer('accountId').notNull(),
  toAccountId: integer('toAccountId'),
  type: text('type').notNull().default('outflow'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  category: text('category'),
  description: text('description'),
  date: timestamp('date').notNull().defaultNow(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// A recurring/scheduled transfer or transaction.
// `frequency` is "weekly", "biweekly", or "monthly".
export const recurring = pgTable('recurring', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  accountId: integer('accountId').notNull(),
  toAccountId: integer('toAccountId'),
  type: text('type').notNull().default('outflow'),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  label: text('label').notNull(),
  frequency: text('frequency').notNull().default('monthly'),
  nextRun: timestamp('nextRun').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// A savings goal / envelope bucket. `accountId` is the funding account that
// money is moved from when you "stuff cash" into the envelope (like a
// transfer), so stuffing is net-worth-neutral.
export const buckets = pgTable('buckets', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  name: text('name').notNull(),
  accountId: integer('accountId'),
  target: numeric('target', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  saved: numeric('saved', { precision: 14, scale: 2 }).notNull().default('0'),
  color: text('color'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// A spending budget for a category. `period` is "monthly" or "weekly".
// Spending is deducted live from transactions whose category matches.
export const budgets = pgTable('budgets', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 })
    .notNull()
    .default('0'),
  period: text('period').notNull().default('monthly'),
  color: text('color'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
