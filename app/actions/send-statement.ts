'use server'

import { createElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, isEmailConfigured, resolveFromAddress } from '@/lib/email/mailer'
import type { Client, Organization, Payment } from '@/types/database'
import type { StatementEntry } from '@/lib/pdf/statement-pdf'

type ActionResult = { error?: string; success?: boolean }

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) } catch { return d }
}

function fmt(n: number, cur: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n)
  } catch {
    return `${cur} ${n.toFixed(2)}`
  }
}

export async function sendStatementAction(
  clientId: string,
  from: string,
  to:   string,
): Promise<ActionResult> {
  if (!isEmailConfigured()) return { error: 'Email sending is not configured.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, email_prefix').eq('id', user.id).single()
  if (!userRecord?.organization_id) return { error: 'No organization found' }

  const fromEmail = resolveFromAddress(userRecord.email_prefix)
  if (!fromEmail) return { error: 'Sender email is not configured.' }

  const orgId = userRecord.organization_id

  const [{ data: clientRaw }, { data: orgRaw }, { data: invoicesRaw }, { data: paymentsRaw }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).eq('organization_id', orgId).is('deleted_at', null).single(),
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, total, currency, status')
        .eq('client_id', clientId).eq('organization_id', orgId)
        .gte('issue_date', from).lte('issue_date', to)
        .not('status', 'in', '("draft","void","cancelled")')
        .is('deleted_at', null)
        .order('issue_date'),
      supabase
        .from('payments')
        .select('id, invoice_id, amount, currency, payment_date, reference, payment_method')
        .eq('client_id', clientId).eq('organization_id', orgId)
        .gte('payment_date', from).lte('payment_date', to)
        .eq('status', 'completed')
        .order('payment_date'),
    ])

  if (!clientRaw || !orgRaw) return { error: 'Client not found' }

  const client   = clientRaw as Client
  const org      = orgRaw   as Organization
  const invoices = invoicesRaw ?? []
  const payments = (paymentsRaw ?? []) as Payment[]

  if (!client.email) return { error: 'Client has no email address.' }

  const currency     = client.preferred_currency ?? invoices[0]?.currency ?? 'USD'
  const invoiceNums  = Object.fromEntries(invoices.map(i => [i.id, i.invoice_number]))

  const raw: StatementEntry[] = [
    ...invoices.map(inv => ({
      date: inv.issue_date, type: 'invoice' as const,
      reference: inv.invoice_number, description: 'Invoice issued',
      charged: inv.total, paid: 0, balance: 0,
    })),
    ...payments.map(p => ({
      date: p.payment_date, type: 'payment' as const,
      reference: p.reference ?? invoiceNums[p.invoice_id] ?? '—',
      description: `Payment received (${p.payment_method.replace(/_/g, ' ')})`,
      charged: 0, paid: p.amount, balance: 0,
    })),
  ]

  raw.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'invoice' ? -1 : 1))

  let running = 0
  const entries: StatementEntry[] = raw.map(e => {
    running += e.charged - e.paid
    return { ...e, balance: running }
  })

  const totalCharged = entries.reduce((s, e) => s + e.charged, 0)
  const totalPaid    = entries.reduce((s, e) => s + e.paid,    0)
  const outstanding  = totalCharged - totalPaid

  // Generate PDF
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { StatementPDF }   = await import('@/lib/pdf/statement-pdf')

  const pdfBuffer = await renderToBuffer(
    createElement(StatementPDF, {
      org, client, from_date: from, to_date: to, currency,
      entries, totalCharged, totalPaid, outstanding,
    }),
  )

  const subject = `Account Statement from ${org.name} — ${fmtDate(from)} to ${fmtDate(to)}`

  const rowsHtml = entries.map(e => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#64748b;border-bottom:1px solid #e2e8f0;">${fmtDate(e.date)}</td>
      <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e2e8f0;">${e.reference}</td>
      <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #e2e8f0;">${e.description}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right;border-bottom:1px solid #e2e8f0;">${e.charged > 0 ? fmt(e.charged, currency) : '—'}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right;color:#16a34a;border-bottom:1px solid #e2e8f0;">${e.paid > 0 ? fmt(e.paid, currency) : '—'}</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right;font-weight:bold;color:#6366f1;border-bottom:1px solid #e2e8f0;">${fmt(e.balance, currency)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:32px;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#6366f1;padding:28px 32px;">
      <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0 0 4px;">ACCOUNT STATEMENT</p>
      <h1 style="color:#fff;font-size:22px;margin:0;">${org.name}</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#0f172a;margin:0 0 4px;">Hello, <strong>${client.name}</strong></p>
      <p style="font-size:13px;color:#64748b;margin:0 0 24px;">
        Please find your account statement for the period <strong>${fmtDate(from)}</strong> to <strong>${fmtDate(to)}</strong> attached as a PDF.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Date</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Reference</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Charged</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Paid</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Balance</th>
        </tr>
        ${rowsHtml || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#64748b;">No transactions in this period.</td></tr>'}
      </table>

      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;text-align:right;">
        <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Total charged: <strong style="color:#0f172a;">${fmt(totalCharged, currency)}</strong></p>
        <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Total paid: <strong style="color:#16a34a;">${fmt(totalPaid, currency)}</strong></p>
        <p style="margin:0;font-size:15px;font-weight:bold;color:#6366f1;">Outstanding: ${fmt(outstanding, currency)}</p>
      </div>
    </div>
    <div style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by <strong>${org.name}</strong> via BillCraft AI</p>
    </div>
  </div>
</body>
</html>`

  const text = `Account Statement from ${org.name}\n${fmtDate(from)} – ${fmtDate(to)}\n\nTotal charged: ${fmt(totalCharged, currency)}\nTotal paid: ${fmt(totalPaid, currency)}\nOutstanding: ${fmt(outstanding, currency)}\n\nPlease find the full statement attached as a PDF.`

  const filename = `statement-${client.name.replace(/\s+/g, '-')}-${from}-${to}.pdf`

  const { error: sendError } = await sendEmail({
    from:    fromEmail,
    to:      client.email,
    subject,
    html,
    text,
    attachments: [{ filename, content: Buffer.from(pdfBuffer).toString('base64') }],
  })

  if (sendError) return { error: sendError }

  return { success: true }
}
