'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/format'
import type { CategoryTotal } from '@/lib/analytics'
import { Section } from './section'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

type SortKey = 'category' | 'amount' | 'pct' | 'previous' | 'change'

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'category', label: 'Category', numeric: false },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'pct', label: '% of Total', numeric: true },
  { key: 'previous', label: 'Previous', numeric: true },
  { key: 'change', label: 'Change %', numeric: true },
]

export function FinancialBreakdown({ data }: { data: CategoryTotal[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')

  const toggle = (key: SortKey) => {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDir(key === 'category' ? 'asc' : 'desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    let cmp: number
    if (sortKey === 'category') {
      cmp = a.category.localeCompare(b.category)
    } else if (sortKey === 'change') {
      cmp = (a.change ?? -Infinity) - (b.change ?? -Infinity)
    } else {
      cmp = (a[sortKey] as number) - (b[sortKey] as number)
    }
    return dir === 'asc' ? cmp : -cmp
  })

  return (
    <Section
      title="Financial Breakdown"
      description="Spending by category vs the previous period"
    >
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No spending to break down.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                {COLUMNS.map((col) => {
                  const active = sortKey === col.key
                  const Icon = !active
                    ? ChevronsUpDown
                    : dir === 'asc'
                      ? ArrowUp
                      : ArrowDown
                  return (
                    <th
                      key={col.key}
                      className={`py-2 font-medium ${col.numeric ? 'text-right' : 'text-left'}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-foreground ${
                          col.numeric ? 'flex-row-reverse' : ''
                        } ${active ? 'text-foreground' : ''}`}
                      >
                        <Icon className="size-3" />
                        {col.label}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.category}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="py-2 pr-2 text-foreground">{row.category}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-foreground">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {Math.round(row.pct)}%
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">
                    {formatCurrency(row.previous)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.change == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={
                          row.change > 0
                            ? 'text-negative'
                            : row.change < 0
                              ? 'text-positive'
                              : 'text-muted-foreground'
                        }
                      >
                        {row.change > 0 ? '+' : ''}
                        {Math.round(row.change)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}
