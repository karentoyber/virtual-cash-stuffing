'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? 'Something went wrong')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-svh bg-background flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-20 items-center justify-center rounded-md border-2 border-primary/30 bg-card shadow-sm">
          <div className="h-0 w-0 border-l-[40px] border-r-[40px] border-t-[24px] border-l-transparent border-r-transparent border-t-primary/30" />
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Envelope
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stuff your cash. Watch your worth grow.
        </p>
      </div>

      <div className="relative w-full max-w-sm">
        {/* Envelope flap */}
        <div
          aria-hidden
          className="absolute inset-x-0 -top-3 mx-auto h-6 w-[92%]"
          style={{
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            background: 'var(--secondary)',
            border: '1px solid var(--border)',
          }}
        />
        <div className="relative rounded-xl border border-border bg-card p-6 shadow-md">
          <div className="mb-6">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              {isSignUp ? 'Open your envelope' : 'Welcome back'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSignUp
                ? 'Create an account to start tracking.'
                : 'Sign in to see your accounts and net worth.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? 'Please wait...'
                : isSignUp
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Link
              href={isSignUp ? '/sign-in' : '/sign-up'}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
