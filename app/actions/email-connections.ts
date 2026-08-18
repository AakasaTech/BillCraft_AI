'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'
import { buildGoogleAuthorizeUrl } from '@/lib/email/google-oauth'
import { buildMicrosoftAuthorizeUrl } from '@/lib/email/microsoft-oauth'
import type { EmailConnectionProvider } from '@/types/database'

type ActionResult = { error?: string; success?: boolean }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!data?.organization_id) return null
  if (!['owner', 'admin'].includes(data.role)) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

// Saves the org's own OAuth app credentials, then returns the authorize URL
// to redirect the browser to. Credentials are stored (encrypted) before the
// redirect so the callback route can look them up by org + provider.
//
// Wrapped in try/catch deliberately: encrypt() and the redirect-URI builders
// throw on misconfiguration (missing ENCRYPTION_KEY, missing NEXT_PUBLIC_APP_URL)
// rather than returning an error, and an uncaught throw from a Server Action
// surfaces to the user as a bare "server-side exception" page instead of the
// toast-friendly {error} this component expects.
export async function saveEmailProviderCredentialsAction(
  provider: EmailConnectionProvider,
  data: { clientId: string; clientSecret: string; tenantId?: string },
): Promise<ActionResult & { authorizeUrl?: string }> {
  try {
    const ctx = await getCtx()
    if (!ctx) return { error: 'Only owners and admins can manage email connections.' }

    const clientId     = data.clientId.trim()
    const clientSecret = data.clientSecret.trim()
    const tenantId     = data.tenantId?.trim() || null

    if (!clientId || !clientSecret) return { error: 'Client ID and Client Secret are required.' }

    const state = randomBytes(24).toString('hex')
    const stateExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes to complete the OAuth round trip

    const { error } = await ctx.supabase
      .from('org_email_connections')
      .upsert({
        organization_id:        ctx.orgId,
        provider,
        client_id:               clientId,
        client_secret:           encrypt(clientSecret),
        tenant_id:               tenantId,
        status:                  'pending',
        last_error:              null,
        oauth_state:             state,
        oauth_state_expires_at:  stateExpiresAt,
      }, { onConflict: 'organization_id,provider' })

    if (error) return { error: error.message }

    const authorizeUrl = provider === 'google'
      ? buildGoogleAuthorizeUrl(clientId, state)
      : buildMicrosoftAuthorizeUrl(clientId, tenantId, state)

    revalidatePath('/settings/email')
    return { success: true, authorizeUrl }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[saveEmailProviderCredentialsAction]', message)
    return { error: `Could not save this connection: ${message}` }
  }
}

export async function disconnectEmailProviderAction(provider: EmailConnectionProvider): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Only owners and admins can manage email connections.' }

  const { error: delErr } = await ctx.supabase
    .from('org_email_connections')
    .delete()
    .eq('organization_id', ctx.orgId)
    .eq('provider', provider)

  if (delErr) return { error: delErr.message }

  // Clear active_email_provider only if it pointed at the connection we just removed.
  await ctx.supabase
    .from('organizations')
    .update({ active_email_provider: null })
    .eq('id', ctx.orgId)
    .eq('active_email_provider', provider)

  revalidatePath('/settings/email')
  return { success: true }
}

export async function setActiveEmailProviderAction(provider: EmailConnectionProvider): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Only owners and admins can manage email connections.' }

  const { data: conn } = await ctx.supabase
    .from('org_email_connections')
    .select('status')
    .eq('organization_id', ctx.orgId)
    .eq('provider', provider)
    .maybeSingle()

  if (conn?.status !== 'connected') return { error: 'Connect this provider before making it active.' }

  const { error } = await ctx.supabase
    .from('organizations')
    .update({ active_email_provider: provider })
    .eq('id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/settings/email')
  return { success: true }
}
