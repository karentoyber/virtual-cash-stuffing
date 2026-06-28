import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  getAccounts,
  getTransactions,
  getRecurring,
  getBuckets,
  getBudgets,
} from '@/app/actions/finance'
import { Dashboard } from '@/components/dashboard'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [accounts, transactions, recurring, buckets, budgets] =
    await Promise.all([
      getAccounts(),
      // Fetch a wide window so per-category budget math is accurate.
      getTransactions(500),
      getRecurring(),
      getBuckets(),
      getBudgets(),
    ])

  return (
    <Dashboard
      userName={session.user.name || session.user.email}
      accounts={accounts}
      transactions={transactions}
      recurring={recurring}
      buckets={buckets}
      budgets={budgets}
    />
  )
}
