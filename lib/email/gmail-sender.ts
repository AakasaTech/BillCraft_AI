import https from 'node:https'

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function postForm(url: string, params: Record<string, string>): Promise<Record<string, string>> {
  const body   = new URLSearchParams(params).toString()
  const parsed = new URL(url)
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        path:     parsed.pathname,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        keepAlive: false,
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
      {
        hostname: parsed.hostname,
        path:     parsed.pathname,
        method:   'POST',
        headers:  {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        keepAlive: false,
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

// ── OAuth token ───────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const resp = await postForm('https://oauth2.googleapis.com/token', {
    client_id:     process.env.GMAIL_CLIENT_ID!,
    client_secret: process.env.GMAIL_CLIENT_SECRET!,
    refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
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

interface GmailSendOptions {
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

export async function sendViaGmail(opts: GmailSendOptions): Promise<{ id?: string; error?: string }> {
  try {
    const token  = await getAccessToken()
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
    return { id: typeof result.id === 'string' ? result.id : undefined }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
