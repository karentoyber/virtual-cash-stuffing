'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createRecurring,
  deleteRecurring,
  toggleRecurring,
} from '@/app/actions/finance'
import { formatCurrency, formatDate, frequencyLabel } from '@/lib/format'
import type { Account, Recurring } from '@/lib/types'
import {
  ArrowRight,
  CalendarClock,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

type TxType = 'inflow' | 'outflow' | 'transfer'

export function RecurringTab({
  recurring,
  accounts,
}: {
  recurring: Recurring[]
  accounts: Account[]
}) {
  const [open, setOpen] = useState(false)
  const nameFor = (id: number | null) =>
    accounts.find((a) => a.id === id)?.name ?? '—'

  const handleToggle = async (r: Recurring) => {
    try {
      await toggleRecurring(r.id, !r.active)
    } catch {
      toast.error('Could not update')
    }
  }
  const handleDelete = async (id: number) => {
    try {
      await deleteRecurring(id)
      toast.success('Scheduled item removed')
    } catch {
      toast.error('Could not delete')
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Recurring &amp; scheduled
          </h2>
          <p className="text-sm text-muted-foreground">
            Automatic transfers, bills, and paychecks you expect on a schedule.
          </p>
        </div>
        <RecurringDialog
          open={open}
          onOpenChange={setOpen}
          accounts={accounts}
        />
      </div>

      {recurring.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <CalendarClock className="size-6" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Nothing scheduled
          </h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Set up recurring transfers like rent, savings, or your paycheck.
          </p>
          <Button onClick={() => setOpen(true)} className="mt-4 gap-1.5">
            <Plus className="size-4" />
            Schedule a transfer
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {recurring.map((r) => {
            const amt = Number(r.amount)
            return (
              <li
                key={r.id}
                className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm ${
                  r.active ? '' : 'opacity-60'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {r.label}
                    </p>
                    <Badge variant="secondary" className="shrink-0">
                      {frequencyLabel(r.frequency)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    {nameFor(r.accountId)}
                    {r.type === 'transfer' && (
                      <>
                        <ArrowRight className="size-3" />
                        {nameFor(r.toAccountId)}
                      </>
                    )}
                    <span aria-hidden>·</span>
                    Next: {formatDate(r.nextRun)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      r.type === 'inflow'
                        ? 'text-positive'
                        : r.type === 'outflow'
                          ? 'text-negative'
                          : 'text-foreground'
                    }`}
                  >
                    {r.type === 'inflow' ? '+' : r.type === 'outflow' ? '-' : ''}
                    {formatCurrency(amt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => handleToggle(r)}
                    aria-label={r.active ? 'Pause' : 'Resume'}
                  >
                    {r.active ? (
                      <PauseCircle className="size-4" />
                    ) : (
                      <PlayCircle className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => handleDelete(r.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RecurringDialog({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  accounts: Account[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<TxType>('outflow')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>(
    'monthly',
  )
  const [nextRun, setNextRun] = useState(today)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setLabel('')
    setType('outflow')
    setAccountId(accounts[0] ? String(accounts[0].id) : '')
    setToAccountId(accounts[1] ? String(accounts[1].id) : '')
    setAmount('')
    setFrequency('monthly')
    setNextRun(today)
  }

  const handleOpenChange = (v: boolean) => {
    if (v) reset()
    onOpenChange(v)
  }

  const handleSave = async () => {
    const amt = Number(amount)
    if (!label.trim()) return toast.error('Add a label')
    if (!accountId) return toast.error('Pick an account')
    if (!amt || amt <= 0) return toast.error('Enter an amount')
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId))
      return toast.error('Pick a different destination')
    setSaving(true)
    try {
      await createRecurring({
        label: label.trim(),
        type,
        accountId: Number(accountId),
        toAccountId: type === 'transfer' ? Number(toAccountId) : null,
        amount: amt,
        frequency,
        nextRun,
      })
      toast.success('Scheduled')
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const noAccounts = accounts.length === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5" disabled={noAccounts} />
        }
      >
        <Plus className="size-4" />
        Schedule
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Schedule a transfer</DialogTitle>
          <DialogDescription>
            Recurring income, bills, or transfers between envelopes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rec-label">Label</Label>
            <Input
              id="rec-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Rent, Paycheck, Auto-save"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rec-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TxType)}>
                <SelectTrigger id="rec-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outflow">Expense</SelectItem>
                  <SelectItem value="inflow">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input
                id="rec-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rec-account">
                {type === 'transfer' ? 'From' : 'Account'}
              </Label>
              <Select
                value={accountId}
                onValueChange={(v) => setAccountId(v ?? '')}
              >
                <SelectTrigger id="rec-account">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === 'transfer' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="rec-to">To</Label>
                <Select
                  value={toAccountId}
                  onValueChange={(v) => setToAccountId(v ?? '')}
                >
                  <SelectTrigger id="rec-to">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rec-freq">Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) =>
                  setFrequency(v as 'weekly' | 'biweekly' | 'monthly')
                }
              >
                <SelectTrigger id="rec-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rec-next">Next date</Label>
              <Input
                id="rec-next"
                type="date"
                value={nextRun}
                onChange={(e) => setNextRun(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
