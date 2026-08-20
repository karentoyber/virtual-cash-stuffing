'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  accounts,
  transactions,
  recurring,
  buckets,
  budgets,
  contributions,
} from '@/lib/db/schema'
import { and, asc, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

/* ----------------------------- Accounts ----------------------------- */

export async function getAccounts() {
  const userId = await getUserId()
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.sortOrder), asc(accounts.id))
}

export async function createAccount(input: {
  name: string
  category: string
  kind: string
  balance: number
  creditLimit?: number | null
  rewardTags?: string | null
  paymentDueDay?: number | null
}) {
  const userId = await getUserId()
  await db.insert(accounts).values({
    userId,
    name: input.name,
    category: input.category,
    kind: input.kind,
    balance: input.balance.toFixed(2),
    creditLimit:
      input.creditLimit != null ? input.creditLimit.toFixed(2) : null,
    rewardTags: input.rewardTags ?? null,
    paymentDueDay: input.paymentDueDay ?? null,
  })
  revalidatePath('/')
}

export async function updateAccount(
  id: number,
  input: {
    name: string
    category: string
    kind: string
    balance: number
    creditLimit?: number | null
    rewardTags?: string | null
    paymentDueDay?: number | null
  },
) {
  const userId = await getUserId()
  await db
    .update(accounts)
    .set({
      name: input.name,
      category: input.category,
      kind: input.kind,
      balance: input.balance.toFixed(2),
      creditLimit:
        input.creditLimit != null ? input.creditLimit.toFixed(2) : null,
      rewardTags: input.rewardTags ?? null,
      paymentDueDay: input.paymentDueDay ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
  revalidatePath('/')
}

export async function deleteAccount(id: number) {
  const userId = await getUserId()
  await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
  revalidatePath('/')
}

/* --------------------------- Transactions --------------------------- */

export async function getTransactions(limit = 50) {
  const userId = await getUserId()
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit)
}

export async function createTransaction(input: {
  accountId: number
  toAccountId?: number | null
  type: 'inflow' | 'outflow' | 'transfer'
  amount: number
  category?: string | null
  description?: string | null
  date?: string | null
}) {
  const userId = await getUserId()

  // Verify the source account belongs to the user.
  const [src] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, userId)))
  if (!src) throw new Error('Account not found')

  await db.insert(transactions).values({
    userId,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    type: input.type,
    amount: input.amount.toFixed(2),
    category: input.category ?? null,
    description: input.description ?? null,
    date: input.date ? new Date(input.date) : new Date(),
  })

  await applyToBalances({
    userId,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    type: input.type,
    amount: input.amount,
  })

  revalidatePath('/')
}

export async function deleteTransaction(id: number) {
  const userId = await getUserId()
  const [tx] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
  if (!tx) return

  // Reverse the balance effect.
  await applyToBalances({
    userId,
    accountId: tx.accountId,
    toAccountId: tx.toAccountId,
    type: tx.type as 'inflow' | 'outflow' | 'transfer',
    amount: -Number(tx.amount),
  })

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
  revalidatePath('/')
}

// Adjust account balances for a transaction. `amount` may be negative to
// reverse a previously applied transaction.
async function applyToBalances({
  userId,
  accountId,
  toAccountId,
  type,
  amount,
}: {
  userId: string
  accountId: number
  toAccountId: number | null
  type: 'inflow' | 'outflow' | 'transfer'
  amount: number
}) {
  // `signedFlow` is money movement from the account's perspective:
  //   > 0 = money flows INTO the account
  //   < 0 = money flows OUT of the account
  // For an asset the stored balance moves with the flow. For a liability
  // (e.g. a credit card) the stored balance is the amount owed, so it moves
  // opposite to the flow: money in pays down what's owed, money out (a charge)
  // increases it.
  const applyFlow = async (id: number, signedFlow: number) => {
    const [acc] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    if (!acc) return
    const effect = acc.kind === 'liability' ? -signedFlow : signedFlow
    const next = Number(acc.balance) + effect
    await db
      .update(accounts)
      .set({ balance: next.toFixed(2), updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
  }

  if (type === 'inflow') {
    // Income / refund: money into the account.
    await applyFlow(accountId, amount)
  } else if (type === 'outflow') {
    // Expense: money out of the account.
    await applyFlow(accountId, -amount)
  } else if (type === 'transfer' && toAccountId) {
    // Money leaves the source and arrives at the destination. A transfer from
    // checking to a credit card lowers the checking balance and pays down the
    // card's owed balance.
    await applyFlow(accountId, -amount)
    await applyFlow(toAccountId, amount)
  }
}

/* ---------------------------- Recurring ----------------------------- */

export async function getRecurring() {
  const userId = await getUserId()
  return db
    .select()
    .from(recurring)
    .where(eq(recurring.userId, userId))
    .orderBy(asc(recurring.nextRun))
}

export async function createRecurring(input: {
  accountId: number
  toAccountId?: number | null
  type: 'inflow' | 'outflow' | 'transfer'
  amount: number
  label: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  nextRun: string
}) {
  const userId = await getUserId()
  await db.insert(recurring).values({
    userId,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    type: input.type,
    amount: input.amount.toFixed(2),
    label: input.label,
    frequency: input.frequency,
    nextRun: new Date(input.nextRun),
  })
  revalidatePath('/')
}

export async function toggleRecurring(id: number, active: boolean) {
  const userId = await getUserId()
  await db
    .update(recurring)
    .set({ active })
    .where(and(eq(recurring.id, id), eq(recurring.userId, userId)))
  revalidatePath('/')
}

export async function deleteRecurring(id: number) {
  const userId = await getUserId()
  await db
    .delete(recurring)
    .where(and(eq(recurring.id, id), eq(recurring.userId, userId)))
  revalidatePath('/')
}

/* ------------------------------ Buckets ----------------------------- */

export async function getBuckets() {
  const userId = await getUserId()
  return db
    .select()
    .from(buckets)
    .where(eq(buckets.userId, userId))
    .orderBy(asc(buckets.id))
}

export async function createBucket(input: {
  name: string
  target: number
  accountId?: number | null
  color?: string | null
}) {
  const userId = await getUserId()
  await db.insert(buckets).values({
    userId,
    name: input.name,
    accountId: input.accountId ?? null,
    target: input.target.toFixed(2),
    color: input.color ?? null,
  })
  revalidatePath('/')
}

// Reserve (or release) cash within the envelope. This does NOT move money out
// of the funding account — the cash stays in the account and is only visually
// pooled/earmarked so the user knows not to spend it. A positive `delta`
// stuffs more cash into the envelope; a negative `delta` releases it back.
// Net worth is unchanged because the money never left the account.
export async function stuffBucket(id: number, delta: number) {
  const userId = await getUserId()
  const [b] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.userId, userId)))
  if (!b) return

  // Clamp so we never release more than is currently reserved.
  const current = Number(b.saved)
  const applied = delta < 0 ? Math.max(delta, -current) : delta
  const next = current + applied

  await db
    .update(buckets)
    .set({ saved: next.toFixed(2) })
    .where(and(eq(buckets.id, id), eq(buckets.userId, userId)))

  revalidatePath('/')
}

