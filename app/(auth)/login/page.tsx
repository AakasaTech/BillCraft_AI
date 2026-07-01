import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title:       'Sign In — BillCraft AI',
  description: 'Sign in to BillCraft AI to manage your invoices, clients, and billing.',
  robots:      'noindex',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your BillCraft AI account
        </p>
      </div>

      <LoginForm searchParams={searchParams} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-foreground hover:underline">
          Sign up for free
        </Link>
      </p>
    </div>
  )
}
