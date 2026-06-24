import type { Invoice, Client, Organization } from '@/types/database'

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) } catch { return d }
}

function daysOverdue(dueDate: string | null): number | null {
  if (!dueDate) return null
  const diff = Date.now() - new Date(dueDate).getTime()
  const days = Math.floor(diff / 86_400_000)
  return days > 0 ? days : null
}

export function buildReminderEmail(
  invoice: Invoice,
  client: Client,
  org: Organization,
  shareUrl?: string,
  customSubject?: string,
  customBody?: string,
): { subject: string; html: string; text: string } {
  const cur      = invoice.currency
  const overdue  = daysOverdue(invoice.due_date)
  const subject  = customSubject ?? `Payment reminder: Invoice ${invoice.invoice_number} from ${org.name}`
  const introText = customBody ?? 'This is a friendly reminder that the following invoice is awaiting payment. The invoice PDF is attached to this email for your reference.'

  const overdueNotice = overdue
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#c2410c;">
          This invoice is ${overdue} day${overdue === 1 ? '' : 's'} overdue.
        </p>
        <p style="margin:4px 0 0;font-size:13px;color:#9a3412;">
          Please arrange payment at your earliest convenience.
        </p>
      </div>`
    : ''

  const overdueText = overdue
    ? `⚠ This invoice is ${overdue} day${overdue === 1 ? '' : 's'} overdue.\n\n`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
<style>
  body { margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header  { background: #6366f1; padding: 32px 40px; }
  .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; }
  .header p  { margin: 6px 0 0; color: #c7d2fe; font-size: 14px; }
  .tag { display: inline-block; background: rgba(255,255,255,0.2); color: #fff; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; padding: 3px 10px; border-radius: 20px; margin-bottom: 10px; }
  .body    { padding: 32px 40px; }
  .meta    { display: flex; justify-content: space-between; background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .meta-item label { display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .meta-item span  { font-size: 14px; font-weight: 600; color: #0f172a; }
  .section-title { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 8px; }
  .notes { font-size: 13px; color: #475569; line-height: 1.6; white-space: pre-wrap; background: #f8fafc; border-radius: 8px; padding: 12px 16px; }
  .footer { padding: 20px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="tag">Payment Reminder</div>
    <h1>${org.name}</h1>
    <p>Invoice ${invoice.invoice_number}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#0f172a;margin-top:0">Hi ${client.name},</p>
    <p style="font-size:14px;color:#475569;margin-bottom:20px">${introText.replace(/\n/g, '<br/>')}</p>

    ${overdueNotice}

    ${shareUrl ? `
    <div style="text-align:center;margin:0 0 24px">
      <a href="${shareUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">View invoice online</a>
    </div>
    ` : ''}

    <div class="meta">
      <div class="meta-item">
        <label>Invoice #</label>
        <span>${invoice.invoice_number}</span>
      </div>
      <div class="meta-item">
        <label>Issue date</label>
        <span>${fmtDate(invoice.issue_date)}</span>
      </div>
      <div class="meta-item">
        <label>Due date</label>
        <span>${fmtDate(invoice.due_date)}</span>
      </div>
      <div class="meta-item">
        <label>Amount due</label>
        <span style="color:#6366f1">${fmt(invoice.amount_due, cur)}</span>
      </div>
    </div>

    ${invoice.payment_instructions ? `
    <p class="section-title">Payment Instructions</p>
    <div class="notes">${invoice.payment_instructions.replace(/\n/g, '<br/>')}</div>
    ` : ''}

    ${invoice.notes ? `
    <p class="section-title">Notes</p>
    <div class="notes">${invoice.notes.replace(/\n/g, '<br/>')}</div>
    ` : ''}

    <p style="font-size:13px;color:#64748b;margin-top:24px">
      If you have already made payment, please disregard this reminder.
      If you have any questions, please reach out to us directly.
    </p>
    <p style="font-size:14px;color:#0f172a;margin-bottom:0">Thank you.</p>
  </div>
  <div class="footer">
    This reminder was sent by ${org.name} using BillCraft AI.<br/>
    Please do not reply to this email.
  </div>
</div>
</body>
</html>`

  const text = `${subject}

Hi ${client.name},

${introText}
${overdueText}
Invoice #:  ${invoice.invoice_number}
Issue date: ${fmtDate(invoice.issue_date)}
Due date:   ${fmtDate(invoice.due_date)}
Amount due: ${fmt(invoice.amount_due, cur)}
${shareUrl ? `\nView invoice online: ${shareUrl}` : ''}
${invoice.payment_instructions ? `\nPayment Instructions:\n${invoice.payment_instructions}` : ''}
${invoice.notes ? `\nNotes:\n${invoice.notes}` : ''}

If you have already made payment, please disregard this reminder.

—
${org.name} · Sent via BillCraft AI`

  return { subject, html, text }
}
