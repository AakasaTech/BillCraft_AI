'use server'

import { createElement } from 'react'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, isEmailConfigured, getEmailFrom } from '@/lib/email/mailer'
import { buildEstimateEmail } from '@/lib/email/estimate-template'
import { substituteVars } from '@/lib/email/template-renderer'
import { estimateFormSchema, type EstimateFormData } from '@/lib/validations/estimates'
import type { Estimate, EstimateItem, Client, Organization } from '@/types/database'

type ActionResult = { error?: string; success?: boolean }

export type { EstimateFormData }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

function computeTotals(items: EstimateFormData['items'], discount: number, taxType: string, taxRate: number) {
  const subtotal  = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const afterDisc = Math.max(0, subtotal - discount)
  const taxAmount = taxType !== 'none' ? afterDisc * (taxRate / 100) : 0
  const total     = afterDisc + taxAmount
  return { subtotal, tax_amount: taxAmount, total }
}

export async function createEstimateAction(data: EstimateFormData): Promise<ActionResult> {
  const parsed = estimateFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: estNumber, error: numErr } = await ctx.supabase
    .rpc('next_estimate_number', { p_org_id: ctx.orgId })
  if (numErr) return { error: numErr.message }

  const d = parsed.data
  const { subtotal, tax_amount, total } = computeTotals(d.items, d.discount_amount, d.tax_type, d.tax_rate)

  const { data: estimate, error: insertErr } = await ctx.supabase
    .from('estimates')
    .insert({
      organization_id: ctx.orgId,
      client_id:       d.client_id,
      created_by:      ctx.userId,
      estimate_number: estNumber,
      status:          'draft',
      issue_date:      d.issue_date,
      expiry_date:     d.expiry_date || null,
      currency:        d.currency,
      subtotal,
      discount_amount: d.discount_amount,
      tax_type:        d.tax_type,
      tax_rate:        d.tax_rate,
      tax_amount,
      total,
      notes:           d.notes || null,
      terms:           d.terms || null,
    })
    .select('id')
    .single()

  if (insertErr || !estimate) return { error: insertErr?.message ?? 'Failed to create estimate' }

  const { error: itemsErr } = await ctx.supabase
    .from('estimate_items')
    .insert(
      d.items.map((item, i) => ({
        estimate_id:     estimate.id,
        organization_id: ctx.orgId,
        description:     item.description,
        quantity:        item.quantity,
        unit_price:      item.unit_price,
        subtotal:        item.quantity * item.unit_price,
        total:           item.quantity * item.unit_price,
        sort_order:      i,
      }))
    )

  if (itemsErr) return { error: itemsErr.message }

  revalidatePath('/estimates')
  redirect(`/estimates/${estimate.id}`)
}

export async function updateEstimateAction(id: string, data: EstimateFormData): Promise<ActionResult> {
  const parsed = estimateFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const d = parsed.data
  const { subtotal, tax_amount, total } = computeTotals(d.items, d.discount_amount, d.tax_type, d.tax_rate)

  const { error: updateErr } = await ctx.supabase
    .from('estimates')
    .update({
      client_id:       d.client_id,
      estimate_number: d.estimate_number,
      issue_date:      d.issue_date,
      expiry_date:     d.expiry_date || null,
      currency:        d.currency,
      subtotal,
      discount_amount: d.discount_amount,
      tax_type:        d.tax_type,
      tax_rate:        d.tax_rate,
      tax_amount,
      total,
      notes:           d.notes || null,
      terms:           d.terms || null,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .eq('status', 'draft')

  if (updateErr) return { error: updateErr.message }

  // Replace items
  await ctx.supabase.from('estimate_items').delete().eq('estimate_id', id)
  const { error: itemsErr } = await ctx.supabase
    .from('estimate_items')
    .insert(
      d.items.map((item, i) => ({
        estimate_id:     id,
        organization_id: ctx.orgId,
        description:     item.description,
        quantity:        item.quantity,
        unit_price:      item.unit_price,
        subtotal:        item.quantity * item.unit_price,
        total:           item.quantity * item.unit_price,
        sort_order:      i,
      }))
    )

  if (itemsErr) return { error: itemsErr.message }

  revalidatePath('/estimates')
  revalidatePath(`/estimates/${id}`)
  redirect(`/estimates/${id}`)
}

export async function deleteEstimateAction(id: string): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('estimates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/estimates')
  return { success: true }
}

export async function markEstimateStatusAction(
  id: string,
  status: 'accepted' | 'declined' | 'expired',
): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('estimates')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/estimates')
  revalidatePath(`/estimates/${id}`)
  return { success: true }
}

