// OAuth2 authorization-code flow against an org's OWN Azure App Registration
// (Entra ID) — see docs/custom-email-sending for the walkthrough orgs follow
// to obtain their Application (client) ID / client secret / tenant.

const SCOPE = 'offline_access https://graph.microsoft.com/Mail.Send'

export function microsoftRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/settings/email/microsoft/callback`
}

function authority(tenantId: string | null): string {
  // 'common' accepts both personal and work/school accounts; orgs can supply
  // their own tenant ID instead to restrict sign-in to their tenant only.
  return `https://login.microsoftonline.com/${tenantId?.trim() || 'common'}`
}

export function buildMicrosoftAuthorizeUrl(clientId: string, tenantId: string | null, state: string): string {
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  microsoftRedirectUri(),
    response_type: 'code',
    response_mode: 'query',
    scope:         SCOPE,
    state,
  })
  return `${authority(tenantId)}/oauth2/v2.0/authorize?${params.toString()}`
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

export async function exchangeMicrosoftCode(
  clientId: string,
  clientSecret: string,
  tenantId: string | null,
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | { error: string }> {
  const resp = await postForm(`${authority(tenantId)}/oauth2/v2.0/token`, {
    client_id:     clientId,
    client_secret: clientSecret,
    code,
    grant_type:    'authorization_code',
    redirect_uri:  microsoftRedirectUri(),
    scope:         SCOPE,
  })
  if (!resp.access_token || !resp.refresh_token) {
    return { error: resp.error_description ?? resp.error ?? 'Microsoft did not return a refresh token.' }
  }
  return { accessToken: resp.access_token, refreshToken: resp.refresh_token, expiresIn: resp.expires_in ?? 3600 }
}

export async function refreshMicrosoftToken(
  clientId: string,
  clientSecret: string,
  tenantId: string | null,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | { error: string }> {
  const resp = await postForm(`${authority(tenantId)}/oauth2/v2.0/token`, {
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
    scope:         SCOPE,
  })
  if (!resp.access_token) {
    return { error: resp.error_description ?? resp.error ?? 'Failed to refresh Microsoft access token' }
  }
  // Microsoft rotates refresh tokens on each use; fall back to the old one if
  // a new one wasn't issued (rare, but the API contract allows it).
  return { accessToken: resp.access_token, refreshToken: resp.refresh_token ?? refreshToken, expiresIn: resp.expires_in ?? 3600 }
}

export async function fetchMicrosoftEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const json = await res.json() as { mail?: string; userPrincipalName?: string }
    return json.mail ?? json.userPrincipalName ?? null
  } catch {
    return null
  }
}
