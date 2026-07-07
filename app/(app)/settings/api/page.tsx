import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApiKeysClient } from './api-keys-client'

export const metadata: Metadata = { title: 'API Keys — Settings' }

export default async function ApiSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userRow?.organization_id) redirect('/onboard')

  const canManage = ['owner', 'admin'].includes(userRow.role)

  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, expires_at, revoked_at, created_at')
    .eq('organization_id', userRow.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Use API keys to connect TaskCraft AI and other tools to your BillCraft account.
          Keys have full access to your organization — keep them secret.
        </p>
      </div>

      <ApiKeysClient
        keys={(keys ?? []).map((k) => ({
          id:          k.id,
          name:        k.name,
          prefix:      k.key_prefix,
          lastUsedAt:  k.last_used_at,
          expiresAt:   k.expires_at,
          revokedAt:   k.revoked_at,
          createdAt:   k.created_at,
        }))}
        canManage={canManage}
      />
    </div>
  )
}
