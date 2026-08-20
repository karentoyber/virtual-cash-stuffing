'use client'

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { Section, CurrencyTooltip } from './section'

export interface SeriesPoint {
  label: string
  income: number
  expenses: number
}

const config: ChartConfig = {
  income: { label: 'Income', color: 'var(--chart-1)' },
  expenses: { label: 'Expenses', color: 'var(--chart-2)' },
}

export function IncomeVsExpenses({
  data,
  granularity,
}: {
  data: SeriesPoint[]
  granularity: string
}) {
  const hasData = data.some((d) => d.income > 0 || d.expenses > 0)
  return (
    <Section
      title="Income vs Expenses"
      description={`Compared by ${granularity}`}
    >
      {!hasData ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No activity in this period.
        </p>
      ) : (
        <ChartContainer config={config} className="h-56 w-full">
          <BarChart data={data} barGap={4}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<CurrencyTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
          </BarChart>
        </ChartContainer>
      )}
    </Section>
  )
}
