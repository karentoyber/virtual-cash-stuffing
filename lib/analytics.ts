import type { Account, Transaction } from '@/lib/types'
import { formatDate } from '@/lib/format'

export type AnalyticsView = 'weekly' | 'monthly' | 'yearly'

export const VIEW_LABEL: Record<AnalyticsView, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export interface PeriodRange {
  start: Date
  end: Date // exclusive
  label: string
}

// Resolve the [start, end) window for a view, offset from the current period.
// Weeks run Sunday -> Sunday.
export function getPeriodRange(
  view: AnalyticsView,
  offset: number,
  now = new Date(),
): PeriodRange {
  if (view === 'weekly') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - start.getDay() + offset * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const lastDay = new Date(end)
    lastDay.setDate(lastDay.getDate() - 1)
    return { start, end, label: `${formatDate(start)} – ${formatDate(lastDay)}` }
  }
  if (view === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
    return {
      start,
      end,
      label: start.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    }
  }
  const start = new Date(now.getFullYear() + offset, 0, 1)
  const end = new Date(start.getFullYear() + 1, 0, 1)
  return { start, end, label: String(start.getFullYear()) }
}

export interface Bucket {
  label: string
  start: Date
  end: Date // exclusive
}

// Sub-buckets for the income-vs-expenses time series.
// weekly -> days, monthly -> weeks, yearly -> months.
export function getBuckets(view: AnalyticsView, range: PeriodRange): Bucket[] {
  if (view === 'weekly') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return Array.from({ length: 7 }, (_, i) => {
      const start = new Date(range.start)
      start.setDate(start.getDate() + i)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { label: days[i], start, end }
    })
  }
  if (view === 'monthly') {
    const buckets: Bucket[] = []
    let cursor = new Date(range.start)
    let wk = 1
    while (cursor < range.end) {
      const start = new Date(cursor)
      // Advance to the next Sunday (or the month end, whichever comes first).
      const next = new Date(start)
      next.setDate(next.getDate() + (7 - next.getDay()))
      const end = next < range.end ? next : range.end
      buckets.push({ label: `Wk ${wk}`, start, end })
      cursor = end
      wk += 1
    }
    return buckets
  }
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(range.start.getFullYear(), i, 1)
    const end = new Date(range.start.getFullYear(), i + 1, 1)
    return { label: months[i], start, end }
  })
}

export function txDate(t: Transaction): Date {
  return typeof t.date === 'string' ? new Date(t.date) : t.date
}

export function inRange(t: Transaction, range: PeriodRange): boolean {
  const d = txDate(t)
  return d >= range.start && d < range.end
}

export function isCreditCard(account: Account | undefined): boolean {
  return account?.category === 'Credit Cards'
}

// A transaction on a credit-card account named/categorized "Interest".
export function isInterestTx(
  t: Transaction,
  accountById: Map<number, Account>,
): boolean {
  if (t.type !== 'outflow') return false
  if (!isCreditCard(accountById.get(t.accountId))) return false
  const label = (t.category ?? t.description ?? '').trim().toLowerCase()
  return label === 'interest'
}

export interface Totals {
  income: number
  expenses: number
  net: number
  savingsRate: number
}

export function computeTotals(transactions: Transaction[]): Totals {
  let income = 0
  let expenses = 0
  for (const t of transactions) {
    const amt = Number(t.amount)
    if (t.type === 'inflow') income += amt
    else if (t.type === 'outflow') expenses += amt
  }
  const net = income - expenses
  const savingsRate = income > 0 ? (net / income) * 100 : 0
  return { income, expenses, net, savingsRate }
}

// Percentage change from previous -> current. Returns null when there is no
// meaningful baseline (previous is zero).
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export interface CategoryTotal {
  category: string
  amount: number
  pct: number
  previous: number
  change: number | null
}

// Aggregate transactions of a given type by category, with current + previous
// period comparison. Used for spending, income, and the financial breakdown.
export function aggregateByCategory(
  current: Transaction[],
  previous: Transaction[],
  type: 'inflow' | 'outflow',
): CategoryTotal[] {
  const cur = new Map<string, number>()
  const prev = new Map<string, number>()
  let total = 0
  for (const t of current) {
    if (t.type !== type) continue
    const cat = (t.category ?? 'Uncategorized').trim() || 'Uncategorized'
    const amt = Number(t.amount)
    cur.set(cat, (cur.get(cat) ?? 0) + amt)
    total += amt
  }
  for (const t of previous) {
    if (t.type !== type) continue
    const cat = (t.category ?? 'Uncategorized').trim() || 'Uncategorized'
    prev.set(cat, (prev.get(cat) ?? 0) + Number(t.amount))
  }
  const rows: CategoryTotal[] = []
  const cats = new Set([...cur.keys(), ...prev.keys()])
  for (const cat of cats) {
    const amount = cur.get(cat) ?? 0
    const previousAmt = prev.get(cat) ?? 0
    rows.push({
      category: cat,
      amount,
      pct: total > 0 ? (amount / total) * 100 : 0,
      previous: previousAmt,
      change: pctChange(amount, previousAmt),
    })
  }
  return rows.sort((a, b) => b.amount - a.amount)
}
