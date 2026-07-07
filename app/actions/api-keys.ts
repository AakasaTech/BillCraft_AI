'use server'

import { randomBytes, createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result<T = Record<string, never>> = { data?: T; error?: string }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!data?.organization_id) return null
  if (!['owner', 'admin'].includes(data.role)) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

export async function generateApiKeyAction(name: string): Promise<Result<{ id: string; key: string; prefix: string }>> {
  if (!name?.trim()) return { error: 'Name is required' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Unauthorized' }

  // Generate: bc_live_ + 32 random hex chars = 40 chars total
  const random = randomBytes(16).toString('hex')          // 32 hex
  const key    = `bc_live_${random}`                      // full key shown once
  const prefix = `${key.slice(0, 16)}…`                   // "bc_live_AbCd1234…" for display
  const hash   = createHash('sha256').update(key).digest('hex')

  const { data, error } = await ctx.supabase
    .from('api_keys')
    .insert({
      organization_id: ctx.orgId,
      created_by:      ctx.userId,
      name:            name.trim(),
      key_prefix:      prefix,
      key_hash:        hash,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/settings/api')
  return { data: { id: data.id, key, prefix } }
}

export async function revokeApiKeyAction(keyId: string): Promise<Result> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Unauthorized' }

  const { error } = await ctx.supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('organization_id', ctx.orgId) // scoped to org

  if (error) return { error: error.message }

  revalidatePath('/settings/api')
  return { data: {} }
}
