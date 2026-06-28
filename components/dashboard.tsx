'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Toaster } from '@/components/ui/sonner'
import { NetWorthHero } from '@/components/net-worth-hero'
import { AccountsTab } from '@/components/accounts-tab'
import { RecurringTab } from '@/components/recurring-tab'
import { BudgetTab } from '@/components/budget-tab'
import { EnvelopesTab } from '@/components/envelopes-tab'
import { TransactionDialog } from '@/components/transaction-dialog'
import { signOut } from '@/app/actions/auth'
import type {
  Account,
  Transaction,
  Recurring,
  Bucket,
  Budget,
} from '@/lib/types'
import { LogOut, Plus, User } from 'lucide-react'

export function Dashboard({
  userName,
  accounts,
  transactions,
  recurring,
  buckets,
  budgets,
}: {
  userName: string
  accounts: Account[]
  transactions: Transaction[]
  recurring: Recurring[]
  buckets: Bucket[]
  budgets: Budget[]
}) {
  const router = useRouter()
  const [txOpen, setTxOpen] = useState(false)

  const { assets, liabilities, netWorth } = useMemo(() => {
    let assets = 0
    let liabilities = 0
    for (const a of accounts) {
      const bal = Number(a.balance)
      if (a.kind === 'liability') liabilities += bal
      else assets += bal
    }
    // Envelopes only reserve money that already lives in the accounts, so they
    // do not add to net worth — the account balances already include it.
    return { assets, liabilities, netWorth: assets - liabilities }
  }, [accounts])

  // Existing budget categories power the transaction category suggestions.
  const budgetCategories = useMemo(
    () => Array.from(new Set(budgets.map((b) => b.category))),
    [budgets],
  )

  const handleSignOut = async () => {
    await signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="min-h-svh bg-background">
      <Toaster position="top-center" richColors />

      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-12 items-center justify-center rounded-md border-2 border-primary/30 bg-card">
              <div className="h-0 w-0 border-l-[24px] border-r-[24px] border-t-[15px] border-l-transparent border-r-transparent border-t-primary/40" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
              Envelope
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setTxOpen(true)}
              className="gap-1.5"
              size="sm"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Account menu"
                  />
                }
              >
                <User className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-2 py-1.5 text-sm">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="truncate font-medium text-foreground">
                    {userName}
                  </p>
                </div>
                <DropdownMenuItem onClick={handleSignOut} className="gap-2">
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
        <NetWorthHero
          netWorth={netWorth}
          assets={assets}
          liabilities={liabilities}
        />

        <Tabs defaultValue="accounts" className="mt-8">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="envelopes">Envelopes</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-6">
            <AccountsTab
              accounts={accounts}
              transactions={transactions}
              buckets={buckets}
            />
          </TabsContent>

          <TabsContent value="budget" className="mt-6">
            <BudgetTab budgets={budgets} transactions={transactions} />
          </TabsContent>

          <TabsContent value="envelopes" className="mt-6">
            <EnvelopesTab
              buckets={buckets}
              accounts={accounts}
              recurring={recurring}
              netWorth={netWorth}
            />
          </TabsContent>

          <TabsContent value="recurring" className="mt-6">
            <RecurringTab recurring={recurring} accounts={accounts} />
          </TabsContent>
        </Tabs>
      </main>

      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        accounts={accounts}
        categories={budgetCategories}
      />
    </div>
  )
}
