import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.PORTAL_SESSION_SECRET ?? 'dev-portal-secret-change-in-production'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
export const SESSION_COOKIE = 'portal_session'

export function createPortalSession(clientId: string): {
  value:   string
  maxAge:  number
} {
  const expiresAt = Date.now() + SEVEN_DAYS_MS
  const payload   = `${clientId}|${expiresAt}`
  const sig       = createHmac('sha256', SECRET).update(payload).digest('hex')
  return {
    value:  `${payload}|${sig}`,
    maxAge: Math.floor(SEVEN_DAYS_MS / 1000),
  }
}

export function verifyPortalSession(cookie: string): string | null {
  const parts = cookie.split('|')
  if (parts.length !== 3) return null
  const [clientId, expiresAt, sig] = parts
  if (!clientId || !expiresAt || !sig) return null
  const payload  = `${clientId}|${expiresAt}`
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex')
  try {
    const a = Buffer.from(sig,      'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  if (Date.now() > parseInt(expiresAt, 10)) return null
  return clientId
}
