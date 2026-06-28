'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBucket, deleteBucket, stuffBucket } from '@/app/actions/finance'
import { BUCKET_COLORS, formatCurrency, monthlyEquivalent } from '@/lib/format'
import type { Account, Bucket, Recurring } from '@/lib/types'
import { Minus, PiggyBank, Plus, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { toast } from 'sonner'

export function EnvelopesTab({
  buckets,
  accounts,
  recurring,
  netWorth,
}: {
  buckets: Bucket[]
  accounts: Account[]
  recurring: Recurring[]
  netWorth: number
}) {
  const projection = useMemo(() => {
    let income = 0
    let expense = 0
    for (const r of recurring) {
      if (!r.active) continue
      const monthly = monthlyEquivalent(Number(r.amount), r.frequency)
      if (r.type === 'inflow') income += monthly
      else if (r.type === 'outflow') expense += monthly
    }
    return { income, expense, net: income - expense }
  }, [recurring])

  // Only asset accounts make sense as a funding source for stuffing.
  const fundingAccounts = useMemo(
    () => accounts.filter((a) => a.kind !== 'liability'),
    [accounts],
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Monthly cash-flow projection from recurring items */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-xl font-semibold text-foreground">
          <TrendingUp className="size-5 text-muted-foreground" />
          Monthly projection
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Based on your active recurring items.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Income" value={projection.income} tone="positive" />
          <Stat label="Expenses" value={projection.expense} tone="negative" />
          <Stat
            label="Left over"
            value={projection.net}
            tone={projection.net >= 0 ? 'positive' : 'negative'}
            signed
          />
        </div>
        {recurring.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            At this rate, your net worth of{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(netWorth)}
            </span>{' '}
            changes by{' '}
            <span
              className={`font-medium ${
                projection.net >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {projection.net >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(projection.net) * 12)}
            </span>{' '}
            over a year.
          </p>
        )}
      </section>

      {/* Savings envelopes */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-foreground">
              Savings envelopes
            </h2>
            <p className="text-sm text-muted-foreground">
              Stuff cash from an account into an envelope toward your goals.
            </p>
          </div>
          <BucketDialog fundingAccounts={fundingAccounts} />
        </div>

        {buckets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
              <PiggyBank className="size-6" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-foreground">
              No envelopes yet
            </h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Create a savings goal like a vacation, emergency fund, or new
              laptop, then stuff cash into it.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {buckets.map((b) => (
              <BucketCard
                key={b.id}
                bucket={b}
                accounts={accounts}
                buckets={buckets}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
  signed,
}: {
  label: string
  value: number
  tone: 'positive' | 'negative'
  signed?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-semibold tabular-nums ${
          tone === 'positive' ? 'text-positive' : 'text-negative'
        }`}
      >
        {signed ? (value >= 0 ? '+' : '-') : ''}
        {formatCurrency(Math.abs(value))}
      </p>
    </div>
  )
}

function BucketCard({
  bucket,
  accounts,
  buckets,
}: {
  bucket: Bucket
  accounts: Account[]
  buckets: Bucket[]
}) {
  const saved = Number(bucket.saved)
  const target = Number(bucket.target)
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0
  const color = bucket.color ?? 'var(--primary)'
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const fundingAccount = accounts.find((a) => a.id === bucket.accountId)
  // Cash stays in the account; "available to reserve" is the account balance
  // minus everything already reserved across all of its envelopes.
  const reservedOnAccount = fundingAccount
    ? buckets
        .filter((b) => b.accountId === fundingAccount.id)
        .reduce((sum, b) => sum + Number(b.saved), 0)
    : 0
  const available = fundingAccount
    ? Number(fundingAccount.balance) - reservedOnAccount
    : null

  const move = async (direction: 1 | -1) => {
    const value = Number(amount)
    if (!value || value <= 0) {
      toast.error('Enter an amount first')
      return
    }
    if (direction === 1 && available != null && value > available) {
      toast.error(
        `${fundingAccount?.name} only has ${formatCurrency(available)} free to reserve`,
      )
      return
    }
    if (direction === -1 && value > saved) {
      toast.error("You can't take out more than is stuffed")
      return
    }
    setBusy(true)
    try {
      await stuffBucket(bucket.id, direction * value)
      setAmount('')
      toast.success(
        direction === 1
          ? `Stuffed ${formatCurrency(value)} into ${bucket.name}`
          : `Took ${formatCurrency(value)} out of ${bucket.name}`,
      )
    } catch {
      toast.error('Could not update envelope')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBucket(bucket.id)
      toast.success(`Removed ${bucket.name}`)
    } catch {
      toast.error('Could not delete')
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Cash fill level */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-500"
        style={{ height: `${pct}%`, background: color, opacity: 0.12 }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="size-3 rounded-full"
              style={{ background: color }}
              aria-hidden
            />
            <p className="font-medium text-foreground">{bucket.name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={handleDelete}
            aria-label={`Delete ${bucket.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {fundingAccount ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Wallet className="size-3" />
            {fundingAccount.name} · {formatCurrency(available ?? 0)} free to
            reserve
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            No funding account linked
          </p>
        )}

        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {formatCurrency(saved)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            of {formatCurrency(target)}
          </span>
        </p>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {pct.toFixed(0)}% stuffed
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="h-9"
            aria-label={`Amount to move for ${bucket.name}`}
          />
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => move(1)}
            disabled={busy}
            aria-label={`Stuff cash into ${bucket.name}`}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            onClick={() => move(-1)}
            disabled={busy || saved <= 0}
            aria-label={`Take cash out of ${bucket.name}`}
          >
            <Minus className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function BucketDialog({ fundingAccounts }: { fundingAccounts: Account[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [accountId, setAccountId] = useState<string>('')
  const [color, setColor] = useState<string>(BUCKET_COLORS[0].value)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setTarget('')
    setAccountId(fundingAccounts[0] ? String(fundingAccounts[0].id) : '')
    setColor(BUCKET_COLORS[0].value)
  }

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Name your envelope')
    const t = Number(target)
    if (!t || t <= 0) return toast.error('Set a target amount')
    setSaving(true)
    try {
      await createBucket({
        name: name.trim(),
        target: t,
        accountId: accountId ? Number(accountId) : null,
        color,
      })
      toast.success('Envelope created')
      setOpen(false)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) reset()
        setOpen(v)
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-4" />
        New envelope
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">New savings envelope</DialogTitle>
          <DialogDescription>
            Pick a funding account, a target, and a color.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bucket-name">Name</Label>
            <Input
              id="bucket-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency fund"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bucket-account">Funding account</Label>
            {fundingAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add an asset account first to fund envelopes.
              </p>
            ) : (
              <Select
                value={accountId}
                onValueChange={(v) => setAccountId(v ?? '')}
              >
                <SelectTrigger id="bucket-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {fundingAccounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} · {formatCurrency(Number(a.balance))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bucket-target">Target amount</Label>
            <Input
              id="bucket-target"
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {BUCKET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`size-8 rounded-full border-2 transition-transform ${
                    color === c.value
                      ? 'scale-110 border-foreground'
                      : 'border-transparent'
                  }`}
                  style={{ background: c.value }}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Create envelope'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
