'use server'

import { createElement } from 'react'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
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

export async function sendReminderAction(id: string, aiDraftBody?: string): Promise<ActionResult> {
  if (!process.env.RESEND_API_KEY)    return { error: 'Email sending is not configured.' }
  if (!process.env.RESEND_FROM_EMAIL) return { error: 'Sender email is not configured.' }

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

  if (!client?.email) return { error: 'Client has no email address. Add one in the client settings.' }
  if (!REMINDER_STATUSES.includes(inv.status)) return { error: 'Reminders can only be sent for sent, viewed, partial, or overdue invoices.' }

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { InvoicePDF }     = await import('@/lib/pdf/invoice-pdf')
  const items              = (itemsRaw ?? []) as InvoiceItem[]

  const pdfBuffer = await renderToBuffer(
    createElement(InvoicePDF, { invoice: inv, items, client, org: org as Organization }),
  )

  const resend   = new Resend(process.env.RESEND_API_KEY)
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

  const { data: sendData, error: sendError } = await resend.emails.send({
    from:        process.env.RESEND_FROM_EMAIL,
    to:          client.email,
    subject,
    html,
    text,
    attachments: [{
      filename: `invoice-${inv.invoice_number}.pdf`,
      content:  Buffer.from(pdfBuffer).toString('base64'),
    }],
  })

  if (sendError) return { error: sendError.message }

  const now = new Date().toISOString()

  // Log to email_logs (fire-and-forget)
  void supabase.from('email_logs').insert({
    organization_id:      orgId,
    invoice_id:           id,
    client_id:            client.id,
    user_id:              user.id,
    to_email:             client.email,
    cc_emails:            [],
    subject,
    body:                 text,
    status:               'sent',
    provider:             'resend',
    provider_message_id:  sendData?.id ?? null,
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
