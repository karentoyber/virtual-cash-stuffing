import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import {
  getAccounts,
  getTransactions,
  getRecurring,
  getBuckets,
} from '@/app/actions/finance'
import { Dashboard } from '@/components/dashboard'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [accounts, transactions, recurring, buckets] = await Promise.all([
    getAccounts(),
    getTransactions(),
    getRecurring(),
    getBuckets(),
  ])

  return (
    <Dashboard
      userName={session.user.name || session.user.email}
      accounts={accounts}
      transactions={transactions}
      recurring={recurring}
      buckets={buckets}
    />
  )
}
