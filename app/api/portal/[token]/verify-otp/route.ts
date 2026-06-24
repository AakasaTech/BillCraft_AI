import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createPortalSession, SESSION_COOKIE } from '@/lib/portal-session'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const body = await req.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!code) return NextResponse.json({ error: 'Code is required.' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, portal_otp, portal_otp_expires_at')
    .eq('portal_token', token)
    .is('deleted_at', null)
    .single()

  if (!client) return NextResponse.json({ error: 'Portal not found.' }, { status: 404 })

  if (!client.portal_otp || !client.portal_otp_expires_at) {
    return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 401 })
  }

  if (new Date(client.portal_otp_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 401 })
  }

  if (client.portal_otp !== code) {
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 })
  }

  // Clear the OTP so it can't be reused
  await supabase
    .from('clients')
    .update({ portal_otp: null, portal_otp_expires_at: null })
    .eq('id', client.id)

  const session = createPortalSession(client.id)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   session.maxAge,
    path:     '/',
  })
  return response
}
