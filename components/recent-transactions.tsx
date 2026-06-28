'use client'

import { Button } from '@/components/ui/button'
import { deleteTransaction } from '@/app/actions/finance'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Account, Transaction } from '@/lib/types'
import { ArrowRight, Receipt, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function RecentTransactions({
  transactions,
  accounts,
}: {
  transactions: Transaction[]
  accounts: Account[]
}) {
  const nameFor = (id: number | null) =>
    accounts.find((a) => a.id === id)?.name ?? 'Unknown'

  const handleDelete = async (id: number) => {
    try {
      await deleteTransaction(id)
      toast.success('Transaction removed and balances restored')
    } catch {
      toast.error('Could not delete transaction')
    }
  }

  return (
    <aside className="rounded-xl border border-border bg-card p-4 shadow-sm lg:h-fit lg:sticky lg:top-20">
      <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
        <Receipt className="size-4 text-muted-foreground" />
        Recent activity
      </h2>

      {transactions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No transactions yet. Add one to see it here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {transactions.map((t) => {
            const amount = Number(t.amount)
            const isInflow = t.type === 'inflow'
            const isTransfer = t.type === 'transfer'
            return (
              <li
                key={t.id}
                className="group flex items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {t.description ||
                      t.category ||
                      (isTransfer ? 'Transfer' : isInflow ? 'Income' : 'Expense')}
                  </p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    {nameFor(t.accountId)}
                    {isTransfer && (
                      <>
                        <ArrowRight className="size-3" />
                        {nameFor(t.toAccountId)}
                      </>
                    )}
                    <span aria-hidden>·</span>
                    {formatDate(t.date)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      isInflow
                        ? 'text-positive'
                        : isTransfer
                          ? 'text-foreground'
                          : 'text-negative'
                    }`}
                  >
                    {isInflow ? '+' : isTransfer ? '' : '-'}
                    {formatCurrency(amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => handleDelete(t.id)}
                    aria-label="Delete transaction"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
