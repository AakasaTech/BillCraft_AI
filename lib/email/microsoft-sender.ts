// Pure Microsoft Graph sendMail call given an already-valid access token.
// Token acquisition/refresh (and persisting Microsoft's rotated refresh
// tokens) is orchestrated by lib/email/org-mailer.ts, which has DB access —
// this module only knows how to build the Graph payload and POST it.

export interface GraphSendOptions {
  from:         string // the connected mailbox — informational only, Graph always sends as the token's owner
  to:           string
  cc?:          string[]
  subject:      string
  html:         string
  text:         string
  attachments?: Array<{ filename: string; content: string }> // base64-encoded
}

export async function sendGraphMail(
  accessToken: string,
  opts: GraphSendOptions,
): Promise<{ id?: string; error?: string }> {
  const message = {
    subject: opts.subject,
    body: { contentType: 'HTML', content: opts.html },
    toRecipients: [{ emailAddress: { address: opts.to } }],
    ccRecipients: (opts.cc ?? []).map(addr => ({ emailAddress: { address: addr } })),
    attachments: (opts.attachments ?? []).map(att => ({
      '@odata.type':  '#microsoft.graph.fileAttachment',
      name:           att.filename,
      contentType:    att.filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      contentBytes:   att.content,
    })),
  }

  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    })

    // Graph returns 202 Accepted with an empty body on success — no message ID available.
    if (res.status === 202) return { id: undefined }

    const json = await res.json().catch(() => ({})) as { error?: { message?: string } }
    return { error: json.error?.message ?? `Graph sendMail failed (HTTP ${res.status})` }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
