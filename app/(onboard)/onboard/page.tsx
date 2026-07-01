import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OnboardForm } from '@/components/auth/onboard-form'

export const metadata: Metadata = { title: 'Set Up Your Workspace — BillCraft AI', robots: 'noindex' }

export default async function OnboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 text-center">
        <div className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Step 1 of 1
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Set up your workspace</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This takes 30 seconds. You can change everything later.
        </p>
      </div>

      <OnboardForm defaultName={userName} />
    </div>
  )
}
