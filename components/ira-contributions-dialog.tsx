'use client'

import { useEffect, useState } from 'react'
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
import { getContributions, saveContributions } from '@/app/actions/finance'
import { formatCurrency, iraLimitForYear } from '@/lib/format'
import type { Account } from '@/lib/types'
import { AlertTriangle, Plus, PiggyBank, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Row = { year: number; amount: string }

const FIRST_YEAR = 2024

export function IraContributionsDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  account: Account | null
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load the saved contributions each time the tracker opens.
  useEffect(() => {
    if (!open || !account) return
    let active = true
    setLoading(true)
    getContributions(account.id)
      .then((data) => {
        if (!active) return
        if (data.length > 0) {
          setRows(
            data.map((c) => ({ year: c.year, amount: String(Number(c.amount)) })),
          )
        } else {
          // Start with the first year; the user can add more.
          setRows([{ year: FIRST_YEAR, amount: '' }])
        }
      })
      .catch(() => {
        if (active) toast.error('Could not load contributions')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, account])

  const total = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const setAmount = (year: number, amount: string) => {
    setRows((prev) => prev.map((r) => (r.year === year ? { ...r, amount } : r)))
  }

  const addYear = () => {
    setRows((prev) => {
      const maxYear = prev.reduce((m, r) => Math.max(m, r.year), FIRST_YEAR - 1)
      return [...prev, { year: maxYear + 1, amount: '' }]
    })
  }

  const removeYear = (year: number) => {
    setRows((prev) => prev.filter((r) => r.year !== year))
  }

  // Persist on close and sync the account balance to the total.
  const persistAndClose = async () => {
    if (!account || saving) {
      onOpenChange(false)
      return
    }
    setSaving(true)
    try {
      await saveContributions(
        account.id,
        rows.map((r) => ({ year: r.year, amount: Number(r.amount) || 0 })),
      )
      toast.success(`Saved ${formatCurrency(total)} in contributions`)
    } catch {
      toast.error('Could not save contributions')
    } finally {
      setSaving(false)
      onOpenChange(false)
    }
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      // Closing (button, overlay, or escape) saves and totals everything up.
      void persistAndClose()
    } else {
      onOpenChange(true)
    }
  }

  const sorted = [...rows].sort((a, b) => a.year - b.year)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <PiggyBank className="size-5 text-primary" />
            {account?.name ?? 'IRA'} contributions
          </DialogTitle>
          <DialogDescription>
            Track what you&apos;ve put in each year. When you close, the totals
            add up and update this account&apos;s balance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Loading contributions…
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sorted.map((r) => {
                const value = Number(r.amount) || 0
                const limit = iraLimitForYear(r.year)
                const over = value > limit
                return (
                  <li key={r.year} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-12 shrink-0 font-medium tabular-nums text-foreground">
                        {r.year}
                      </span>
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={r.amount}
                          onChange={(e) => setAmount(r.year, e.target.value)}
                          placeholder="0.00"
                          className="pl-6"
                          aria-label={`${r.year} contribution`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-muted-foreground"
                        onClick={() => removeYear(r.year)}
                        disabled={sorted.length <= 1}
                        aria-label={`Remove ${r.year}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <p
                      className={`pl-14 text-xs ${
                        over ? 'flex items-center gap-1 text-negative' : 'text-muted-foreground'
                      }`}
                    >
                      {over && <AlertTriangle className="size-3" />}
                      {over
                        ? `Over the ${formatCurrency(limit)} limit for ${r.year}`
                        : `Limit: ${formatCurrency(limit)}`}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={addYear}
            className="gap-1.5 self-start"
            disabled={loading}
          >
            <Plus className="size-4" />
            Add year
          </Button>

          <div className="mt-1 flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
            <span className="text-sm font-medium text-muted-foreground">
              Total contributed
            </span>
            <span className="font-serif text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={persistAndClose} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
