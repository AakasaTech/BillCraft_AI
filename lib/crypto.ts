import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

// AES-256-GCM for at-rest encryption of OAuth client secrets / refresh
// tokens (org_email_connections). Requires ENCRYPTION_KEY: a 32-byte key,
// base64-encoded, e.g. generated with `openssl rand -base64 32`.

const ALGO      = 'aes-256-gcm'
const IV_BYTES  = 12 // recommended nonce size for GCM
const TAG_BYTES = 16

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY is not configured')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes (generate with: openssl rand -base64 32)')
  }
  return key
}

/** Encrypts a UTF-8 string. Output packs iv | authTag | ciphertext, base64-encoded. */
export function encrypt(plaintext: string): string {
  const key    = getKey()
  const iv     = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const body   = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag    = cipher.getAuthTag()
  return Buffer.concat([iv, tag, body]).toString('base64')
}

/** Reverses encrypt(). Throws if the payload was tampered with or the key is wrong. */
export function decrypt(payload: string): string {
  const key       = getKey()
  const buf       = Buffer.from(payload, 'base64')
  const iv        = buf.subarray(0, IV_BYTES)
  const tag       = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const encrypted = buf.subarray(IV_BYTES + TAG_BYTES)
  const decipher  = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const body = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return body.toString('utf8')
}
