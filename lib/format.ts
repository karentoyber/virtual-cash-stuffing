export function formatCurrency(value: number, opts?: { compact?: boolean }) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: opts?.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts?.compact ? 1 : 2,
  }).format(value)
}

export function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Default account categories (fully customizable — users can type their own).
export const CATEGORY_PRESETS = [
  'Cash',
  'Checking',
  'Savings',
  'Investments',
  'Credit Cards',
  'Loans',
  'Property',
  'Other',
] as const

// Friendly envelope colors keyed for buckets/categories.
export const BUCKET_COLORS = [
  { name: 'Money Green', value: 'oklch(0.52 0.11 150)' },
  { name: 'Coral', value: 'oklch(0.7 0.15 40)' },
  { name: 'Mustard', value: 'oklch(0.72 0.12 85)' },
  { name: 'Teal', value: 'oklch(0.6 0.09 200)' },
  { name: 'Clay', value: 'oklch(0.55 0.08 50)' },
  { name: 'Plum', value: 'oklch(0.5 0.1 350)' },
] as const

// Common credit-card reward categories. Users can also type their own.
export const REWARD_TAG_PRESETS = [
  'Travel',
  'Dining',
  'Groceries',
  'Gas',
  'Online Shopping',
  'Streaming',
  'Transit',
  'Drugstores',
  'Flat Cashback',
] as const

// Parse a comma-separated reward tag string into a clean array.
export function parseTags(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

// Add an ordinal suffix to a day-of-month number, e.g. 1 -> "1st", 22 -> "22nd".
export function ordinal(day: number): string {
  const j = day % 10
  const k = day % 100
  if (j === 1 && k !== 11) return `${day}st`
  if (j === 2 && k !== 12) return `${day}nd`
  if (j === 3 && k !== 13) return `${day}rd`
  return `${day}th`
}

// Number of days until the next occurrence of a given day-of-month.
// Returns 0 when the due day is today.
export function daysUntilDueDay(day: number, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let due = new Date(today.getFullYear(), today.getMonth(), day)
  if (due < today) {
    // Already passed this month — roll to next month (clamped to month length).
    const nextMonth = today.getMonth() + 1
    const lastDay = new Date(today.getFullYear(), nextMonth + 1, 0).getDate()
    due = new Date(today.getFullYear(), nextMonth, Math.min(day, lastDay))
  }
  return Math.round((due.getTime() - today.getTime()) / 86400000)
}

export function frequencyLabel(freq: string) {
  switch (freq) {
    case 'weekly':
      return 'Weekly'
    case 'biweekly':
      return 'Every 2 weeks'
    case 'monthly':
      return 'Monthly'
    default:
      return freq
  }
}

// Convert a recurring item's amount into a monthly-equivalent number for
// budget projections.
export function monthlyEquivalent(amount: number, frequency: string) {
  switch (frequency) {
    case 'weekly':
      return (amount * 52) / 12
    case 'biweekly':
      return (amount * 26) / 12
    case 'monthly':
      return amount
    default:
      return amount
  }
}

export type Period = 'monthly' | 'weekly'

export const PERIOD_LABEL: Record<Period, string> = {
  monthly: 'This month',
  weekly: 'This week',
}

// Start of the current period window. Weeks start on Sunday.
export function periodStart(period: Period, now = new Date()): Date {
  if (period === 'weekly') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - d.getDay())
    return d
  }
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// Total spent (outflow) for a category within the current period window.
// Categories are matched case-insensitively.
export function spentForCategory(
  category: string,
  period: Period,
  transactions: { type: string; amount: string; category: string | null; date: Date | string }[],
  now = new Date(),
): number {
  const start = periodStart(period, now)
  const cat = category.trim().toLowerCase()
  let total = 0
  for (const t of transactions) {
    if (t.type !== 'outflow') continue
    if (!t.category || t.category.trim().toLowerCase() !== cat) continue
    const d = typeof t.date === 'string' ? new Date(t.date) : t.date
    if (d < start) continue
    total += Number(t.amount)
  }
  return total
}
