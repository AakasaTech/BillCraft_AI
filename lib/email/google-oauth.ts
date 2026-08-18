// OAuth2 authorization-code flow against an org's OWN Google Cloud OAuth
// client (not a BillCraft-owned app) — see docs/custom-email-sending for the
// walkthrough orgs follow to obtain client_id/client_secret.

const SCOPE = 'https://www.googleapis.com/auth/gmail.send'

export function googleRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  return `${appUrl}/api/settings/email/google/callback`
}

export function buildGoogleAuthorizeUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  googleRedirectUri(),
    response_type: 'code',
    scope:         SCOPE,
    access_type:   'offline',
    prompt:        'consent', // forces a refresh_token on every connect, even if previously authorized
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

interface TokenResponse {
  access_token?:  string
  refresh_token?: string
  expires_in?:    number
  error?:         string
  error_description?: string
}

async function postForm(url: string, params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams(params).toString(),
  })
  return res.json()
}

export async function exchangeGoogleCode(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | { error: string }> {
  const resp = await postForm('https://oauth2.googleapis.com/token', {
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    grant_type:    'authorization_code',
    redirect_uri:  googleRedirectUri(),
  })
  if (!resp.access_token || !resp.refresh_token) {
    return { error: resp.error_description ?? resp.error ?? 'Google did not return a refresh token. Make sure the OAuth consent prompt was set to request offline access.' }
  }
  return { accessToken: resp.access_token, refreshToken: resp.refresh_token, expiresIn: resp.expires_in ?? 3600 }
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const json = await res.json() as { email?: string }
    return json.email ?? null
  } catch {
    return null
  }
}
