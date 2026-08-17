import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmailConnections } from '@/components/settings/email-connections'
import type { EmailConnectionProvider, EmailConnectionStatus } from '@/types/database'

export const metadata = { title: 'Custom Email Sending — BillCraft AI' }

export interface ConnectionRow {
  provider:        EmailConnectionProvider
  status:          EmailConnectionStatus
  connected_email: string | null
  last_error:      string | null
}

export default async function EmailConnectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: org }, { data: connectionsRaw }] = await Promise.all([
    supabase.from('organizations').select('active_email_provider').eq('id', orgId).single(),
    // Only non-secret columns — client_secret/refresh_token/access_token never leave the server.
    supabase
      .from('org_email_connections')
      .select('provider, status, connected_email, last_error')
      .eq('organization_id', orgId),
  ])

  return (
    <EmailConnections
      canManage={userRecord.role === 'owner' || userRecord.role === 'admin'}
      activeProvider={org?.active_email_provider ?? null}
      connections={(connectionsRaw ?? []) as ConnectionRow[]}
    />
  )
}
