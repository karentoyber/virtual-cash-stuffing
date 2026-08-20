'use client'

import { Cell, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { formatCurrency } from '@/lib/format'
import type { CategoryTotal } from '@/lib/analytics'
import { Section, CurrencyTooltip, colorForIndex } from './section'

export function SpendingByCategory({
  data,
  selected,
  onSelect,
}: {
  data: CategoryTotal[]
  selected: string | null
  onSelect: (category: string) => void
}) {
  const total = data.reduce((s, d) => s + d.amount, 0)

  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.category, { label: d.category, color: colorForIndex(i) }]),
  )

  return (
    <Section
      title="Spending by Category"
      description="Click a category to filter the details below"
    >
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No spending in this period.
        </p>
      ) : (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ChartContainer
            config={config}
            className="mx-auto aspect-square h-44 w-44 shrink-0"
          >
            <PieChart>
              <ChartTooltip content={<CurrencyTooltip />} />
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={2}
              >
                {data.map((d, i) => (
                  <Cell
                    key={d.category}
                    fill={colorForIndex(i)}
                    opacity={selected && selected !== d.category ? 0.35 : 1}
                    className="cursor-pointer outline-none"
                    onClick={() => onSelect(d.category)}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          <ul className="flex flex-1 flex-col gap-1.5">
            {data.map((d, i) => {
              const active = selected === d.category
              return (
                <li key={d.category}>
                  <button
                    type="button"
                    onClick={() => onSelect(d.category)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary ${
                      active ? 'bg-secondary' : ''
                    }`}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorForIndex(i) }}
                    />
                    <span className="flex-1 truncate text-sm text-foreground">
                      {d.category}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {Math.round(d.pct)}%
                    </span>
                    <span className="w-20 text-right font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(d.amount)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Section>
  )
}
