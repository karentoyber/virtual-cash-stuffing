import type { ReactNode } from 'react'
import { formatCurrency } from '@/lib/format'

// Consistent card wrapper for every analytics section.
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 ${className ?? ''}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// Palette used for dynamic category series/segments.
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const

export function colorForIndex(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length]
}

// Currency-formatting tooltip for Recharts charts.
export function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-36 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      <div className="grid gap-1">
        {payload
          .filter((p) => p.value != null)
          .map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {formatCurrency(Number(p.value))}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