export async function deleteBucket(id: number) {
  const userId = await getUserId()
  // Deleting an envelope simply un-reserves the cash; the money was always in
  // the funding account, so balances and net worth are unaffected.
  await db
    .delete(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.userId, userId)))
  revalidatePath('/')
}

/* --------------------------- Contributions -------------------------- */

export async function getContributions(accountId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(contributions)
    .where(
      and(
        eq(contributions.accountId, accountId),
        eq(contributions.userId, userId),
      ),
    )
    .orderBy(asc(contributions.year))
}

// Replace all yearly contributions for an account and keep the account's
// balance in sync with the running total. Called when the tracker closes.
export async function saveContributions(
  accountId: number,
  entries: { year: number; amount: number }[],
) {
  const userId = await getUserId()

  // Verify the account belongs to the user.
  const [acc] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
  if (!acc) throw new Error('Account not found')

  // Keep only valid, positive-year entries and de-dupe by year (last wins).
  const byYear = new Map<number, number>()
  for (const e of entries) {
    if (!Number.isFinite(e.year) || e.year < 1900) continue
    const amount = Number.isFinite(e.amount) && e.amount > 0 ? e.amount : 0
    byYear.set(Math.floor(e.year), amount)
  }

  // Simplest reliable sync: clear existing rows, then insert the current set.
  await db
    .delete(contributions)
    .where(
      and(
        eq(contributions.accountId, accountId),
        eq(contributions.userId, userId),
      ),
    )

  let total = 0
  if (byYear.size > 0) {
    const rows = Array.from(byYear.entries()).map(([year, amount]) => {
      total += amount
      return {
        userId,
        accountId,
        year,
        amount: amount.toFixed(2),
      }
    })
    await db.insert(contributions).values(rows)
  }

  // Sync the account balance to the total contributed.
  await db
    .update(accounts)
    .set({ balance: total.toFixed(2), updatedAt: new Date() })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))

  revalidatePath('/')
}

/* ------------------------------ Budgets ----------------------------- */

export async function getBudgets() {
  const userId = await getUserId()
  return db
    .select()
    .from(budgets)
    .where(eq(budgets.userId, userId))
    .orderBy(asc(budgets.id))
}

export async function createBudget(input: {
  category: string
  amount: number
  period: 'monthly' | 'weekly'
  color?: string | null
}) {
  const userId = await getUserId()
  await db.insert(budgets).values({
    userId,
    category: input.category,
    amount: input.amount.toFixed(2),
    period: input.period,
    color: input.color ?? null,
  })
  revalidatePath('/')
}

export async function updateBudget(
  id: number,
  input: {
    category: string
    amount: number
    period: 'monthly' | 'weekly'
    color?: string | null
  },
) {
  const userId = await getUserId()
  await db
    .update(budgets)
    .set({
      category: input.category,
      amount: input.amount.toFixed(2),
      period: input.period,
      color: input.color ?? null,
    })
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
  revalidatePath('/')
}

export async function deleteBudget(id: number) {
  const userId = await getUserId()
  await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
  revalidatePath('/')
}
