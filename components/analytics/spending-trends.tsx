'use client'

import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { formatCurrency } from '@/lib/format'
import type { CategoryTotal } from '@/lib/analytics'
import { Section, CurrencyTooltip, colorForIndex } from './section'
import { TrendingUp } from 'lucide-react'

// A row per sub-bucket with one numeric field per tracked category.
export type TrendPoint = Record<string, number | string> & { label: string }

export function SpendingTrends({
  categories,
  data,
  highlights,
}: {
  categories: string[]
  data: TrendPoint[]
  highlights: CategoryTotal[]
}) {
  const config: ChartConfig = Object.fromEntries(
    categories.map((c, i) => [c, { label: c, color: colorForIndex(i) }]),
  )
  const hasData = categories.length > 0

  return (
    <Section
      title="Spending Trends"
      description="How your biggest expense categories move over the period"
    >
      {!hasData ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Not enough spending to chart trends.
        </p>
      ) : (
        <>
          <ChartContainer config={config} className="h-56 w-full">
            <LineChart data={data} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip content={<CurrencyTooltip />} />
              <ChartLegend content={<ChartLegendContent />} />
              {categories.map((c) => (
                <Line
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stroke={`var(--color-${c})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>

          {highlights.length > 0 && (
            <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-foreground/80">
                <TrendingUp className="size-3.5" />
                Rising vs previous period
              </p>
              <ul className="flex flex-col gap-1.5">
                {highlights.map((h) => (
                  <li
                    key={h.category}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-foreground">{h.category}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono tabular-nums text-foreground">
                        {formatCurrency(h.amount)}
                      </span>
                      {h.change != null && (
                        <span className="rounded-full bg-negative/15 px-2 py-0.5 text-xs font-medium text-negative">
                          +{Math.round(h.change)}%
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </Section>
  )
}
