import { decrypt, encrypt } from '@/lib/crypto'
import { sendEmail } from '@/lib/email/mailer'
import { sendGmailMessage } from '@/lib/email/gmail-sender'
import { sendGraphMail } from '@/lib/email/microsoft-sender'
import { refreshMicrosoftToken } from '@/lib/email/microsoft-oauth'
import type { OrgEmailConnection } from '@/types/database'

export interface OrgSendOptions {
  to:           string
  cc?:          string[]
  subject:      string
  html:         string
  text:         string
  attachments?: Array<{ filename: string; content: string }>
}

export interface OrgSendResult {
  id?:   string
  error?: string
  from:  string // the connected mailbox that actually sent this
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getActiveConnection(orgId: string, supabase: any): Promise<OrgEmailConnection | null> {
  const { data: org } = await supabase
    .from('organizations')
    .select('active_email_provider')
    .eq('id', orgId)
    .single()

  if (!org?.active_email_provider) return null

  const { data: conn } = await supabase
    .from('org_email_connections')
    .select('*')
    .eq('organization_id', orgId)
    .eq('provider', org.active_email_provider)
    .eq('status', 'connected')
    .single()

  return (conn as OrgEmailConnection | null) ?? null
}

/**
 * Sends via the org's connected Google/Microsoft mailbox if one is active
 * and connected; returns null (not an error) when there's no org connection,
 * so callers can fall back to the platform sender.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function trySendViaOrgConnection(
  orgId: string,
  supabase: any,
  opts: OrgSendOptions,
): Promise<OrgSendResult | null> {
  const conn = await getActiveConnection(orgId, supabase)
  if (!conn) return null

  const clientSecret = decrypt(conn.client_secret)
  const from = conn.connected_email ?? 'unknown'

  if (conn.provider === 'google') {
    if (!conn.refresh_token) return { error: 'Google connection is missing a refresh token — reconnect it in Settings.', from }
    const result = await sendGmailMessage(
      { clientId: conn.client_id, clientSecret, refreshToken: decrypt(conn.refresh_token) },
      { from, ...opts },
    )
    return { ...result, from }
  }

  // Microsoft — refresh tokens rotate on every use, so persist the new one.
  if (!conn.refresh_token) return { error: 'Microsoft connection is missing a refresh token — reconnect it in Settings.', from }
  const refreshed = await refreshMicrosoftToken(conn.client_id, clientSecret, conn.tenant_id, decrypt(conn.refresh_token))
  if ('error' in refreshed) {
    await supabase
      .from('org_email_connections')
      .update({ status: 'error', last_error: refreshed.error })
      .eq('id', conn.id)
    return { error: refreshed.error, from }
  }

  void supabase
    .from('org_email_connections')
    .update({ refresh_token: encrypt(refreshed.refreshToken) })
    .eq('id', conn.id)

  const result = await sendGraphMail(refreshed.accessToken, { from, ...opts })
  return { ...result, from }
}

/**
 * Client-facing document sends (invoices, estimates, proformas, reminders)
 * go through here: use the org's connected Google/Microsoft mailbox if one
 * is active, otherwise fall back to the platform sender (Resend/shared Gmail).
 * Never used for platform system email (invitations, portal OTPs) — those
 * always use the platform sender directly via lib/email/mailer.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendClientFacingEmail(
  orgId: string,
  supabase: any,
  platformFrom: string,
  opts: OrgSendOptions,
): Promise<OrgSendResult> {
  const orgResult = await trySendViaOrgConnection(orgId, supabase, opts)
  if (orgResult) return orgResult

  const result = await sendEmail({ from: platformFrom, ...opts })
  return { ...result, from: platformFrom }
}
