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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTransaction } from '@/app/actions/finance'
import type { Account } from '@/lib/types'
import { toast } from 'sonner'

type TxType = 'inflow' | 'outflow' | 'transfer'

const TYPES: { value: TxType; label: string }[] = [
  { value: 'outflow', label: 'Expense' },
  { value: 'inflow', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
]

export function TransactionDialog({
  open,
  onOpenChange,
  accounts,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  accounts: Account[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<TxType>('outflow')
  const [accountId, setAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setType('outflow')
      setAccountId(accounts[0] ? String(accounts[0].id) : '')
      setToAccountId(accounts[1] ? String(accounts[1].id) : '')
      setAmount('')
      setCategory('')
      setDescription('')
      setDate(today)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSave = async () => {
    const amt = Number(amount)
    if (!accountId) {
      toast.error('Pick an account')
      return
    }
    if (!amt || amt <= 0) {
      toast.error('Enter an amount greater than zero')
      return
    }
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      toast.error('Pick a different destination account')
      return
    }
    setSaving(true)
    try {
      await createTransaction({
        accountId: Number(accountId),
        toAccountId: type === 'transfer' ? Number(toAccountId) : null,
        type,
        amount: amt,
        category: category.trim() || null,
        description: description.trim() || null,
        date,
      })
      toast.success('Transaction added')
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const noAccounts = accounts.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Add a transaction</DialogTitle>
          <DialogDescription>
            Record money moving in, out, or between your envelopes.
          </DialogDescription>
        </DialogHeader>

        {noAccounts ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Add an account first, then you can record transactions.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Type segmented control */}
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-secondary/60 p-1">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                    type === t.value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tx-account">
                  {type === 'transfer' ? 'From' : 'Account'}
                </Label>
                <Select
                  value={accountId}
                  onValueChange={(v) => setAccountId(v ?? '')}
                >
                  <SelectTrigger id="tx-account">
                    <SelectValue placeholder="Select account" />
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
                  <Label htmlFor="tx-to">To</Label>
                  <Select
                    value={toAccountId}
                    onValueChange={(v) => setToAccountId(v ?? '')}
                  >
                    <SelectTrigger id="tx-to">
                      <SelectValue placeholder="Select account" />
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

              {type !== 'transfer' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="tx-cat">Category</Label>
                  <Input
                    id="tx-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Groceries"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tx-desc">Note</Label>
                <Input
                  id="tx-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tx-date">Date</Label>
                <Input
                  id="tx-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || noAccounts}>
            {saving ? 'Saving...' : 'Add transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
