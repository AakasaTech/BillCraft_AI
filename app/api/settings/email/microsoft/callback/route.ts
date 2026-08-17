import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt } from '@/lib/crypto'
import { exchangeMicrosoftCode, fetchMicrosoftEmail } from '@/lib/email/microsoft-oauth'

export const dynamic = 'force-dynamic'

function redirectTo(status: 'connected' | 'error', message?: string) {
  const url = new URL('/settings/email', process.env.NEXT_PUBLIC_APP_URL)
  url.searchParams.set('provider', 'microsoft')
  url.searchParams.set('status', status)
  if (message) url.searchParams.set('message', message)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const url        = new URL(req.url)
  const code       = url.searchParams.get('code')
  const state      = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error')

  if (oauthError) return redirectTo('error', oauthError)
  if (!code || !state) return redirectTo('error', 'Missing authorization code or state.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirectTo('error', 'Please sign in and try connecting again.')

  const { data: conn } = await supabase
    .from('org_email_connections')
    .select('*')
    .eq('provider', 'microsoft')
    .eq('oauth_state', state)
    .single()

  if (!conn) return redirectTo('error', 'This connection request was not found. Please try again.')
  if (!conn.oauth_state_expires_at || new Date(conn.oauth_state_expires_at) < new Date()) {
    return redirectTo('error', 'This connection request expired. Please try again.')
  }

  const clientSecret = decrypt(conn.client_secret)
  const tokenResult  = await exchangeMicrosoftCode(conn.client_id, clientSecret, conn.tenant_id, code)

  if ('error' in tokenResult) {
    await supabase
      .from('org_email_connections')
      .update({ status: 'error', last_error: tokenResult.error, oauth_state: null, oauth_state_expires_at: null })
      .eq('id', conn.id)
    return redirectTo('error', tokenResult.error)
  }

  const connectedEmail = await fetchMicrosoftEmail(tokenResult.accessToken)

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

  await supabase
    .from('organizations')
    .update({ active_email_provider: 'microsoft' })
    .eq('id', conn.organization_id)
    .is('active_email_provider', null)

  return redirectTo('connected')
}
