import { NextRequest, NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, isEmailConfigured, getEmailFrom } from '@/lib/email/mailer'
import { buildReminderEmail } from '@/lib/email/reminder-template'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function addDays(base: Date, n: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isEmailConfigured() || !getEmailFrom()) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
  }
  const fromEmail = getEmailFrom()

  const supabase = createServiceClient()

  // Today as a UTC midnight Date (for consistent comparisons)
  const todayDate = new Date()
  todayDate.setUTCHours(0, 0, 0, 0)
  const todayStr = todayDate.toISOString().slice(0, 10)

  // 1 — Orgs that have auto-reminders enabled
  const { data: orgs, error: orgsErr } = await supabase
    .from('organizations')
    .select('id, reminder_offsets')
    .eq('auto_reminders_enabled', true)

  if (orgsErr) return NextResponse.json({ error: orgsErr.message }, { status: 500 })
  if (!orgs?.length) return NextResponse.json({ date: todayStr, sent: 0 })

  // 2 — For each org compute the set of due_dates that should fire today
  //     offset = -3 → target_due_date = today + 3  (3 days before due)
  //     offset =  0 → target_due_date = today       (on due date)
  //     offset =  7 → target_due_date = today - 7   (7 days overdue)
  const orgDueDateSets = new Map<string, Set<string>>()
  const allDueDates    = new Set<string>()

  for (const org of orgs) {
    const offsets = (org.reminder_offsets as number[]) ?? []
    const dates   = new Set<string>()
    for (const offset of offsets) {
      const d = addDays(todayDate, -offset)
      dates.add(d)
      allDueDates.add(d)
    }
    orgDueDateSets.set(org.id, dates)
  }

  if (allDueDates.size === 0) return NextResponse.json({ date: todayStr, sent: 0 })

  // 3 — Fetch all candidate invoices in one query
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('*, clients(id, name, email, organization_id, address_line1, address_line2, city, state, postal_code, country_code, tax_registration_number, notes, preferred_currency, preferred_language, phone, is_active, created_at, updated_at, deleted_at, created_by)')
    .in('organization_id', orgs.map((o) => o.id))
    .in('status', ['sent', 'viewed', 'partial', 'overdue'])
    .is('deleted_at', null)
    .in('due_date', [...allDueDates])

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // 4 — Keep only invoices that match their own org's due-date set and have a client email
  const eligible = (invoices ?? []).filter((inv: any) => {
    const orgDates = orgDueDateSets.get(inv.organization_id)
    return inv.clients?.email && orgDates?.has(inv.due_date)
  })

  if (!eligible.length) return NextResponse.json({ date: todayStr, sent: 0 })

  const eligibleIds = eligible.map((inv: any) => inv.id as string)

  // 5 — Deduplication: skip invoices that already received a reminder email today
  const { data: sentToday } = await supabase
    .from('email_logs')
    .select('invoice_id')
    .in('invoice_id', eligibleIds)
    .gte('sent_at', todayDate.toISOString())

  const alreadySentSet = new Set(sentToday?.map((l: any) => l.invoice_id) ?? [])
  const toRemind       = eligible.filter((inv: any) => !alreadySentSet.has(inv.id))

  if (!toRemind.length) return NextResponse.json({ date: todayStr, sent: 0 })

  // 6 — Batch-load orgs (for email content) and invoice items
  const orgIds     = [...new Set<string>(toRemind.map((inv: any) => inv.organization_id))]
  const remindIds  = toRemind.map((inv: any) => inv.id as string)

  const [{ data: fullOrgs }, { data: allItems }] = await Promise.all([
    supabase.from('organizations').select('*').in('id', orgIds),
    supabase.from('invoice_items').select('*').in('invoice_id', remindIds).order('sort_order'),
  ])

  const orgMap: Record<string, any>   = Object.fromEntries((fullOrgs ?? []).map((o: any) => [o.id, o]))
  const itemsMap: Record<string, any[]> = {}
  for (const item of allItems ?? []) {
    if (!itemsMap[item.invoice_id]) itemsMap[item.invoice_id] = []
    itemsMap[item.invoice_id].push(item)
  }

  // 7 — Send emails
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { InvoicePDF }     = await import('@/lib/pdf/invoice-pdf')

  let sent = 0
  const errors: string[] = []

  for (const inv of toRemind) {
    try {
      const client = inv.clients
      const org    = orgMap[inv.organization_id]
      if (!org) continue

      const items = itemsMap[inv.id] ?? []

      const pdfBuffer = await renderToBuffer(
        createElement(InvoicePDF, { invoice: inv, items, client, org }) as any,
      )

      const shareUrl = inv.share_token && process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/p/${inv.share_token}`
        : undefined
      const { subject, html, text } = buildReminderEmail(inv, client, org, shareUrl)

      const ccList = (client.cc_emails as string[] | undefined)?.filter(Boolean) ?? []

      const { id: sendId, error: sendErr } = await sendEmail({
        from:    fromEmail,
        to:      client.email,
        cc:      ccList.length ? ccList : undefined,
        subject,
        html,
        text,
        attachments: [{
          filename: `invoice-${inv.invoice_number}.pdf`,
          content:  Buffer.from(pdfBuffer).toString('base64'),
        }],
      })

      if (sendErr) throw new Error(sendErr)

      const now = new Date().toISOString()

      // Log to email_logs (async, non-blocking)
      void supabase.from('email_logs').insert({
        organization_id:     inv.organization_id,
        invoice_id:          inv.id,
        client_id:           client.id,
        user_id:             null,
        to_email:            client.email,
        cc_emails:           ccList,
        subject,
        body:                text,
        status:              'sent',
        provider:            process.env.EMAIL_PROVIDER ?? 'resend',
        provider_message_id: sendId ?? null,
        sent_at:             now,
        error_message:       null,
      })

      await supabase
        .from('invoices')
        .update({ last_reminder_sent_at: now })
        .eq('id', inv.id)

      sent++
    } catch (err) {
      errors.push(`invoice ${inv.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ date: todayStr, processed: toRemind.length, sent, errors })
}
