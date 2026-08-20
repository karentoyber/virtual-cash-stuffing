'use client'

import { formatCurrency } from '@/lib/format'
import type { CategoryTotal } from '@/lib/analytics'
import { Section, colorForIndex } from './section'

export function IncomeBreakdown({
  data,
  onSelect,
}: {
  data: CategoryTotal[]
  onSelect: (category: string) => void
}) {
  const total = data.reduce((s, d) => s + d.amount, 0)

  return (
    <Section
      title="Income Breakdown"
      description="Income grouped by source"
    >
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No income in this period.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((d, i) => (
            <li key={d.category}>
              <button
                type="button"
                onClick={() => onSelect(d.category)}
                className="w-full text-left"
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorForIndex(i) }}
                    />
                    {d.category}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-foreground">
                    {formatCurrency(d.amount)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {Math.round(d.pct)}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.pct}%`,
                      backgroundColor: colorForIndex(i),
                    }}
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
