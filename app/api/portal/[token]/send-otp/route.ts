import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 })
  }

  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, email, name, organization_id')
    .eq('portal_token', token)
    .is('deleted_at', null)
    .single()

  if (!client) return NextResponse.json({ error: 'Portal not found.' }, { status: 404 })
  if (!client.email) return NextResponse.json({ error: 'No email address on file. Contact your vendor.' }, { status: 422 })
  if (client.email.toLowerCase() !== email) {
    return NextResponse.json({ error: 'Email address does not match our records.' }, { status: 401 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', client.organization_id)
    .single()

  // Generate 6-digit OTP, expires in 15 minutes
  const otp        = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt  = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  await supabase
    .from('clients')
    .update({ portal_otp: otp, portal_otp_expires_at: expiresAt })
    .eq('id', client.id)

  const orgName = org?.name ?? 'your vendor'

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL,
    to:      client.email,
    subject: `Your verification code — ${orgName}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:32px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#6366f1;padding:24px 32px;">
      <p style="color:#fff;font-size:18px;font-weight:bold;margin:0;">${orgName}</p>
      <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:4px 0 0;">Client Portal</p>
    </div>
    <div style="padding:32px;">
      <p style="font-size:15px;color:#0f172a;margin:0 0 8px;">Hello, <strong>${client.name}</strong></p>
      <p style="font-size:13px;color:#64748b;margin:0 0 28px;">Use the code below to access your client portal. It expires in 15 minutes.</p>
      <div style="text-align:center;background:#f8fafc;border-radius:10px;padding:24px;letter-spacing:8px;font-size:36px;font-weight:bold;color:#6366f1;font-family:monospace;">
        ${otp}
      </div>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:20px 0 0;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Sent by <strong>${orgName}</strong> via BillCraft AI</p>
    </div>
  </div>
</body>
</html>`,
    text: `Your verification code is: ${otp}\n\nIt expires in 15 minutes.\n\nSent by ${orgName} via BillCraft AI`,
  })

  if (sendError) return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
