'use client'

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createBudget,
  deleteBudget,
  updateBudget,
} from '@/app/actions/finance'
import {
  BUCKET_COLORS,
  formatCurrency,
  PERIOD_LABEL,
  spentForCategory,
  type Period,
} from '@/lib/format'
import type { Budget, Transaction } from '@/lib/types'
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'

export function BudgetTab({
  budgets,
  transactions,
}: {
  budgets: Budget[]
  transactions: Transaction[]
}) {
  const [period, setPeriod] = useState<Period>('monthly')
  const [editing, setEditing] = useState<Budget | null>(null)
  const [open, setOpen] = useState(false)

  const visible = useMemo(
    () => budgets.filter((b) => b.period === period),
    [budgets, period],
  )

  const rows = useMemo(
    () =>
      visible.map((b) => {
        const limit = Number(b.amount)
        const spent = spentForCategory(b.category, period, transactions)
        const remaining = limit - spent
        const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
        return { budget: b, limit, spent, remaining, pct }
      }),
    [visible, period, transactions],
  )

  const totals = useMemo(() => {
    const budgeted = rows.reduce((s, r) => s + r.limit, 0)
    const spent = rows.reduce((s, r) => s + r.spent, 0)
    return { budgeted, spent, remaining: budgeted - spent }
  }, [rows])

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = (b: Budget) => {
    setEditing(b)
    setOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header + period toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Spending budget
          </h2>
          <p className="text-sm text-muted-foreground">
            Set limits per category. Transactions deduct from what&apos;s left.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/60 p-1">
            {(['monthly', 'weekly'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  period === p
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button size="sm" className="gap-1.5" onClick={openNew}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">New budget</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <section className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <Summary label={`Budgeted (${PERIOD_LABEL[period].toLowerCase()})`} value={totals.budgeted} />
        <Summary label="Spent" value={totals.spent} tone="negative" />
        <Summary
          label="Remaining"
          value={totals.remaining}
          tone={totals.remaining >= 0 ? 'positive' : 'negative'}
        />
      </section>

      {/* Budget rows */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <Wallet className="size-6" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-foreground">
            No {period} budgets yet
          </h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Create a budget for a category like Groceries or Dining, then watch
            it shrink as you spend.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <BudgetRow
              key={r.budget.id}
              row={r}
              onEdit={() => openEdit(r.budget)}
            />
          ))}
        </div>
      )}

      <BudgetDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        defaultPeriod={period}
      />
    </div>
  )
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'positive' | 'negative'
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-serif text-xl font-semibold tabular-nums ${
          tone === 'positive'
            ? 'text-positive'
            : tone === 'negative'
              ? 'text-negative'
              : 'text-foreground'
        }`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  )
}

function BudgetRow({
  row,
  onEdit,
}: {
  row: {
    budget: Budget
    limit: number
    spent: number
    remaining: number
    pct: number
  }
  onEdit: () => void
}) {
  const { budget, limit, spent, remaining, pct } = row
  const color = budget.color ?? 'var(--primary)'
  const over = remaining < 0

  const handleDelete = async () => {
    try {
      await deleteBudget(budget.id)
      toast.success(`Removed ${budget.category} budget`)
    } catch {
      toast.error('Could not delete')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="size-3 rounded-full"
            style={{ background: color }}
            aria-hidden
          />
          <p className="font-medium text-foreground">{budget.category}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={onEdit}
            aria-label={`Edit ${budget.category} budget`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={handleDelete}
            aria-label={`Delete ${budget.category} budget`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground tabular-nums">
            {formatCurrency(spent)}
          </span>{' '}
          of {formatCurrency(limit)} spent
        </p>
        <p
          className={`text-sm font-medium tabular-nums ${
            over ? 'text-negative' : 'text-positive'
          }`}
        >
          {over
            ? `${formatCurrency(Math.abs(remaining))} over`
            : `${formatCurrency(remaining)} left`}
        </p>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: over ? 'var(--negative)' : color,
          }}
        />
      </div>
    </div>
  )
}

function BudgetDialog({
  open,
  onOpenChange,
  editing,
  defaultPeriod,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Budget | null
  defaultPeriod: Period
}) {
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const [color, setColor] = useState<string>(BUCKET_COLORS[0].value)
  const [saving, setSaving] = useState(false)

  // Sync form state whenever the dialog opens.
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setCategory(editing?.category ?? '')
      setAmount(editing ? String(Number(editing.amount)) : '')
      setPeriod((editing?.period as Period) ?? defaultPeriod)
      setColor(editing?.color ?? BUCKET_COLORS[0].value)
    }
  }

  const handleSave = async () => {
    if (!category.trim()) return toast.error('Name a category')
    const amt = Number(amount)
    if (!amt || amt <= 0) return toast.error('Set a budget amount')
    setSaving(true)
    try {
      if (editing) {
        await updateBudget(editing.id, {
          category: category.trim(),
          amount: amt,
          period,
          color,
        })
        toast.success('Budget updated')
      } else {
        await createBudget({
          category: category.trim(),
          amount: amt,
          period,
          color,
        })
        toast.success('Budget created')
      }
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {editing ? 'Edit budget' : 'New budget'}
          </DialogTitle>
          <DialogDescription>
            Spending in this category will be deducted from the budget.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-cat">Category</Label>
            <Input
              id="budget-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Groceries"
            />
            <p className="text-xs text-muted-foreground">
              Match this exactly when categorizing transactions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget-amount">Amount</Label>
              <Input
                id="budget-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Period</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-secondary/60 p-1">
                {(['monthly', 'weekly'] as Period[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`rounded-md px-2 py-1.5 text-sm font-medium capitalize transition-colors ${
                      period === p
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
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
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Create budget'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
