/**
 * One-time script to generate a Gmail API refresh token for BillCraft AI.
 *
 * Prerequisites:
 *   1. Go to Google Cloud Console → APIs & Services → Credentials
 *   2. Edit your OAuth 2.0 Client ID
 *   3. Under "Authorized redirect URIs" add:  http://localhost:4242/callback
 *   4. Save, then run this script:
 *
 *   GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=yyy node scripts/get-gmail-token.mjs
 *
 * It will open a URL, start a local server to capture the callback,
 * exchange the code for tokens, and print your refresh token.
 *
 * Add these to .env.local:
 *   EMAIL_PROVIDER=gmail
 *   GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
 *   GMAIL_CLIENT_SECRET=your-client-secret
 *   GMAIL_REFRESH_TOKEN=<printed by this script>
 *   EMAIL_FROM=you@aakasa.dev
 */

import http  from 'node:http'
import https from 'node:https'
import { URL, URLSearchParams } from 'node:url'

const CLIENT_ID     = process.env.GMAIL_CLIENT_ID
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET
const REDIRECT_URI  = 'http://localhost:4242/callback'
const SCOPE         = 'https://www.googleapis.com/auth/gmail.send'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET before running.\n')
  process.exit(1)
}

const authUrl =
  'https://accounts.google.com/o/oauth2/auth?' +
  new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         SCOPE,
    access_type:   'offline',
    prompt:        'consent', // forces refresh_token to be returned
  }).toString()

console.log('\n📋  Visit this URL to authorise BillCraft AI to send email:\n')
console.log(authUrl)
console.log('\n⏳  Waiting for Google to redirect to localhost:4242 …\n')

// Start a temporary local server to catch the OAuth callback
const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, 'http://localhost:4242')
  const code = url.searchParams.get('code')

  if (!code) {
    res.end('No code found — please try again.')
    server.close()
    return
  }

  res.end('<h2>✅ Authorised! You can close this tab.</h2>')
  server.close()

  // Exchange the code for tokens
  const body = new URLSearchParams({
    code,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri:  REDIRECT_URI,
    grant_type:    'authorization_code',
  }).toString()

  const result = await new Promise((resolve, reject) => {
    const postReq = https.request(
      {
        hostname: 'oauth2.googleapis.com',
        path:     '/token',
        method:   'POST',
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (r) => {
        let raw = ''
        r.on('data', (c) => { raw += c })
        r.on('end', () => {
          try { resolve(JSON.parse(raw)) }
          catch { reject(new Error(raw)) }
        })
      },
    )
    postReq.on('error', reject)
    postReq.write(body)
    postReq.end()
  })

  if (result.error) {
    console.error('\n❌  Token exchange failed:', result.error_description ?? result.error)
    process.exit(1)
  }

  console.log('\n✅  Success! Add the following to your .env.local:\n')
  console.log(`EMAIL_PROVIDER=gmail`)
  console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`)
  console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`)
  console.log(`GMAIL_REFRESH_TOKEN=${result.refresh_token}`)
  console.log(`EMAIL_FROM=your-email@aakasa.dev`)
  console.log()

  if (!result.refresh_token) {
    console.warn('⚠️  No refresh_token returned. Make sure "prompt=consent" is set and you revoked')
    console.warn('   previous access at https://myaccount.google.com/permissions before re-running.')
  }
})

server.listen(4242)
