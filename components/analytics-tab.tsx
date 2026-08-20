'use client'

import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Account, Transaction } from '@/lib/types'
import {
  type AnalyticsView,
  VIEW_LABEL,
  getPeriodRange,
  getBuckets,
  computeTotals,
  aggregateByCategory,
  isInterestTx,
  txDate,
  isCreditCard,
} from '@/lib/analytics'
import { SummaryCards } from '@/components/analytics/summary-cards'
import { SpendingByCategory } from '@/components/analytics/spending-by-category'
import { IncomeBreakdown } from '@/components/analytics/income-breakdown'
import {
  IncomeVsExpenses,
  type SeriesPoint,
} from '@/components/analytics/income-vs-expenses'
import {
  SpendingTrends,
  type TrendPoint,
} from '@/components/analytics/spending-trends'
import { FinancialBreakdown } from '@/components/analytics/financial-breakdown'
import { CreditCardInterest } from '@/components/analytics/credit-card-interest'
import {
  TransactionDetails,
  ALL,
  type DetailFilters,
} from '@/components/analytics/transaction-details'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const VIEWS: AnalyticsView[] = ['weekly', 'monthly', 'yearly']
const GRANULARITY: Record<AnalyticsView, string> = {
  weekly: 'day',
  monthly: 'week',
  yearly: 'month',
}

