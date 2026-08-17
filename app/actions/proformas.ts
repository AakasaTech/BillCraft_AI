'use server'

import { createElement } from 'react'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlanStatus } from '@/lib/subscription'
import { sendEmail, isEmailConfigured, getEmailFrom } from '@/lib/email/mailer'
import { buildProformaEmail } from '@/lib/email/proforma-template'
import { proformaFormSchema, type ProformaFormData } from '@/lib/validations/proformas'
import type {
  Proforma, ProformaItem, Estimate, EstimateItem, Client, ClientSubunit, Organization,
} from '@/types/database'

type ActionResult = { error?: string; success?: boolean }

export type { ProformaFormData }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

function computeTotals(
  items:        ProformaFormData['items'],
  discount:     number,
  taxType:      string,
  taxRate:      number,
  localTransport: number,
) {
  const subtotal  = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const afterDisc = Math.max(0, subtotal - discount)
  const taxAmount = taxType !== 'none' ? afterDisc * (taxRate / 100) : 0
  // Local transport is treated as an untaxed charge layered on top of the taxed total.
  const total     = afterDisc + taxAmount + localTransport
  return { subtotal, tax_amount: taxAmount, total }
}

export async function createProformaAction(data: ProformaFormData): Promise<ActionResult> {
  const parsed = proformaFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(ctx.orgId, ctx.supabase)
  if (!plan.canUseTradingFields) {
    return { error: 'Proformas are only available for trading-category organizations.' }
  }

  const { data: proNumber, error: numErr } = await ctx.supabase
    .rpc('next_proforma_number', { p_org_id: ctx.orgId })
  if (numErr) return { error: numErr.message }

  const d = parsed.data
  const { subtotal, tax_amount, total } = computeTotals(
    d.items, d.discount_amount, d.tax_type, d.tax_rate, d.local_transport_amount,
  )

  const { data: proforma, error: insertErr } = await ctx.supabase
    .from('proformas')
    .insert({
      organization_id:        ctx.orgId,
      client_id:               d.client_id,
      client_subunit_id:       d.client_subunit_id || null,
      created_by:              ctx.userId,
      proforma_number:         proNumber,
      status:                  'draft',
      issue_date:              d.issue_date,
      expiry_date:             d.expiry_date || null,
      currency:                d.currency,
      exchange_rate:           1,
      subtotal,
      discount_amount:         d.discount_amount,
      tax_type:                d.tax_type,
      tax_rate:                d.tax_rate,
      tax_amount,
      total,
      shipping_terms:          d.shipping_terms || null,
      local_transport_amount:  d.local_transport_amount,
      notes:                   d.notes || null,
      terms:                   d.terms || null,
    })
    .select('id')
    .single()

  if (insertErr || !proforma) return { error: insertErr?.message ?? 'Failed to create proforma' }

  const { error: itemsErr } = await ctx.supabase
    .from('proforma_items')
    .insert(
      d.items.map((item, i) => ({
        proforma_id:        proforma.id,
        organization_id:    ctx.orgId,
        description:        item.description,
        quantity:            item.quantity,
        unit_price:          item.unit_price,
        hs_code:             item.hs_code || null,
        country_of_origin:   item.country_of_origin || null,
        subtotal:            item.quantity * item.unit_price,
        total:               item.quantity * item.unit_price,
        sort_order:          i,
      }))
    )

  if (itemsErr) return { error: itemsErr.message }

  revalidatePath('/proformas')
  redirect(`/proformas/${proforma.id}`)
}

