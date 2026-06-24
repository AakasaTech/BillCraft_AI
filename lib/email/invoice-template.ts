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

export function buildInvoiceEmail(
  invoice: Invoice,
  client: Client,
  org: Organization,
  shareUrl?: string,
  customSubject?: string,
  customBody?: string,
): { subject: string; html: string; text: string } {
  const cur = invoice.currency

  const subject = customSubject ?? `Invoice ${invoice.invoice_number} from ${org.name}`
  const introText = customBody ?? 'Please find your invoice details below. The PDF is attached to this email.'

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
  .body    { padding: 32px 40px; }
  .meta    { display: flex; justify-content: space-between; background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; }
  .meta-item label { display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .meta-item span  { font-size: 14px; font-weight: 600; color: #0f172a; }
  table   { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #f8fafc; padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:not(:first-child) { text-align: right; }
  tbody td { padding: 10px 12px; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; }
  tbody td:not(:first-child) { text-align: right; }
  .totals { margin-left: auto; width: 220px; }
  .totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #64748b; }
  .totals-row.grand { font-size: 16px; font-weight: 700; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 4px; }
  .section-title { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 8px; }
  .notes { font-size: 13px; color: #475569; line-height: 1.6; white-space: pre-wrap; background: #f8fafc; border-radius: 8px; padding: 12px 16px; }
  .footer { padding: 20px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  .btn { display: inline-block; margin: 20px 0; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${org.name}</h1>
    <p>Invoice ${invoice.invoice_number}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#0f172a;margin-top:0">Hi ${client.name},</p>
    <p style="font-size:14px;color:#475569">${introText.replace(/\n/g, '<br/>')}</p>

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

    ${shareUrl ? `
    <div style="text-align:center;margin:24px 0">
      <a href="${shareUrl}" class="btn">View invoice online</a>
    </div>
    ` : ''}

    ${invoice.payment_instructions ? `
    <p class="section-title">Payment Instructions</p>
    <div class="notes">${invoice.payment_instructions.replace(/\n/g, '<br/>')}</div>
    ` : ''}

    ${invoice.notes ? `
    <p class="section-title">Notes</p>
    <div class="notes">${invoice.notes.replace(/\n/g, '<br/>')}</div>
    ` : ''}

    <p style="font-size:13px;color:#64748b;margin-top:24px">
      If you have any questions about this invoice, please don't hesitate to reach out.
    </p>
    <p style="font-size:14px;color:#0f172a;margin-bottom:0">Thank you for your business.</p>
  </div>
  <div class="footer">
    This invoice was sent by ${org.name} using BillCraft AI.<br/>
    Please do not reply to this email.
  </div>
</div>
</body>
</html>`

  const text = `${subject}

Hi ${client.name},

${introText}

Invoice #:  ${invoice.invoice_number}
Issue date: ${fmtDate(invoice.issue_date)}
Due date:   ${fmtDate(invoice.due_date)}
Amount due: ${fmt(invoice.amount_due, cur)}
${shareUrl ? `\nView invoice online: ${shareUrl}` : ''}
${invoice.payment_instructions ? `\nPayment Instructions:\n${invoice.payment_instructions}` : ''}
${invoice.notes ? `\nNotes:\n${invoice.notes}` : ''}

Thank you for your business.

—
${org.name} · Sent via BillCraft AI`

  return { subject, html, text }
}
