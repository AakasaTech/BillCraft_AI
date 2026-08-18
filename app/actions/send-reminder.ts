'use server'

import { createElement } from 'react'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isEmailConfigured, resolveFromAddress } from '@/lib/email/mailer'
import { sendClientFacingEmail } from '@/lib/email/org-mailer'
import { buildReminderEmail } from '@/lib/email/reminder-template'
import { substituteVars } from '@/lib/email/template-renderer'
import type { Invoice, InvoiceItem, Client, Organization } from '@/types/database'

type ActionResult = { error?: string; success?: boolean }

function fmt(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount) }
  catch { return `${currency} ${amount.toFixed(2)}` }
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) } catch { return d }
}

const REMINDER_STATUSES = ['sent', 'viewed', 'partial', 'overdue']

/**
 * Fetches the org logo and returns it as a base64 data URL so react-pdf
 * doesn't need to make outbound HTTP requests at render time.
 * Falls back to logo_url: null on any error (PDF renders without logo).
 */
async function resolveLogo(org: Organization): Promise<Organization> {
  if (!org.logo_url) return org
  try {
    const res = await fetch(org.logo_url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return { ...org, logo_url: null }
    const buf         = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'image/png'
    const dataUrl     = `data:${contentType};base64,${buf.toString('base64')}`
    return { ...org, logo_url: dataUrl }
  } catch {
    return { ...org, logo_url: null }
  }
}

export async function sendReminderAction(id: string, aiDraftBody?: string): Promise<ActionResult> {
  try {
    return await _sendReminderAction(id, aiDraftBody)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[sendReminderAction] unhandled error:', message)
    return { error: `Failed to send reminder: ${message}` }
  }
}

async function _sendReminderAction(id: string, aiDraftBody?: string): Promise<ActionResult> {
  if (!isEmailConfigured()) return { error: 'Email sending is not configured.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return { error: 'No organization found' }

  const orgId = userRecord.organization_id

  const [{ data: invoice }, { data: itemsRaw }, { data: org }, { data: emailTpl }] = await Promise.all([
    supabase
      .from('invoices').select('*, clients(*)').eq('id', id)
      .eq('organization_id', orgId).is('deleted_at', null).single(),
    supabase
      .from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase
      .from('organizations').select('*').eq('id', orgId).single(),
    supabase
      .from('email_templates').select('subject, body')
      .eq('organization_id', orgId).eq('type', 'reminder')
      .maybeSingle(),
  ])

  if (!invoice || !org) return { error: 'Invoice not found' }

  const inv    = invoice as Invoice & { clients: Client | null }
  const client = inv.clients

  const fromEmail = resolveFromAddress((org as Organization).email_prefix)
  if (!fromEmail) return { error: 'Sender email is not configured.' }

  if (!client?.email) return { error: 'Client has no email address. Add one in the client settings.' }
  if (!REMINDER_STATUSES.includes(inv.status)) return { error: 'Reminders can only be sent for sent, viewed, partial, or overdue invoices.' }

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { InvoicePDF }     = await import('@/lib/pdf/invoice-pdf')
  const items              = (itemsRaw ?? []) as InvoiceItem[]

  // Pre-fetch the org logo so react-pdf doesn't try to fetch it at render time.
  // If the fetch fails (private bucket, network issue) we fall back to no logo.
  const orgWithLogo = await resolveLogo(org as Organization)

  const pdfBuffer = await renderToBuffer(
    createElement(InvoicePDF, { invoice: inv, items, client, org: orgWithLogo }) as any,
  )

  const shareUrl = inv.share_token && process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/p/${inv.share_token}`
    : undefined

  let customSubject: string | undefined
  let customBody:    string | undefined

  const vars = {
    client_name:    client.name,
    org_name:       (org as Organization).name,
    invoice_number: inv.invoice_number,
    amount_due:     fmt(inv.amount_due, inv.currency),
    total:          fmt(inv.total, inv.currency),
    issue_date:     fmtDate(inv.issue_date),
    due_date:       fmtDate(inv.due_date),
    invoice_url:    shareUrl ?? '',
  }

  // AI draft body takes priority; fall back to saved email template
  customBody    = aiDraftBody ?? (emailTpl ? substituteVars(emailTpl.body,    vars) : undefined)
  customSubject = emailTpl ? substituteVars(emailTpl.subject, vars) : undefined

  const { subject, html, text } = buildReminderEmail(inv, client, org as Organization, shareUrl, customSubject, customBody)

  const ccList = (client as Client).cc_emails?.filter(Boolean) ?? []

  const { id: sendId, error: sendError } = await sendClientFacingEmail(orgId, supabase, fromEmail, {
    to:      client.email,
    cc:      ccList.length ? ccList : undefined,
    subject,
    html,
    text,
    attachments: [{
      filename: `invoice-${inv.invoice_number}.pdf`,
      content:  Buffer.from(pdfBuffer).toString('base64'),
    }],
  })

  if (sendError) return { error: sendError }

  const now = new Date().toISOString()

  // Log to email_logs (fire-and-forget)
  void supabase.from('email_logs').insert({
    organization_id:      orgId,
    invoice_id:           id,
    client_id:            client.id,
    user_id:              user.id,
    to_email:             client.email,
    cc_emails:            ccList,
    subject,
    body:                 text,
    status:               'sent',
    provider:             process.env.EMAIL_PROVIDER ?? 'resend',
    provider_message_id:  sendId ?? null,
    sent_at:              now,
    error_message:        null,
  })

  await supabase
    .from('invoices')
    .update({ last_reminder_sent_at: now })
    .eq('id', id)
    .eq('organization_id', orgId)

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return { success: true }
}
