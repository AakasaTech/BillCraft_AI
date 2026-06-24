'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { invoiceFormSchema, type InvoiceFormData } from '@/lib/validations/invoices'
import { getPlanStatus, TRIAL_INVOICE_MONTHLY_LIMIT } from '@/lib/subscription'
import { logAudit } from '@/lib/audit'
import type { AuditAction } from '@/types/database'

type ActionResult = { error?: string }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

function calcTotals(data: InvoiceFormData) {
  const subtotal = data.items.reduce(
    (s, i) => s + (Number.isFinite(i.quantity * i.unit_price) ? i.quantity * i.unit_price : 0),
    0
  )
  const discount = Math.min(data.discount_amount ?? 0, subtotal)
  const taxBase  = subtotal - discount
  const tax      = (data.tax_rate ?? 0) > 0 ? taxBase * (data.tax_rate / 100) : 0
  const total    = taxBase + tax
  return { subtotal, discount, tax, total }
}

export async function createInvoiceAction(data: InvoiceFormData): Promise<ActionResult> {
  const parsed = invoiceFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(ctx.orgId, ctx.supabase)
  if (!plan.canCreateInvoice) {
    if (plan.status === 'expired') {
      return { error: 'Your trial has expired. Subscribe to a Pro or Agency plan to create more invoices.' }
    }
    return { error: `Trial limit reached: you can create up to ${TRIAL_INVOICE_MONTHLY_LIMIT} invoices per month during the trial. Subscribe to create more.` }
  }

  const { subtotal, discount, tax, total } = calcTotals(parsed.data)

  // Claim the next sequential number at save time — never on page load.
  const { data: invoiceNumber } = await ctx.supabase.rpc('next_invoice_number', { p_org_id: ctx.orgId })

  const { data: inv, error: invErr } = await ctx.supabase
    .from('invoices')
    .insert({
      organization_id:      ctx.orgId,
      created_by:           ctx.userId,
      client_id:            parsed.data.client_id,
      invoice_number:       (invoiceNumber as string | null) ?? parsed.data.invoice_number,
      status:               'draft',
      issue_date:           parsed.data.issue_date,
      due_date:             parsed.data.due_date || null,
      currency:             parsed.data.currency,
      exchange_rate:        1,
      tax_type:             parsed.data.tax_type,
      tax_rate:             parsed.data.tax_rate ?? 0,
      subtotal,
      discount_amount:      discount,
      tax_amount:           tax,
      total,
      amount_paid:          0,
      notes:                parsed.data.notes || null,
      payment_instructions: parsed.data.payment_instructions || null,
    })
    .select('id')
    .single()

  if (invErr) return { error: invErr.message }

  const items = parsed.data.items.map((item, i) => {
    const lineSubtotal = item.quantity * item.unit_price
    return {
      invoice_id:      inv.id,
      organization_id: ctx.orgId,
      description:     item.description,
      quantity:        item.quantity,
      unit_price:      item.unit_price,
      tax_rate:        null,           // inherits from invoice
      tax_amount:      0,
      discount_amount: 0,
      subtotal:        lineSubtotal,
      total:           lineSubtotal,
      sort_order:      i,
    }
  })

  const { error: itemsErr } = await ctx.supabase.from('invoice_items').insert(items)
  if (itemsErr) {
    await ctx.supabase.from('invoices').delete().eq('id', inv.id)
    return { error: itemsErr.message }
  }

  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'invoice', entityId: inv.id,
    action: 'create', newValues: { invoice_number: (invoiceNumber as string | null) ?? parsed.data.invoice_number, total },
  })

  revalidatePath('/invoices')
  redirect(`/invoices/${inv.id}`)
}

export async function updateInvoiceAction(id: string, data: InvoiceFormData): Promise<ActionResult> {
  const parsed = invoiceFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { subtotal, discount, tax, total } = calcTotals(parsed.data)

  const { error: invErr } = await ctx.supabase
    .from('invoices')
    .update({
      client_id:            parsed.data.client_id,
      invoice_number:       parsed.data.invoice_number,
      issue_date:           parsed.data.issue_date,
      due_date:             parsed.data.due_date || null,
      currency:             parsed.data.currency,
      tax_type:             parsed.data.tax_type,
      tax_rate:             parsed.data.tax_rate ?? 0,
      subtotal,
      discount_amount:      discount,
      tax_amount:           tax,
      total,
      notes:                parsed.data.notes || null,
      payment_instructions: parsed.data.payment_instructions || null,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (invErr) return { error: invErr.message }

  await ctx.supabase.from('invoice_items').delete().eq('invoice_id', id)

  const items = parsed.data.items.map((item, i) => {
    const lineSubtotal = item.quantity * item.unit_price
    return {
      invoice_id:      id,
      organization_id: ctx.orgId,
      description:     item.description,
      quantity:        item.quantity,
      unit_price:      item.unit_price,
      tax_rate:        null,
      tax_amount:      0,
      discount_amount: 0,
      subtotal:        lineSubtotal,
      total:           lineSubtotal,
      sort_order:      i,
    }
  })

  const { error: itemsErr } = await ctx.supabase.from('invoice_items').insert(items)
  if (itemsErr) return { error: itemsErr.message }

  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'invoice', entityId: id,
    action: 'update', newValues: { invoice_number: parsed.data.invoice_number, total },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return {}
}

export async function updateInvoiceStatusAction(id: string, status: string): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const updates: Record<string, unknown> = { status }
  if (status === 'paid') {
    const { data: inv } = await ctx.supabase.from('invoices').select('total').eq('id', id).single()
    if (inv) { updates.amount_paid = inv.total; updates.paid_at = new Date().toISOString() }
  }
  if (status === 'sent') updates.sent_at = new Date().toISOString()

  const { error } = await ctx.supabase
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: error.message }

  const STATUS_TO_ACTION: Record<string, AuditAction> = {
    sent: 'send', paid: 'pay', void: 'void', cancelled: 'cancel',
  }
  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'invoice', entityId: id,
    action: STATUS_TO_ACTION[status] ?? 'update', newValues: { status },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return {}
}

export async function deleteInvoiceAction(id: string): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .in('status', ['draft', 'cancelled'])

  if (error) return { error: 'Only draft or cancelled invoices can be deleted.' }

  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'invoice', entityId: id,
    action: 'delete',
  })

  revalidatePath('/invoices')
  redirect('/invoices')
}
