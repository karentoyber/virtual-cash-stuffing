'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/format'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

export function NetWorthHero({
  netWorth,
  assets,
  liabilities,
}: {
  netWorth: number
  assets: number
  liabilities: number
}) {
  const animated = useCountUp(netWorth)

  return (
    <section
      aria-label="Net worth summary"
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      {/* Subtle paper texture stripes */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--foreground) 0 1px, transparent 1px 12px)',
        }}
      />
      <div className="relative">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Total net worth
        </p>
        <p className="mt-1 font-serif text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl">
          {formatCurrency(animated)}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <div className="flex items-center gap-1.5 text-positive">
              <ArrowUpRight className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Assets
              </span>
            </div>
            <p className="mt-1 font-semibold tabular-nums text-foreground">
              {formatCurrency(assets)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <div className="flex items-center gap-1.5 text-negative">
              <ArrowDownRight className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Liabilities
              </span>
            </div>
            <p className="mt-1 font-semibold tabular-nums text-foreground">
              {formatCurrency(liabilities)}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
