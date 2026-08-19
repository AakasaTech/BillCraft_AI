import https from 'node:https'

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function postForm(url: string, params: Record<string, string>): Promise<Record<string, string>> {
  const body   = new URLSearchParams(params).toString()
  const parsed = new URL(url)
  return new Promise((resolve, reject) => {
    const req = https.request(
      parsed,
      {
        method:  'POST',
        headers: {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let raw = ''
        res.on('data', (c) => { raw += c })
        res.on('end', () => {
          try { resolve(JSON.parse(raw)) }
          catch { reject(new Error(`Token endpoint parse error: ${raw.slice(0, 200)}`)) }
        })
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function postJson(url: string, body: unknown, token: string): Promise<Record<string, unknown>> {
  const data   = JSON.stringify(body)
  const parsed = new URL(url)
  return new Promise((resolve, reject) => {
    const req = https.request(
      parsed,
      {
        method:  'POST',
        headers: {
          'Authorization':  `Bearer ${token}`,
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = ''
        res.on('data', (c) => { raw += c })
        res.on('end', () => {
          try { resolve(JSON.parse(raw)) }
          catch { reject(new Error(`Gmail API parse error: ${raw.slice(0, 200)}`)) }
        })
      },
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function getJson(url: string, token: string): Promise<Record<string, unknown>> {
  const parsed = new URL(url)
  return new Promise((resolve, reject) => {
    const req = https.request(
      parsed,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let raw = ''
        res.on('data', (c) => { raw += c })
        res.on('end', () => {
          try { resolve(JSON.parse(raw)) }
          catch { reject(new Error(`Gmail API parse error: ${raw.slice(0, 200)}`)) }
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

// Pulls the bare address out of a "Name <addr@x.com>" or "addr@x.com" header value.
function extractEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/)
  return (match?.[1] ?? headerValue).trim().toLowerCase()
}

// ── OAuth token ───────────────────────────────────────────────────────────────

export interface GmailCredentials {
  clientId:     string
  clientSecret: string
  refreshToken: string
}

async function getAccessToken(creds: GmailCredentials): Promise<string> {
  const resp = await postForm('https://oauth2.googleapis.com/token', {
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type:    'refresh_token',
  })
  if (!resp.access_token) {
    throw new Error(resp.error_description ?? resp.error ?? 'Failed to obtain Gmail access token')
  }
  return resp.access_token
}

// ── MIME builder ──────────────────────────────────────────────────────────────

function b64chunk(buf: Buffer, lineLen = 76): string {
  const s     = buf.toString('base64')
  const lines: string[] = []
  for (let i = 0; i < s.length; i += lineLen) lines.push(s.slice(i, i + lineLen))
  return lines.join('\r\n')
}

function encodeSubject(subject: string): string {
  // RFC 2047 encoded word — keeps non-ASCII subjects intact in all mail clients
  return `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
}

export interface GmailSendOptions {
  from:         string
  to:           string
  cc?:          string[]
  subject:      string
  html:         string
  text:         string
  attachments?: Array<{ filename: string; content: string }> // base64-encoded
}

function buildMime(opts: GmailSendOptions): Buffer {
  const boundary = `bc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
  const altBound = `alt_${Math.random().toString(36).slice(2)}`

  const lines: string[] = [
    'MIME-Version: 1.0',
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    ...(opts.cc?.length ? [`CC: ${opts.cc.join(', ')}`] : []),
    `Subject: ${encodeSubject(opts.subject)}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBound}"`,
    '',
    `--${altBound}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64chunk(Buffer.from(opts.text, 'utf-8')),
    '',
    `--${altBound}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64chunk(Buffer.from(opts.html, 'utf-8')),
    '',
    `--${altBound}--`,
  ]

  for (const att of opts.attachments ?? []) {
    const type = att.filename.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : 'application/octet-stream'
    lines.push(
      '',
      `--${boundary}`,
      `Content-Type: ${type}; name="${att.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename}"`,
      '',
      b64chunk(Buffer.from(att.content, 'base64')), // re-chunk for MIME compliance
    )
  }

  lines.push('', `--${boundary}--`)
  return Buffer.from(lines.join('\r\n'), 'utf-8')
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Low-level send given already-known OAuth app credentials + refresh token. */
export async function sendGmailMessage(
  creds: GmailCredentials,
  opts: GmailSendOptions,
): Promise<{ id?: string; error?: string; warning?: string }> {
  try {
    const token  = await getAccessToken(creds)
    const mime   = buildMime(opts)
    // Gmail API requires base64url (RFC 4648 §5: - and _ instead of + and /)
    const raw    = mime.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const result = await postJson(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      { raw },
      token,
    )
    if (result.error) {
      const err = result.error as { message?: string } | string
      return { error: typeof err === 'string' ? err : (err.message ?? 'Gmail send failed') }
    }
    const id = typeof result.id === 'string' ? result.id : undefined

    // Gmail silently REWRITES the From header back to the account's own
    // address (no error) when it isn't a verified "Send mail as" alias on
    // this account — so a mismatched from can't be caught above. Read the
    // sent message back and compare; best-effort only, never fails the send.
    if (id) {
      try {
        const sent = await getJson(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From`,
          token,
        )
        const headers = (sent.payload as { headers?: Array<{ name: string; value: string }> } | undefined)?.headers
        const actualFromHeader = headers?.find(h => h.name === 'From')?.value
        if (actualFromHeader) {
          const actual    = extractEmail(actualFromHeader)
          const requested = extractEmail(opts.from)
          if (actual && requested && actual !== requested) {
            return {
              id,
              warning: `Sent as ${actual} instead of ${requested} — Gmail ignores a custom From address until it's added as a verified "Send mail as" alias in that account's Gmail settings.`,
            }
          }
        }
      } catch {
        // Verification is best-effort; the send itself already succeeded.
      }
    }

    return { id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

/** Platform-wide sender — single account configured via env vars. */
export async function sendViaGmail(opts: GmailSendOptions): Promise<{ id?: string; error?: string }> {
  return sendGmailMessage(
    {
      clientId:     process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
    },
    opts,
  )
}
