import { createHash } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/server'

export interface ApiAuthContext {
  orgId: string;
  keyId: string;
}

/**
 * Validates a Bearer token from the Authorization header.
 * Returns the org context, or null if the key is missing/invalid/revoked/expired.
 */
export async function validateApiKey(authHeader: string | null): Promise<ApiAuthContext | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const key = authHeader.slice(7).trim()
  if (!key) return null

  const hash = createHash('sha256').update(key).digest('hex')
  const db   = createServiceClient()

  const { data } = await db
    .from('api_keys')
    .select('id, organization_id, revoked_at, expires_at')
    .eq('key_hash', hash)
    .single()

  if (!data) return null
  if (data.revoked_at) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  // Update last_used_at in the background — don't await to keep latency low
  db.from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return { orgId: data.organization_id, keyId: data.id }
}