export async function sendEstimateEmailAction(id: string): Promise<ActionResult> {
  if (!isEmailConfigured()) return { error: 'Email sending is not configured.' }
  const fromEmail = getEmailFrom()
  if (!fromEmail) return { error: 'Sender email is not configured.' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const [{ data: estimateRaw }, { data: itemsRaw }, { data: org }, { data: emailTpl }] = await Promise.all([
    ctx.supabase
      .from('estimates')
      .select('*, clients(*)')
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
      .is('deleted_at', null)
      .single(),
    ctx.supabase
      .from('estimate_items')
      .select('*')
      .eq('estimate_id', id)
      .order('sort_order'),
    ctx.supabase
      .from('organizations')
      .select('*')
      .eq('id', ctx.orgId)
      .single(),
    ctx.supabase
      .from('email_templates').select('subject, body')
      .eq('organization_id', ctx.orgId).eq('type', 'estimate')
      .maybeSingle(),
  ])

  if (!estimateRaw || !org) return { error: 'Estimate not found' }

  const estimate = estimateRaw as Estimate & { clients: Client | null }
  const client   = estimate.clients
  if (!client?.email) return { error: 'Client has no email address.' }

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { EstimatePDF }    = await import('@/lib/pdf/estimate-pdf')
  const items              = (itemsRaw ?? []) as EstimateItem[]

  const pdfBuffer = await renderToBuffer(
    createElement(EstimatePDF, { estimate, items, client, org: org as Organization }),
  )

  const shareUrl = estimate.share_token && process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/e/${estimate.share_token}`
    : undefined

  let customSubject: string | undefined
  let customBody:    string | undefined
  if (emailTpl) {
    const fmtCurr = (v: number) => {
      try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: estimate.currency, minimumFractionDigits: 2 }).format(v) }
      catch { return `${v}` }
    }
    const fmtD = (d: string | null) => {
      if (!d) return '—'
      try { return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) } catch { return d }
    }
    const vars = {
      client_name:     client.name,
      org_name:        (org as Organization).name,
      estimate_number: estimate.estimate_number,
      total:           fmtCurr(estimate.total),
      issue_date:      fmtD(estimate.issue_date),
      expiry_date:     fmtD(estimate.expiry_date ?? null),
      estimate_url:    shareUrl ?? '',
    }
    customSubject = substituteVars(emailTpl.subject, vars)
    customBody    = substituteVars(emailTpl.body,    vars)
  }

  const { subject, html, text } = buildEstimateEmail(estimate, client, org as Organization, shareUrl, customSubject, customBody)

  const ccList = (client as Client).cc_emails?.filter(Boolean) ?? []

  const { id: sendId, error: sendError } = await sendEmail({
    from:    fromEmail,
    to:      client.email,
    cc:      ccList.length ? ccList : undefined,
    subject,
    html,
    text,
    attachments: [{
      filename: `estimate-${estimate.estimate_number}.pdf`,
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

  if (estimate.status === 'draft') {
    await ctx.supabase
      .from('estimates')
      .update({ status: 'sent', sent_at: now })
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
  }

  revalidatePath('/estimates')
  revalidatePath(`/estimates/${id}`)
  return { success: true }
}

export async function convertToInvoiceAction(id: string): Promise<{ error?: string; invoiceId?: string }> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const [{ data: estimateRaw }, { data: itemsRaw }, { data: org }] = await Promise.all([
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
    ctx.supabase
      .from('organizations')
      .select('invoice_prefix')
      .eq('id', ctx.orgId)
      .single(),
  ])

  if (!estimateRaw) return { error: 'Estimate not found' }

  const estimate = estimateRaw as Estimate
  const items    = (itemsRaw ?? []) as EstimateItem[]

  // Get next invoice number
  const { data: invoiceNumber, error: numErr } = await ctx.supabase
    .rpc('next_invoice_number', { p_org_id: ctx.orgId })
  if (numErr) return { error: numErr.message }

  const today = new Date().toISOString().split('T')[0]

  const { data: invoice, error: invErr } = await ctx.supabase
    .from('invoices')
    .insert({
      organization_id:  ctx.orgId,
      client_id:        estimate.client_id,
      created_by:       ctx.userId,
      invoice_number:   invoiceNumber,
      status:           'draft',
      issue_date:       today,
      due_date:         null,
      currency:         estimate.currency,
      exchange_rate:    1,
      subtotal:         estimate.subtotal,
      discount_amount:  estimate.discount_amount,
      tax_type:         estimate.tax_type,
      tax_rate:         estimate.tax_rate,
      tax_amount:       estimate.tax_amount,
      total:            estimate.total,
      amount_paid:      0,
      notes:            estimate.notes,
    })
    .select('id')
    .single()

  if (invErr || !invoice) return { error: invErr?.message ?? 'Failed to create invoice' }

  // Copy line items
  if (items.length > 0) {
    await ctx.supabase.from('invoice_items').insert(
      items.map(item => ({
        invoice_id:      invoice.id,
        organization_id: ctx.orgId,
        description:     item.description,
        quantity:        item.quantity,
        unit_price:      item.unit_price,
        tax_rate:        null,
        tax_amount:      0,
        discount_amount: 0,
        subtotal:        item.subtotal,
        total:           item.total,
        sort_order:      item.sort_order,
      }))
    )
  }

  // Mark estimate as accepted + link to invoice
  await ctx.supabase
    .from('estimates')
    .update({
      status:               'accepted',
      responded_at:         new Date().toISOString(),
      converted_invoice_id: invoice.id,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  revalidatePath('/estimates')
  revalidatePath(`/estimates/${id}`)
  revalidatePath('/invoices')

  return { invoiceId: invoice.id }
}
