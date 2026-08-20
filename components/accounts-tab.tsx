'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AccountDialog } from '@/components/account-dialog'
import { IraContributionsDialog } from '@/components/ira-contributions-dialog'
import { RecentTransactions } from '@/components/recent-transactions'
import { deleteAccount } from '@/app/actions/finance'
import {
  formatCurrency,
  formatDateTime,
  isIraAccount,
  parseTags,
  ordinal,
  daysUntilDueDay,
  periodStart,
} from '@/lib/format'
import type { Account, Bucket, Transaction } from '@/lib/types'
import {
  CalendarClock,
  Clock,
  Lock,
  MoreVertical,
  Pencil,
  Percent,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

export function AccountsTab({
  accounts,
  transactions,
  buckets,
}: {
  accounts: Account[]
  transactions: Transaction[]
  buckets: Bucket[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [iraOpen, setIraOpen] = useState(false)
  const [iraAccount, setIraAccount] = useState<Account | null>(null)

  // Map each account to the envelopes it funds, so we can show what's reserved.
  const stuffedByAccount = useMemo(() => {
    const map = new Map<number, { name: string; saved: number }[]>()
    for (const b of buckets) {
      if (b.accountId == null) continue
      const saved = Number(b.saved)
      if (saved <= 0) continue
      const list = map.get(b.accountId) ?? []
      list.push({ name: b.name, saved })
      map.set(b.accountId, list)
    }
    return map
  }, [buckets])

  const grouped = useMemo(() => {
    const map = new Map<string, Account[]>()
    for (const a of accounts) {
      const list = map.get(a.category) ?? []
      list.push(a)
      map.set(a.category, list)
    }
    return Array.from(map.entries())
  }, [accounts])

  // Most recent change to any account balance / transaction. `updatedAt` is
  // bumped whenever a balance moves, so the max reflects the last activity.
  const lastUpdated = useMemo(() => {
    let latest: Date | null = null
    for (const a of accounts) {
      const d = a.updatedAt
        ? typeof a.updatedAt === 'string'
          ? new Date(a.updatedAt)
          : a.updatedAt
        : null
      if (d && (!latest || d > latest)) latest = d
    }
    return latest
  }, [accounts])

  // Total interest charged on credit cards this month. Any transaction on a
  // credit-card account labeled "Interest charges" (category or note) counts.
  const interestThisMonth = useMemo(() => {
    const cardIds = new Set(
      accounts.filter((a) => a.category === 'Credit Cards').map((a) => a.id),
    )
    if (cardIds.size === 0) return 0
    const monthStart = periodStart('monthly')
    let total = 0
    for (const t of transactions) {
      if (!cardIds.has(t.accountId)) continue
      const category = (t.category ?? '').trim().toLowerCase()
      const description = (t.description ?? '').trim().toLowerCase()
      const isInterest =
        category.includes('interest charge') ||
        description.includes('interest charge')
      if (!isInterest) continue
      const d = typeof t.date === 'string' ? new Date(t.date) : t.date
      if (d < monthStart) continue
      total += Number(t.amount)
    }
    return total
  }, [accounts, transactions])

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }
  const openEdit = (a: Account) => {
    setEditing(a)
    setDialogOpen(true)
  }
  const openIra = (a: Account) => {
    setIraAccount(a)
    setIraOpen(true)
  }
  const handleDelete = async (a: Account) => {
    try {
      await deleteAccount(a.id)
      toast.success(`Removed ${a.name}`)
    } catch {
      toast.error('Could not delete account')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-foreground">
              Your accounts
            </h2>
            {lastUpdated && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                Last updated: {formatDateTime(lastUpdated)}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="size-4" />
            Add account
          </Button>
        </div>

        {accounts.length === 0 ? (
          <EmptyAccounts onAdd={openNew} />
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(([category, list]) => {
              const subtotal = list.reduce(
                (sum, a) =>
                  sum +
                  (a.kind === 'liability'
                    ? -Number(a.balance)
                    : Number(a.balance)),
                0,
              )
              return (
                <div key={category}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {category}
                    </h3>
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  {category === 'Credit Cards' && (
                    <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Percent className="size-3.5" />
                        Interest charges this month
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-negative">
                        {formatCurrency(interestThisMonth)}
                      </span>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {list.map((a) => (
                      <EnvelopeCard
                        key={a.id}
                        account={a}
                        stuffed={stuffedByAccount.get(a.id) ?? []}
                        onEdit={() => openEdit(a)}
                        onDelete={() => handleDelete(a)}
                        onOpenIra={() => openIra(a)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RecentTransactions transactions={transactions} accounts={accounts} />

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
      />

      <IraContributionsDialog
        open={iraOpen}
        onOpenChange={setIraOpen}
        account={iraAccount}
      />
    </div>
  )
}

function EnvelopeCard({
  account,
  stuffed,
  onEdit,
  onDelete,
  onOpenIra,
}: {
  account: Account
  stuffed: { name: string; saved: number }[]
  onEdit: () => void
  onDelete: () => void
  onOpenIra: () => void
}) {
  const balance = Number(account.balance)
  const isCard = account.category === 'Credit Cards'
  const isIra = isIraAccount(account.name)
  const limit = account.creditLimit ? Number(account.creditLimit) : 0
  const usedPct = limit > 0 ? Math.min(100, (balance / limit) * 100) : 0
  const danger = usedPct >= 80

  const totalStuffed = stuffed.reduce((sum, s) => sum + s.saved, 0)
  const available = balance - totalStuffed
  const showStuffed = account.kind !== 'liability' && totalStuffed > 0

  const tags = isCard ? parseTags(account.rewardTags) : []
  const dueDay = isCard ? account.paymentDueDay : null
  const daysToDue = dueDay ? daysUntilDueDay(dueDay) : null
  const dueSoon = daysToDue != null && daysToDue <= 5

  return (
    <div
      className={`group relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md ${
        isIra ? 'cursor-pointer hover:border-primary/50' : ''
      }`}
      onClick={isIra ? onOpenIra : undefined}
      role={isIra ? 'button' : undefined}
      tabIndex={isIra ? 0 : undefined}
      onKeyDown={
        isIra
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenIra()
              }
            }
          : undefined
      }
      aria-label={isIra ? `Open ${account.name} contribution tracker` : undefined}
    >
      {/* Envelope flap accent */}
      <div
        aria-hidden
        className="absolute right-4 top-0 h-3 w-10"
        style={{
          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
          background: account.kind === 'liability' ? 'var(--negative)' : 'var(--primary)',
          opacity: 0.25,
        }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{account.name}</p>
          <p className="text-xs text-muted-foreground">
            {account.kind === 'liability' ? 'Liability' : 'Asset'}
          </p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground"
                aria-label={`Options for ${account.name}`}
              />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      <p
        className={`mt-3 font-serif text-2xl font-semibold tabular-nums ${
          account.kind === 'liability' ? 'text-negative' : 'text-foreground'
        }`}
      >
        {formatCurrency(balance)}
      </p>

      {isIra && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
          <PiggyBank className="size-3.5" />
          Tap to track yearly contributions
        </p>
      )}

      {showStuffed && (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/40 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium text-muted-foreground">
              <Lock className="size-3" />
              Reserved in envelopes
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency(totalStuffed)}
            </span>
          </div>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {stuffed.map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span className="truncate">{s.name}</span>
                <span className="tabular-nums">{formatCurrency(s.saved)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-1.5 text-xs">
            <span className="font-medium text-muted-foreground">
              Free to spend
            </span>
            <span
              className={`font-semibold tabular-nums ${
                available < 0 ? 'text-negative' : 'text-primary'
              }`}
            >
              {formatCurrency(available)}
            </span>
          </div>
        </div>
      )}

      {isCard && limit > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {formatCurrency(limit - balance)} available
            </span>
            <span
              className={`font-medium tabular-nums ${
                danger ? 'text-negative' : 'text-muted-foreground'
              }`}
            >
              {usedPct.toFixed(0)}% used
            </span>
          </div>
          <Progress
            value={usedPct}
            className={danger ? '[&>div]:bg-negative' : '[&>div]:bg-accent'}
          />
        </div>
      )}

      {dueDay != null && (
        <div
          className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${
            dueSoon ? 'text-negative' : 'text-muted-foreground'
          }`}
        >
          <CalendarClock className="size-3.5" />
          <span>
            Pay by the {ordinal(dueDay)}
            {daysToDue != null && (
              <span className="font-normal">
                {' · '}
                {daysToDue === 0
                  ? 'due today'
                  : `in ${daysToDue} day${daysToDue === 1 ? '' : 's'}`}
              </span>
            )}
          </span>
        </div>
      )}

      {tags.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            Best for points
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyAccounts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Wallet className="size-6" />
      </div>
      <h3 className="font-serif text-lg font-semibold text-foreground">
        No envelopes yet
      </h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Add your first account to start tracking your balances and net worth.
      </p>
      <Button onClick={onAdd} className="mt-4 gap-1.5">
        <Plus className="size-4" />
        Add your first account
      </Button>
    </div>
  )
}
