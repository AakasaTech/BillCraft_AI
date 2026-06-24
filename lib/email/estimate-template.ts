import type { Estimate, Client, Organization } from '@/types/database'

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

export function buildEstimateEmail(
  estimate: Estimate,
  client: Client,
  org: Organization,
  shareUrl?: string,
  customSubject?: string,
  customBody?: string,
): { subject: string; html: string; text: string } {
  const cur       = estimate.currency
  const subject   = customSubject ?? `Estimate ${estimate.estimate_number} from ${org.name}`
  const introText = customBody ?? `Please find your estimate details below. The PDF is attached to this email.${estimate.expiry_date ? ` This estimate is valid until <strong>${fmtDate(estimate.expiry_date)}</strong>.` : ''}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
<style>
  body { margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .wrapper { max-width:600px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
  .header  { background:#f59e0b; padding:32px 40px; }
  .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; }
  .header p  { margin:6px 0 0; color:#fef3c7; font-size:14px; }
  .body    { padding:32px 40px; }
  .meta    { display:flex; justify-content:space-between; background:#f8fafc; border-radius:8px; padding:16px 20px; margin-bottom:28px; }
  .meta-item label { display:block; font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
  .meta-item span  { font-size:14px; font-weight:600; color:#0f172a; }
  .footer { padding:20px 40px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; font-size:12px; color:#94a3b8; }
  .btn    { display:inline-block; margin:20px 0; background:#f59e0b; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:14px; font-weight:600; }
  .note   { font-size:13px; color:#475569; line-height:1.6; white-space:pre-wrap; background:#f8fafc; border-radius:8px; padding:12px 16px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${org.name}</h1>
    <p>Estimate ${estimate.estimate_number}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#0f172a;margin-top:0">Hi ${client.name},</p>
    <p style="font-size:14px;color:#475569">${introText.replace(/\n/g, '<br/>')}</p>

    <div class="meta">
      <div class="meta-item">
        <label>Estimate #</label>
        <span>${estimate.estimate_number}</span>
      </div>
      <div class="meta-item">
        <label>Issue date</label>
        <span>${fmtDate(estimate.issue_date)}</span>
      </div>
      ${estimate.expiry_date ? `
      <div class="meta-item">
        <label>Valid until</label>
        <span>${fmtDate(estimate.expiry_date)}</span>
      </div>` : ''}
      <div class="meta-item">
        <label>Total</label>
        <span style="color:#f59e0b">${fmt(estimate.total, cur)}</span>
      </div>
    </div>

    ${shareUrl ? `
    <div style="text-align:center;margin:24px 0">
      <a href="${shareUrl}" class="btn">View &amp; Respond Online</a>
    </div>
    <p style="font-size:13px;color:#64748b;text-align:center;">
      You can accept or decline this estimate from the link above.
    </p>
    ` : ''}

    ${estimate.notes ? `
    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:24px 0 8px">Notes</p>
    <div class="note">${estimate.notes.replace(/\n/g, '<br/>')}</div>
    ` : ''}

    ${estimate.terms ? `
    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:24px 0 8px">Terms &amp; Conditions</p>
    <div class="note">${estimate.terms.replace(/\n/g, '<br/>')}</div>
    ` : ''}

    <p style="font-size:14px;color:#0f172a;margin-bottom:0">Thank you for considering our services.</p>
  </div>
  <div class="footer">
    This estimate was sent by ${org.name} using BillCraft AI.<br/>
    Please do not reply to this email.
  </div>
</div>
</body>
</html>`

  const text = `${subject}

Hi ${client.name},

${introText.replace(/<[^>]+>/g, '')}

Estimate #:  ${estimate.estimate_number}
Issue date:  ${fmtDate(estimate.issue_date)}
${estimate.expiry_date ? `Valid until: ${fmtDate(estimate.expiry_date)}\n` : ''}Total:       ${fmt(estimate.total, cur)}
${shareUrl ? `\nView & respond online: ${shareUrl}` : ''}
${estimate.notes ? `\nNotes:\n${estimate.notes}` : ''}
${estimate.terms ? `\nTerms & Conditions:\n${estimate.terms}` : ''}

Thank you for considering our services.

—
${org.name} · Sent via BillCraft AI`

  return { subject, html, text }
}
