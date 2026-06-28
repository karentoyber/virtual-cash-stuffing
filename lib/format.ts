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
