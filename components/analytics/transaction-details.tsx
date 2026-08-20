'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Account, Transaction } from '@/lib/types'
import { txDate } from '@/lib/analytics'
import { Section } from './section'
import { ArrowRight, X } from 'lucide-react'

export const ALL = '__all'

export type DetailType = 'all' | 'income' | 'expense' | 'transfer'
export type CardType = 'all' | 'credit' | 'debit'

export interface DetailFilters {
  account: string // account id as string or ALL
  category: string // category or ALL
  type: DetailType
  cardType: CardType
}

const TYPE_LABEL: Record<DetailType, string> = {
  all: 'All types',
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
}

const CARD_LABEL: Record<CardType, string> = {
  all: 'All cards & accounts',
  credit: 'Credit cards',
  debit: 'Checking / debit',
}

export function TransactionDetails({
  rows,
  accountById,
  accounts,
  categories,
  filters,
  onChange,
  onReset,
}: {
  rows: Transaction[]
  accountById: Map<number, Account>
  accounts: Account[]
  categories: string[]
  filters: DetailFilters
  onChange: (patch: Partial<DetailFilters>) => void
  onReset: () => void
}) {
  const nameFor = (id: number | null) =>
    id == null ? '—' : (accountById.get(id)?.name ?? 'Unknown')

  const hasFilters =
    filters.account !== ALL ||
    filters.category !== ALL ||
    filters.type !== 'all' ||
    filters.cardType !== 'all'

  return (
    <Section
      title="Transaction Details"
      description={`${rows.length} transaction${rows.length === 1 ? '' : 's'} in this period`}
      action={
        hasFilters ? (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
            <X className="size-3.5" />
            Clear filters
          </Button>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          value={filters.type}
          onValueChange={(v) => onChange({ type: (v as DetailType) ?? 'all' })}
        >
          <SelectTrigger size="sm" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABEL) as DetailType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(v) => onChange({ category: v ?? ALL })}
        >
          <SelectTrigger size="sm" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.cardType}
          onValueChange={(v) => onChange({ cardType: (v as CardType) ?? 'all' })}
        >
          <SelectTrigger size="sm" aria-label="Filter by card type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CARD_LABEL) as CardType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {CARD_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.account}
          onValueChange={(v) => onChange({ account: v ?? ALL })}
        >
          <SelectTrigger size="sm" aria-label="Filter by account">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No transactions match these filters.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {rows.map((t) => {
            const amount = Number(t.amount)
            const isIn = t.type === 'inflow'
            const isOut = t.type === 'outflow'
            return (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {t.description || t.category || 'Transaction'}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{formatDate(txDate(t))}</span>
                    <span aria-hidden>·</span>
                    {t.type === 'transfer' ? (
                      <span className="flex items-center gap-1">
                        {nameFor(t.accountId)}
                        <ArrowRight className="size-3" />
                        {nameFor(t.toAccountId)}
                      </span>
                    ) : (
                      <span>{nameFor(t.accountId)}</span>
                    )}
                    {t.category && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="rounded-full bg-secondary px-1.5 py-0.5">
                          {t.category}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono text-sm font-medium tabular-nums ${
                    isIn
                      ? 'text-positive'
                      : isOut
                        ? 'text-negative'
                        : 'text-muted-foreground'
                  }`}
                >
                  {isIn ? '+' : isOut ? '-' : ''}
                  {formatCurrency(amount)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
