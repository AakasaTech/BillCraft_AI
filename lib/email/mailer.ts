import { sendViaGmail } from './gmail-sender'

export interface EmailAttachment {
  filename: string
  content:  string // base64-encoded
}

export interface SendEmailOptions {
  from:         string
  to:           string
  cc?:          string[]
  subject:      string
  html:         string
  text:         string
  attachments?: EmailAttachment[]
}

export interface SendEmailResult {
  id?:    string
  error?: string
}

/** Returns the configured sender address (EMAIL_FROM → RESEND_FROM_EMAIL fallback). */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL ?? ''
}

/** True when the active provider has its required env vars set. */
export function isEmailConfigured(): boolean {
  const provider = (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase()
  if (provider === 'gmail') {
    return !!(
      process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      getEmailFrom()
    )
  }
  return !!(process.env.RESEND_API_KEY && getEmailFrom())
}

/** Send an email via the configured provider (Gmail or Resend). */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'resend').toLowerCase()

  if (provider === 'gmail') {
    return sendViaGmail(opts)
  }

  // Default: Resend
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from:        opts.from,
    to:          opts.to,
    cc:          opts.cc?.length ? opts.cc : undefined,
    subject:     opts.subject,
    html:        opts.html,
    text:        opts.text,
    attachments: opts.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  })

  if (error) return { error: error.message }
  return { id: data?.id }
}
