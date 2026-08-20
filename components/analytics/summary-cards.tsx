import { formatCurrency } from '@/lib/format'
import { pctChange, type Totals } from '@/lib/analytics'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

function ChangeBadge({
  value,
  goodWhenUp = true,
}: {
  value: number | null
  goodWhenUp?: boolean
}) {
  if (value == null) {
    return (
      <span className="text-xs text-muted-foreground">no prior period</span>
    )
  }
  const rounded = Math.round(value)
  const up = value > 0
  const flat = rounded === 0
  const good = flat ? true : up === goodWhenUp
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        flat
          ? 'text-muted-foreground'
          : good
            ? 'text-positive'
            : 'text-negative'
      }`}
    >
      <Icon className="size-3" />
      {up ? '+' : ''}
      {rounded}% vs prev
    </span>
  )
}

export function SummaryCards({
  totals,
  prev,
}: {
  totals: Totals
  prev: Totals
}) {
  const cards = [
    {
      label: 'Total Income',
      value: formatCurrency(totals.income),
      change: pctChange(totals.income, prev.income),
      goodWhenUp: true,
      valueClass: 'text-foreground',
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(totals.expenses),
      change: pctChange(totals.expenses, prev.expenses),
      goodWhenUp: false,
      valueClass: 'text-foreground',
    },
    {
      label: 'Net Income',
      value: formatCurrency(totals.net),
      change: pctChange(totals.net, prev.net),
      goodWhenUp: true,
      valueClass: totals.net < 0 ? 'text-negative' : 'text-positive',
    },
    {
      label: 'Savings Rate',
      value: `${Math.round(totals.savingsRate)}%`,
      change: pctChange(totals.savingsRate, prev.savingsRate),
      goodWhenUp: true,
      valueClass: totals.savingsRate < 0 ? 'text-negative' : 'text-foreground',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {c.label}
          </p>
          <p
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${c.valueClass}`}
          >
            {c.value}
          </p>
          <div className="mt-1.5">
            <ChangeBadge value={c.change} goodWhenUp={c.goodWhenUp} />
          </div>
        </div>
      ))}
    </div>
  )
}
