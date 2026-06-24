import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/app/sidebar'
import { Header } from '@/components/app/header'
import { TrialBanner } from '@/components/billing/trial-banner'
import { getInitials } from '@/lib/utils'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect('/login')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id, name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!userRecord?.organization_id) {
    redirect('/onboard')
  }

  const [{ data: org }, { data: sub }] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, slug, trial_ends_at')
      .eq('id', userRecord.organization_id)
      .single(),
    supabase
      .from('subscriptions')
      .select('status')
      .eq('organization_id', userRecord.organization_id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ])

  const userName = userRecord.name ?? user.email?.split('@')[0] ?? 'User'
  const orgName  = org?.name ?? 'My workspace'

  // Determine trial banner state
  const hasActiveSub = !!sub
  const trialEndsAt  = org?.trial_ends_at ? new Date(org.trial_ends_at) : null
  const now          = new Date()
  const inTrial      = !hasActiveSub && !!trialEndsAt && trialEndsAt > now
  const trialExpired = !hasActiveSub && !!trialEndsAt && trialEndsAt <= now
  const trialDaysLeft = inTrial
    ? Math.ceil((trialEndsAt!.getTime() - now.getTime()) / 86_400_000)
    : null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar orgName={orgName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          orgName={orgName}
          userName={userName}
          userEmail={user.email ?? ''}
          userInitials={getInitials(userName)}
        />
        {(inTrial || trialExpired) && (
          <TrialBanner
            status={trialExpired ? 'expired' : 'trial'}
            trialDaysLeft={trialDaysLeft}
          />
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
