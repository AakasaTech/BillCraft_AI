import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'
import { exchangeGoogleCode, fetchGoogleEmail } from '@/lib/email/google-oauth'

export const dynamic = 'force-dynamic'

// Built relative to the incoming request URL rather than NEXT_PUBLIC_APP_URL —
// req.url is always a valid absolute URL, so this can never throw even if that
// env var is missing or malformed (unlike new URL(path, envVar), which does).
function redirectTo(req: NextRequest, status: 'connected' | 'error', message?: string) {
  const url = new URL('/settings/email', req.url)
  url.searchParams.set('provider', 'google')
  url.searchParams.set('status', status)
  if (message) url.searchParams.set('message', message)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  try {
    const url         = new URL(req.url)
    const code        = url.searchParams.get('code')
    const state       = url.searchParams.get('state')
    const oauthError  = url.searchParams.get('error')

    if (oauthError) return redirectTo(req, 'error', oauthError)
    if (!code || !state) return redirectTo(req, 'error', 'Missing authorization code or state.')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirectTo(req, 'error', 'Please sign in and try connecting again.')

    // RLS scopes this lookup to the caller's own org — the state match alone
    // isn't the security boundary, org membership is.
    const { data: conn } = await supabase
      .from('org_email_connections')
      .select('*')
      .eq('provider', 'google')
      .eq('oauth_state', state)
      .single()

    if (!conn) return redirectTo(req, 'error', 'This connection request was not found. Please try again.')
    if (!conn.oauth_state_expires_at || new Date(conn.oauth_state_expires_at) < new Date()) {
      return redirectTo(req, 'error', 'This connection request expired. Please try again.')
    }

    const clientSecret = decrypt(conn.client_secret)
    const tokenResult  = await exchangeGoogleCode(conn.client_id, clientSecret, code)

    if ('error' in tokenResult) {
      await supabase
        .from('org_email_connections')
        .update({ status: 'error', last_error: tokenResult.error, oauth_state: null, oauth_state_expires_at: null })
        .eq('id', conn.id)
      return redirectTo(req, 'error', tokenResult.error)
    }

    const connectedEmail = await fetchGoogleEmail(tokenResult.accessToken)

    await supabase
      .from('org_email_connections')
      .update({
        status:                  'connected',
        connected_email:         connectedEmail,
        refresh_token:           encrypt(tokenResult.refreshToken),
        connected_by:            user.id,
        connected_at:            new Date().toISOString(),
        oauth_state:             null,
        oauth_state_expires_at:  null,
        last_error:              null,
      })
      .eq('id', conn.id)

    // First connection for the org — make it active automatically. If they
    // already have another provider active, leave it as-is; they can switch
    // from Settings.
    await supabase
      .from('organizations')
      .update({ active_email_provider: 'google' })
      .eq('id', conn.organization_id)
      .is('active_email_provider', null)

    return redirectTo(req, 'connected')
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[google/callback]', message)
    return redirectTo(req, 'error', message)
  }
}