export async function updateProformaAction(id: string, data: ProformaFormData): Promise<ActionResult> {
  const parsed = proformaFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const d = parsed.data
  const { subtotal, tax_amount, total } = computeTotals(
    d.items, d.discount_amount, d.tax_type, d.tax_rate, d.local_transport_amount,
  )

  const { error: updateErr } = await ctx.supabase
    .from('proformas')
    .update({
      client_id:               d.client_id,
      client_subunit_id:       d.client_subunit_id || null,
      proforma_number:         d.proforma_number,
      issue_date:              d.issue_date,
      expiry_date:             d.expiry_date || null,
      currency:                d.currency,
      subtotal,
      discount_amount:         d.discount_amount,
      tax_type:                d.tax_type,
      tax_rate:                d.tax_rate,
      tax_amount,
      total,
      shipping_terms:          d.shipping_terms || null,
      local_transport_amount:  d.local_transport_amount,
      notes:                   d.notes || null,
      terms:                   d.terms || null,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .eq('status', 'draft')

  if (updateErr) return { error: updateErr.message }

  // Replace items
  await ctx.supabase.from('proforma_items').delete().eq('proforma_id', id)
  const { error: itemsErr } = await ctx.supabase
    .from('proforma_items')
    .insert(
      d.items.map((item, i) => ({
        proforma_id:        id,
        organization_id:    ctx.orgId,
        description:        item.description,
        quantity:            item.quantity,
        unit_price:          item.unit_price,
        hs_code:             item.hs_code || null,
        country_of_origin:   item.country_of_origin || null,
        subtotal:            item.quantity * item.unit_price,
        total:               item.quantity * item.unit_price,
        sort_order:          i,
      }))
    )

  if (itemsErr) return { error: itemsErr.message }

  revalidatePath('/proformas')
  revalidatePath(`/proformas/${id}`)
  redirect(`/proformas/${id}`)
}

export async function deleteProformaAction(id: string): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('proformas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/proformas')
  return { success: true }
}

// No 'declined' counterpart — proformas.status has no declined value (see
// ProformaStatus / the CHECK constraint), unlike estimates. Staff can mark
// accepted or expired manually here for cases the client can't respond online.
export async function markProformaStatusAction(
  id: string,
  status: 'accepted' | 'expired',
): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('proformas')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/proformas')
  revalidatePath(`/proformas/${id}`)
  return { success: true }
}

// Reads live as actions here (rather than inline page queries, unlike estimates)
// only because this prompt asked for them by name in this file.
export async function getProformaAction(
  id: string,
): Promise<{ proforma?: Proforma; items?: ProformaItem[]; error?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const [{ data: proformaRaw }, { data: itemsRaw }] = await Promise.all([
    ctx.supabase
      .from('proformas')
      .select('*, clients(*)')
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
      .is('deleted_at', null)
      .single(),
    ctx.supabase
      .from('proforma_items')
      .select('*')
      .eq('proforma_id', id)
      .order('sort_order'),
  ])

  if (!proformaRaw) return { error: 'Proforma not found' }

  return {
    proforma: proformaRaw as Proforma,
    items:    (itemsRaw ?? []) as ProformaItem[],
  }
}

export async function listProformasAction(): Promise<{
  proformas?: (Proforma & { client_name: string })[]
  error?:     string
}> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { data, error } = await ctx.supabase
    .from('proformas')
    .select('*, clients(name)')
    .eq('organization_id', ctx.orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  type Row = Proforma & { clients: { name: string } | null }
  const rows = (data ?? []) as Row[]

  return {
    proformas: rows.map(r => ({ ...r, client_name: r.clients?.name ?? '—' })),
  }
}