export function AnalyticsTab({
  accounts,
  transactions,
}: {
  accounts: Account[]
  transactions: Transaction[]
}) {
  const [view, setView] = useState<AnalyticsView>('monthly')
  const [offset, setOffset] = useState(0)
  const [accountFilter, setAccountFilter] = useState<string>(ALL)
  const [detailType, setDetailType] =
    useState<DetailFilters['type']>('all')
  const [detailCategory, setDetailCategory] = useState<string>(ALL)
  const [detailCardType, setDetailCardType] =
    useState<DetailFilters['cardType']>('all')

  const accountById = useMemo(() => {
    const m = new Map<number, Account>()
    for (const a of accounts) m.set(a.id, a)
    return m
  }, [accounts])

  const changeView = (v: AnalyticsView) => {
    setView(v)
    setOffset(0)
  }

  const range = useMemo(() => getPeriodRange(view, offset), [view, offset])
  const prevRange = useMemo(
    () => getPeriodRange(view, offset - 1),
    [view, offset],
  )

  // Scope every metric to the selected account (or all accounts).
  const globalScoped = useMemo(() => {
    if (accountFilter === ALL) return transactions
    const id = Number(accountFilter)
    return transactions.filter(
      (t) => t.accountId === id || t.toAccountId === id,
    )
  }, [transactions, accountFilter])

  const current = useMemo(
    () =>
      globalScoped.filter((t) => {
        const d = txDate(t)
        return d >= range.start && d < range.end
      }),
    [globalScoped, range],
  )
  const previous = useMemo(
    () =>
      globalScoped.filter((t) => {
        const d = txDate(t)
        return d >= prevRange.start && d < prevRange.end
      }),
    [globalScoped, prevRange],
  )

  const totals = useMemo(() => computeTotals(current), [current])
  const prevTotals = useMemo(() => computeTotals(previous), [previous])

  const spending = useMemo(
    () => aggregateByCategory(current, previous, 'outflow'),
    [current, previous],
  )
  const income = useMemo(
    () => aggregateByCategory(current, previous, 'inflow'),
    [current, previous],
  )

  const buckets = useMemo(() => getBuckets(view, range), [view, range])

  const series = useMemo<SeriesPoint[]>(
    () =>
      buckets.map((b) => {
        let inc = 0
        let exp = 0
        for (const t of current) {
          const d = txDate(t)
          if (d < b.start || d >= b.end) continue
          if (t.type === 'inflow') inc += Number(t.amount)
          else if (t.type === 'outflow') exp += Number(t.amount)
        }
        return { label: b.label, income: inc, expenses: exp }
      }),
    [buckets, current],
  )

  // Top expense categories tracked over time for the trends chart.
  const trendCategories = useMemo(
    () => spending.slice(0, 3).map((s) => s.category),
    [spending],
  )
  const trendData = useMemo<TrendPoint[]>(
    () =>
      buckets.map((b) => {
        const row: TrendPoint = { label: b.label }
        for (const c of trendCategories) row[c] = 0
        for (const t of current) {
          if (t.type !== 'outflow') continue
          const cat = (t.category ?? 'Uncategorized').trim() || 'Uncategorized'
          if (!trendCategories.includes(cat)) continue
          const d = txDate(t)
          if (d < b.start || d >= b.end) continue
          row[cat] = (row[cat] as number) + Number(t.amount)
        }
        return row
      }),
    [buckets, current, trendCategories],
  )
  const trendHighlights = useMemo(
    () =>
      spending
        .filter((s) => s.amount > 0 && s.change != null && s.change >= 20)
        .slice(0, 4),
    [spending],
  )

  const interestTotal = useMemo(
    () =>
      current
        .filter((t) => isInterestTx(t, accountById))
        .reduce((s, t) => s + Number(t.amount), 0),
    [current, accountById],
  )
  const interestMonthly = useMemo(() => {
    if (view !== 'yearly') return undefined
    return getBuckets('yearly', range).map((b) => {
      let v = 0
      for (const t of current) {
        if (!isInterestTx(t, accountById)) continue
        const d = txDate(t)
        if (d >= b.start && d < b.end) v += Number(t.amount)
      }
      return { label: b.label, interest: v }
    })
  }, [view, range, current, accountById])

  // Categories present this period, for the details dropdown.
  const detailCategories = useMemo(() => {
    const set = new Set<string>()
    for (const t of current) {
      const cat = (t.category ?? '').trim()
      if (cat) set.add(cat)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [current])

  // Apply the details-only filters on top of the period + account scope.
  const detailRows = useMemo(() => {
    const rows = current.filter((t) => {
      if (detailType === 'income' && t.type !== 'inflow') return false
      if (detailType === 'expense' && t.type !== 'outflow') return false
      if (detailType === 'transfer' && t.type !== 'transfer') return false
      if (detailCategory !== ALL) {
        if ((t.category ?? '').trim() !== detailCategory) return false
      }
      if (detailCardType !== 'all') {
        const acc = accountById.get(t.accountId)
        const credit = isCreditCard(acc)
        if (detailCardType === 'credit' && !credit) return false
        if (detailCardType === 'debit' && credit) return false
      }
      return true
    })
    return rows.sort((a, b) => txDate(b).getTime() - txDate(a).getTime())
  }, [current, detailType, detailCategory, detailCardType, accountById])

  const filters: DetailFilters = {
    account: accountFilter,
    category: detailCategory,
    type: detailType,
    cardType: detailCardType,
  }

  const handleFilterChange = (patch: Partial<DetailFilters>) => {
    if (patch.account !== undefined) setAccountFilter(patch.account)
    if (patch.category !== undefined) setDetailCategory(patch.category)
    if (patch.type !== undefined) setDetailType(patch.type)
    if (patch.cardType !== undefined) setDetailCardType(patch.cardType)
  }

  const resetFilters = () => {
    setAccountFilter(ALL)
    setDetailCategory(ALL)
    setDetailType('all')
    setDetailCardType('all')
  }

  // Clicking a chart segment drills the details into that category.
  const selectSpending = (category: string) => {
    setDetailType('expense')
    setDetailCategory((c) => (c === category ? ALL : category))
  }
  const selectIncome = (category: string) => {
    setDetailType('income')
    setDetailCategory((c) => (c === category ? ALL : category))
  }

  const spendingSelected =
    detailType === 'expense' && detailCategory !== ALL ? detailCategory : null

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Previous period"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium text-foreground">
            {range.label}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
            disabled={offset >= 0}
            aria-label="Next period"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <Select
          value={accountFilter}
          onValueChange={(v) => setAccountFilter(v ?? ALL)}
        >
          <SelectTrigger size="sm" aria-label="Filter by account">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SummaryCards totals={totals} prev={prevTotals} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingByCategory
          data={spending}
          selected={spendingSelected}
          onSelect={selectSpending}
        />
        <IncomeBreakdown data={income} onSelect={selectIncome} />
      </div>

      <IncomeVsExpenses data={series} granularity={GRANULARITY[view]} />

      <SpendingTrends
        categories={trendCategories}
        data={trendData}
        highlights={trendHighlights}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <FinancialBreakdown data={spending} />
        <CreditCardInterest total={interestTotal} monthly={interestMonthly} />
      </div>

      <TransactionDetails
        rows={detailRows}
        accountById={accountById}
        accounts={accounts}
        categories={detailCategories}
        filters={filters}
        onChange={handleFilterChange}
        onReset={resetFilters}
      />
    </div>
  )
}
