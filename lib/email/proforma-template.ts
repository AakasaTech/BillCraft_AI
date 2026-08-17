import type { Proforma, Client, Organization } from '@/types/database'

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

// No shareUrl/CTA button here (unlike buildEstimateEmail) — there's no public
// proforma view page yet, so nothing to link to. The PDF attachment is the
// only way the client sees this document for now.
export function buildProformaEmail(
  proforma: Proforma,
  client:   Client,
  org:      Organization,
  customSubject?: string,
  customBody?:    string,
): { subject: string; html: string; text: string } {
  const cur       = proforma.currency
  const subject   = customSubject ?? `Proforma Invoice ${proforma.proforma_number} from ${org.name}`
  const introText = customBody ?? `Please find your proforma invoice details below. The PDF is attached to this email.${proforma.expiry_date ? ` This proforma is valid until <strong>${fmtDate(proforma.expiry_date)}</strong>.` : ''}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${subject}</title>
<style>
  body { margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .wrapper { max-width:600px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
  .header  { background:#0d9488; padding:32px 40px; }
  .header h1 { margin:0; color:#fff; font-size:22px; font-weight:700; }
  .header p  { margin:6px 0 0; color:#ccfbf1; font-size:14px; }
  .body    { padding:32px 40px; }
  .meta    { display:flex; justify-content:space-between; background:#f8fafc; border-radius:8px; padding:16px 20px; margin-bottom:28px; }
  .meta-item label { display:block; font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; }
  .meta-item span  { font-size:14px; font-weight:600; color:#0f172a; }
  .footer { padding:20px 40px; background:#f8fafc; border-top:1px solid #e2e8f0; text-align:center; font-size:12px; color:#94a3b8; }
  .note   { font-size:13px; color:#475569; line-height:1.6; white-space:pre-wrap; background:#f8fafc; border-radius:8px; padding:12px 16px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${org.name}</h1>
    <p>Proforma Invoice ${proforma.proforma_number}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#0f172a;margin-top:0">Hi ${client.name},</p>
    <p style="font-size:14px;color:#475569">${introText.replace(/\n/g, '<br/>')}</p>

    <div class="meta">
      <div class="meta-item">
        <label>Proforma #</label>
        <span>${proforma.proforma_number}</span>
      </div>
      <div class="meta-item">
        <label>Issue date</label>
        <span>${fmtDate(proforma.issue_date)}</span>
      </div>
      ${proforma.expiry_date ? `
      <div class="meta-item">
        <label>Valid until</label>
        <span>${fmtDate(proforma.expiry_date)}</span>
      </div>` : ''}
      ${proforma.shipping_terms ? `
      <div class="meta-item">
        <label>Shipping terms</label>
        <span>${proforma.shipping_terms}</span>
      </div>` : ''}
      <div class="meta-item">
        <label>Total</label>
        <span style="color:#0d9488">${fmt(proforma.total, cur)}</span>
      </div>
    </div>

    ${proforma.notes ? `
    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:24px 0 8px">Notes</p>
    <div class="note">${proforma.notes.replace(/\n/g, '<br/>')}</div>
    ` : ''}

    ${proforma.terms ? `
    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:24px 0 8px">Terms &amp; Conditions</p>
    <div class="note">${proforma.terms.replace(/\n/g, '<br/>')}</div>
    ` : ''}

    <p style="font-size:14px;color:#0f172a;margin-bottom:0">Thank you for considering our services.</p>
  </div>
  <div class="footer">
    This proforma invoice was sent by ${org.name} using BillCraft AI.<br/>
    Please do not reply to this email.
  </div>
</div>
</body>
</html>`

  const text = `${subject}

Hi ${client.name},

${introText.replace(/<[^>]+>/g, '')}

Proforma #:  ${proforma.proforma_number}
Issue date:  ${fmtDate(proforma.issue_date)}
${proforma.expiry_date ? `Valid until: ${fmtDate(proforma.expiry_date)}\n` : ''}${proforma.shipping_terms ? `Shipping terms: ${proforma.shipping_terms}\n` : ''}Total:       ${fmt(proforma.total, cur)}
${proforma.notes ? `\nNotes:\n${proforma.notes}` : ''}
${proforma.terms ? `\nTerms & Conditions:\n${proforma.terms}` : ''}

Thank you for considering our services.

—
${org.name} · Sent via BillCraft AI`

  return { subject, html, text }
}
