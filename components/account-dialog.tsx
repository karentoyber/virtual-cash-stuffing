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
import {
  CATEGORY_PRESETS,
  REWARD_TAG_PRESETS,
  ROTH_IRA_TAG,
  parseTags,
} from '@/lib/format'
import { PiggyBank } from 'lucide-react'
import { createAccount, updateAccount } from '@/app/actions/finance'
import type { Account } from '@/lib/types'
import { toast } from 'sonner'

export function AccountDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  account?: Account | null
}) {
  const editing = !!account
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Cash')
  const [kind, setKind] = useState('asset')
  const [balance, setBalance] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [rewardTags, setRewardTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [isRoth, setIsRoth] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(account?.name ?? '')
      setCategory(account?.category ?? 'Cash')
      setKind(account?.kind ?? 'asset')
      setBalance(account ? String(Number(account.balance)) : '')
      setCreditLimit(
        account?.creditLimit != null ? String(Number(account.creditLimit)) : '',
      )
      const allTags = parseTags(account?.rewardTags)
      // The roth-ira marker lives in the same column as reward tags; keep it
      // out of the visible reward-tag chips and drive the toggle instead.
      setRewardTags(allTags.filter((t) => t.toLowerCase() !== ROTH_IRA_TAG))
      setIsRoth(allTags.some((t) => t.toLowerCase() === ROTH_IRA_TAG))
      setTagInput('')
      setDueDay(account?.paymentDueDay != null ? String(account.paymentDueDay) : '')
    }
  }, [open, account])

  const toggleTag = (tag: string) => {
    setRewardTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const addCustomTag = () => {
    const tag = tagInput.trim()
    if (!tag) return
    if (!rewardTags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setRewardTags((prev) => [...prev, tag])
    }
    setTagInput('')
  }

  const isCard = category === 'Credit Cards'
  const isInvestment = category === 'Investments'

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Give your account a name')
      return
    }
    setSaving(true)
    const due = Number(dueDay)
    // Reward tags only apply to cards; the roth-ira marker only to
    // Investments. Both share the `rewardTags` column.
    let storedTags: string | null = null
    if (isCard && rewardTags.length) {
      storedTags = rewardTags.join(', ')
    } else if (isInvestment && isRoth) {
      storedTags = ROTH_IRA_TAG
    }
    const payload = {
      name: name.trim(),
      category,
      kind: isCard ? 'liability' : kind,
      balance: Number(balance) || 0,
      creditLimit: isCard && creditLimit ? Number(creditLimit) : null,
      rewardTags: storedTags,
      paymentDueDay:
        isCard && due >= 1 && due <= 31 ? Math.floor(due) : null,
    }
    try {
      if (editing && account) {
        await updateAccount(account.id, payload)
        toast.success('Account updated')
      } else {
        await createAccount(payload)
        toast.success('Account added')
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
            {editing ? 'Edit account' : 'New account'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the details of this envelope.'
              : 'Add an account or envelope to your tracker.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="acc-name">Name</Label>
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Everyday Checking"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="acc-cat">Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v ?? '')}
            >
              <SelectTrigger id="acc-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_PRESETS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isCard && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-kind">Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v ?? '')}>
                <SelectTrigger id="acc-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset (adds to worth)</SelectItem>
                  <SelectItem value="liability">
                    Liability (subtracts)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="acc-bal">
                {isCard ? 'Balance owed' : 'Balance'}
              </Label>
              <Input
                id="acc-bal"
                type="number"
                inputMode="decimal"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {isCard && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="acc-limit">Credit limit</Label>
                <Input
                  id="acc-limit"
                  type="number"
                  inputMode="decimal"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {isInvestment && (
            <button
              type="button"
              onClick={() => setIsRoth((v) => !v)}
              aria-pressed={isRoth}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                isRoth
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-secondary/40 hover:bg-secondary'
              }`}
            >
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                  isRoth
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                <PiggyBank className="size-4" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">
                  Roth IRA account
                </span>
                <span className="text-xs text-muted-foreground">
                  Track contributions year by year. The account balance stays in
                  sync with your total contributed.
                </span>
              </span>
              <span
                className={`ml-auto mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                  isRoth ? 'bg-primary' : 'bg-border'
                }`}
              >
                <span
                  className={`size-4 rounded-full bg-background transition-transform ${
                    isRoth ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          )}

          {isCard && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="acc-due">Payment due day</Label>
                <Input
                  id="acc-due"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="e.g. 15"
                />
                <p className="text-xs text-muted-foreground">
                  The day of the month your bill is due.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Best for points</Label>
                <p className="-mt-1 text-xs text-muted-foreground">
                  Tag the spending categories this card earns the most on.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {REWARD_TAG_PRESETS.map((tag) => {
                    const active = rewardTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        aria-pressed={active}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
                {/* Custom reward tags chosen by the user */}
                {rewardTags.filter(
                  (t) =>
                    !REWARD_TAG_PRESETS.some(
                      (p) => p.toLowerCase() === t.toLowerCase(),
                    ),
                ).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rewardTags
                      .filter(
                        (t) =>
                          !REWARD_TAG_PRESETS.some(
                            (p) => p.toLowerCase() === t.toLowerCase(),
                          ),
                      )
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          aria-pressed
                          className="rounded-full border border-primary bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                        >
                          {tag} ×
                        </button>
                      ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomTag()
                      }
                    }}
                    placeholder="Add your own…"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomTag}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </>
          )}
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
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Add account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
