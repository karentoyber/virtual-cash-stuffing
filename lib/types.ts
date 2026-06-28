import type {
  accounts,
  transactions,
  recurring,
  buckets,
} from '@/lib/db/schema'

export type Account = typeof accounts.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type Recurring = typeof recurring.$inferSelect
export type Bucket = typeof buckets.$inferSelect
