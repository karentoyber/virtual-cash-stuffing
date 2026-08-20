import type {
  accounts,
  transactions,
  recurring,
  buckets,
  budgets,
  contributions,
} from '@/lib/db/schema'

export type Account = typeof accounts.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type Recurring = typeof recurring.$inferSelect
export type Bucket = typeof buckets.$inferSelect
export type Budget = typeof budgets.$inferSelect
export type Contribution = typeof contributions.$inferSelect
