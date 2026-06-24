import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamMembers } from '@/components/settings/team-members'
import type { UserRole } from '@/types/database'

export const metadata = { title: 'Team — BillCraft AI' }

export default async function TeamSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId       = userRecord.organization_id
  const callerRole  = userRecord.role as UserRole

  const [{ data: membersRaw }, { data: invitationsRaw }] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at'),
    supabase
      .from('invitations')
      .select('id, email, role, expires_at, created_at')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  return (
    <TeamMembers
      currentUserId={user.id}
      callerRole={callerRole}
      members={(membersRaw ?? []) as { id: string; name: string; email: string; role: UserRole; created_at: string }[]}
      invitations={(invitationsRaw ?? []) as { id: string; email: string; role: UserRole; expires_at: string; created_at: string }[]}
    />
  )
}