export async function convertEstimateToProformaAction(
  id: string,
): Promise<{ error?: string; proformaId?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(ctx.orgId, ctx.supabase)
  if (!plan.canUseTradingFields) {
    return { error: 'Proformas are only available for trading-category organizations.' }
  }

  const [{ data: estimateRaw }, { data: itemsRaw }] = await Promise.all([
    ctx.supabase
      .from('estimates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
      .is('deleted_at', null)
      .single(),
    ctx.supabase
      .from('estimate_items')
      .select('*')
      .eq('estimate_id', id)
      .order('sort_order'),
  ])

  if (!estimateRaw) return { error: 'Estimate not found' }

  const estimate = estimateRaw as Estimate
  const items    = (itemsRaw ?? []) as EstimateItem[]

  // Get next proforma number
  const { data: proformaNumber, error: numErr } = await ctx.supabase
    .rpc('next_proforma_number', { p_org_id: ctx.orgId })
  if (numErr) return { error: numErr.message }

  const today = new Date().toISOString().slice(0, 10)

  const { data: proforma, error: proErr } = await ctx.supabase
    .from('proformas')
    .insert({
      organization_id:   ctx.orgId,
      client_id:         estimate.client_id,
      client_subunit_id: estimate.client_subunit_id,
      created_by:        ctx.userId,
      proforma_number:   proformaNumber,
      status:            'draft',
      issue_date:      today,
      expiry_date:     null,
      currency:        estimate.currency,
      exchange_rate:   1,
      subtotal:        estimate.subtotal,
      discount_amount: estimate.discount_amount,
      tax_type:        estimate.tax_type,
      tax_rate:        estimate.tax_rate,
      tax_amount:      estimate.tax_amount,
      total:           estimate.total,
      notes:           estimate.notes,
      // Unlike the estimate→invoice path (convertToInvoiceAction in estimates.ts,
      // which drops terms), terms IS copied here — proformas carry shipping/
      // payment terms language forward instead of re-deriving it downstream.
      terms:           estimate.terms,
    })
    .select('id')
    .single()

  if (proErr || !proforma) return { error: proErr?.message ?? 'Failed to create proforma' }

  // Copy line items
  if (items.length > 0) {
    await ctx.supabase.from('proforma_items').insert(
      items.map(item => ({
        proforma_id:       proforma.id,
        organization_id:   ctx.orgId,
        description:       item.description,
        quantity:          item.quantity,
        unit_price:        item.unit_price,
        hs_code:           null,
        country_of_origin: null,
        subtotal:          item.subtotal,
        total:             item.total,
        sort_order:        item.sort_order,
      }))
    )
  }

  // Mark estimate as accepted + link to proforma (converted_proforma_id, NOT
  // converted_invoice_id — that column stays reserved for the service-category
  // estimate→invoice path in convertToInvoiceAction)
  await ctx.supabase
    .from('estimates')
    .update({
      status:                'accepted',
      responded_at:          new Date().toISOString(),
      converted_proforma_id: proforma.id,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  revalidatePath('/estimates')
  revalidatePath(`/estimates/${id}`)
  revalidatePath('/proformas')

  return { proformaId: proforma.id }
}

export async function convertProformaToInvoiceAction(
  id: string,
): Promise<{ error?: string; invoiceId?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(ctx.orgId, ctx.supabase)
  if (!plan.canUseTradingFields) {
    return { error: 'Proformas are only available for trading-category organizations.' }
  }

  const [{ data: proformaRaw }, { data: itemsRaw }] = await Promise.all([
    ctx.supabase
      .from('proformas')
      .select('*')
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
      .is('deleted_at', null)
      .single(),
    ctx.supabase
      .from('proforma_items')
      .select('*')
      .eq('proforma_id', id)
      .order('sort_order'),
  ])

  if (!proformaRaw) return { error: 'Proforma not found' }

  const proforma = proformaRaw as Proforma
  const items    = (itemsRaw ?? []) as ProformaItem[]

  // Get next invoice number — shares the org's regular invoice counter, NOT
  // the proforma's own counter.
  const { data: invoiceNumber, error: numErr } = await ctx.supabase
    .rpc('next_invoice_number', { p_org_id: ctx.orgId })
  if (numErr) return { error: numErr.message }

  const today = new Date().toISOString().slice(0, 10)

  const { data: invoice, error: invErr } = await ctx.supabase
    .from('invoices')
    .insert({
      organization_id:        ctx.orgId,
      client_id:               proforma.client_id,
      created_by:              ctx.userId,
      invoice_number:          invoiceNumber,
      status:                  'draft',
      issue_date:              today,
      due_date:                null,
      currency:                proforma.currency,
      exchange_rate:           proforma.exchange_rate,
      subtotal:                proforma.subtotal,
      discount_amount:         proforma.discount_amount,
      tax_type:                proforma.tax_type,
      tax_rate:                proforma.tax_rate,
      tax_amount:              proforma.tax_amount,
      total:                   proforma.total,
      amount_paid:             0,
      notes:                   proforma.notes,
      // Trading fields carried over from the proforma.
      shipping_terms:          proforma.shipping_terms,
      local_transport_amount:  proforma.local_transport_amount,
      client_subunit_id:       proforma.client_subunit_id,
      source_proforma_id:      proforma.id,
      // po_reference has no equivalent column on proformas (only invoices got
      // one in the trading-category migration) — nothing to copy from, so it's
      // left null and set directly on the invoice if/when needed.
    })
    .select('id')
    .single()

  if (invErr || !invoice) return { error: invErr?.message ?? 'Failed to create invoice' }

  // Copy line items, including HS code / country of origin per line
  if (items.length > 0) {
    await ctx.supabase.from('invoice_items').insert(
      items.map(item => ({
        invoice_id:        invoice.id,
        organization_id:   ctx.orgId,
        description:       item.description,
        quantity:          item.quantity,
        unit_price:        item.unit_price,
        tax_rate:          null,
        tax_amount:        0,
        discount_amount:   0,
        hs_code:           item.hs_code,
        country_of_origin: item.country_of_origin,
        subtotal:          item.subtotal,
        total:             item.total,
        sort_order:        item.sort_order,
      }))
    )
  }

  // Mark proforma as converted + link to invoice
  await ctx.supabase
    .from('proformas')
    .update({
      status:               'converted',
      converted_invoice_id: invoice.id,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  revalidatePath('/proformas')
  revalidatePath(`/proformas/${id}`)
  revalidatePath('/invoices')

  return { invoiceId: invoice.id }
}

export async function sendProformaEmailAction(id: string): Promise<ActionResult> {
  if (!isEmailConfigured()) return { error: 'Email sending is not configured.' }
  const fromEmail = getEmailFrom()
  if (!fromEmail) return { error: 'Sender email is not configured.' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const [{ data: proformaRaw }, { data: itemsRaw }, { data: org }] = await Promise.all([
    ctx.supabase
      .from('proformas')
      .select('*, clients(*)')
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
      .is('deleted_at', null)
      .single(),
    ctx.supabase
      .from('proforma_items')
      .select('*')
      .eq('proforma_id', id)
      .order('sort_order'),
    ctx.supabase
      .from('organizations')
      .select('*')
      .eq('id', ctx.orgId)
      .single(),
  ])

  if (!proformaRaw || !org) return { error: 'Proforma not found' }

  const proforma = proformaRaw as Proforma & { clients: Client | null }
  const client   = proforma.clients
  if (!client?.email) return { error: 'Client has no email address.' }

  let clientSubunit: ClientSubunit | null = null
  if (proforma.client_subunit_id) {
    const { data } = await ctx.supabase
      .from('client_subunits')
      .select('*')
      .eq('id', proforma.client_subunit_id)
      .single()
    clientSubunit = (data as ClientSubunit | null) ?? null
  }

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { ProformaPDF }    = await import('@/lib/pdf/proforma-pdf')
  const items               = (itemsRaw ?? []) as ProformaItem[]

  const pdfBuffer = await renderToBuffer(
    createElement(ProformaPDF, { proforma, items, client, clientSubunit, org: org as Organization }) as any,
  )

  // Unlike sendEstimateEmailAction / send-invoice.ts, there's no custom
  // email_templates lookup here — the email_templates.type CHECK constraint
  // only allows 'invoice' | 'reminder' | 'estimate', so a 'proforma' template
  // type doesn't exist yet. Always uses the built-in template until that's added.
  const { subject, html, text } = buildProformaEmail(proforma, client, org as Organization)

  const ccList = (client as Client).cc_emails?.filter(Boolean) ?? []

  const { id: sendId, error: sendError } = await sendEmail({
    from:    fromEmail,
    to:      client.email,
    cc:      ccList.length ? ccList : undefined,
    subject,
    html,
    text,
    attachments: [{
      filename: `proforma-${proforma.proforma_number}.pdf`,
      content:  Buffer.from(pdfBuffer).toString('base64'),
    }],
  })

  if (sendError) return { error: sendError }

  const now = new Date().toISOString()

  void ctx.supabase.from('email_logs').insert({
    organization_id:     ctx.orgId,
    client_id:           client.id,
    user_id:             ctx.userId,
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

  if (proforma.status === 'draft') {
    await ctx.supabase
      .from('proformas')
      .update({ status: 'sent', sent_at: now })
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
  }

  revalidatePath('/proformas')
  revalidatePath(`/proformas/${id}`)
  return { success: true }
}
