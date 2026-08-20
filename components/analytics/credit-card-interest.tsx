'use client'

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { formatCurrency } from '@/lib/format'
import { Section, CurrencyTooltip } from './section'
import { Percent } from 'lucide-react'

const config: ChartConfig = {
  interest: { label: 'Interest charges', color: 'var(--chart-2)' },
}

export function CreditCardInterest({
  total,
  series,
  seriesHeading,
  periodLabel,
}: {
  total: number
  series?: { label: string; interest: number }[]
  seriesHeading?: string
  periodLabel?: string
}) {
  return (
    <Section
      title="Credit Card Interest"
      description="Interest charges on cards this period"
    >
      <div className="flex items-baseline gap-2">
        <Percent className="size-4 text-negative" />
        <span className="font-mono text-3xl font-semibold tabular-nums text-negative">
          {formatCurrency(total)}
        </span>
        <span className="text-sm text-muted-foreground">
          in interest charges{periodLabel ? ` · ${periodLabel}` : ''}
        </span>
      </div>

      {series && series.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {seriesHeading ?? 'Interest charges'}
          </p>
          {series.some((m) => m.interest > 0) ? (
            <ChartContainer config={config} className="h-40 w-full">
              <BarChart data={series}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip content={<CurrencyTooltip />} />
                <Bar
                  dataKey="interest"
                  fill="var(--color-interest)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No interest charges recorded this period.
            </p>
          )}
        </div>
      )}
    </Section>
  )
}
