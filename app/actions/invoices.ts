'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { invoiceFormSchema, type InvoiceFormData } from '@/lib/validations/invoices'
import { getPlanStatus, TRIAL_INVOICE_MONTHLY_LIMIT } from '@/lib/subscription'
import { approvalGateActive, getApproverCount } from '@/lib/invoice-approval'
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
  const discount       = Math.min(data.discount_amount ?? 0, subtotal)
  const taxBase        = subtotal - discount
  const tax            = (data.tax_rate ?? 0) > 0 ? taxBase * (data.tax_rate / 100) : 0
  const localTransport = data.local_transport_amount ?? 0
  const total           = taxBase + tax + localTransport
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
      client_subunit_id:      parsed.data.client_subunit_id || null,
      shipping_terms:         parsed.data.shipping_terms || null,
      local_transport_amount: parsed.data.local_transport_amount ?? 0,
      is_simplified:           parsed.data.is_simplified ?? false,
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
      client_subunit_id:      parsed.data.client_subunit_id || null,
      shipping_terms:         parsed.data.shipping_terms || null,
      local_transport_amount: parsed.data.local_transport_amount ?? 0,
      is_simplified:           parsed.data.is_simplified ?? false,
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

  if (status === 'sent' && await approvalGateActive(ctx.orgId, ctx.supabase)) {
    const { data: inv } = await ctx.supabase.from('invoices').select('approved_at').eq('id', id).single()
    // Sole-approver orgs never need a separate reviewer: if not yet approved,
    // auto-approve (the creator is the only approver) so the send can proceed.
    if (!inv?.approved_at) {
      const approverCount = await getApproverCount(ctx.orgId, ctx.supabase)
      if (approverCount === 1) {
        await ctx.supabase
          .from('invoices')
          .update({
            status:      'draft',
            approved_by: ctx.userId,
            approved_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('organization_id', ctx.orgId)
      } else {
        return { error: 'This invoice must be approved before it can be sent. Submit it for approval first.' }
      }
    }
  }

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

// ── Approval workflow (Agency plan) ─────────────────────────────────────────

export async function submitForApprovalAction(id: string): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  if (!(await approvalGateActive(ctx.orgId, ctx.supabase))) {
    return { error: 'Approval workflow is not available for your plan.' }
  }

  // Auto-approve if the submitter is the only approver in the org.
  // This prevents a single-approver org from getting stuck in pending_approval
  // because the creator cannot approve their own document (maker-checker).
  const { count: approverCount } = await ctx.supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.orgId)
    .eq('is_invoice_approver', true)
    .is('deleted_at', null)

  const isSoleApprover = (approverCount ?? 0) === 1

  if (isSoleApprover) {
    // Auto-approve: set to draft with approved_by/approved_at so it can be sent immediately.
    const { error } = await ctx.supabase
      .from('invoices')
      .update({
        status:                    'draft',
        submitted_for_approval_at: new Date().toISOString(),
        approved_by:                ctx.userId,
        approved_at:                new Date().toISOString(),
        rejected_by:                null,
        rejected_at:                null,
        rejection_note:             null,
      })
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
      .eq('status', 'draft')

    if (error) return { error: 'Only draft invoices can be submitted for approval.' }

    logAudit(ctx.supabase, {
      orgId: ctx.orgId, userId: ctx.userId, entityType: 'invoice', entityId: id,
      action: 'update', newValues: { status: 'approved' },
    })

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${id}`)
    return {}
  }

  // Normal flow: submit for approval by another approver.
  // Clears any prior rejection — resubmitting always requires a fresh review.
  const { error } = await ctx.supabase
    .from('invoices')
    .update({
      status:                    'pending_approval',
      submitted_for_approval_at: new Date().toISOString(),
      approved_by:                null,
      approved_at:                null,
      rejected_by:                null,
      rejected_at:                null,
      rejection_note:             null,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .eq('status', 'draft')

  if (error) return { error: 'Only draft invoices can be submitted for approval.' }

  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'invoice', entityId: id,
    action: 'update', newValues: { status: 'pending_approval' },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return {}
}

export async function approveInvoiceAction(id: string): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: caller } = await ctx.supabase
    .from('users').select('is_invoice_approver').eq('id', ctx.userId).single()
  if (!caller?.is_invoice_approver) return { error: 'Only designated approvers can approve invoices.' }

  const { data: inv } = await ctx.supabase
    .from('invoices').select('created_by, status').eq('id', id).eq('organization_id', ctx.orgId).single()
  if (!inv) return { error: 'Invoice not found.' }
  if (inv.status !== 'pending_approval') return { error: 'This invoice is not awaiting approval.' }
  // Maker-checker: the person who created the invoice can't also approve it,
  // even if they're a designated approver themselves.
  if (inv.created_by === ctx.userId) return { error: 'You cannot approve an invoice you created yourself.' }

  const { error } = await ctx.supabase
    .from('invoices')
    .update({
      status:      'draft',
      approved_by: ctx.userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .eq('status', 'pending_approval')

  if (error) return { error: error.message }

  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'invoice', entityId: id,
    action: 'update', newValues: { status: 'approved' },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return {}
}

export async function rejectInvoiceAction(id: string, note: string): Promise<ActionResult> {
  if (!note.trim()) return { error: 'A rejection note is required.' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: caller } = await ctx.supabase
    .from('users').select('is_invoice_approver').eq('id', ctx.userId).single()
  if (!caller?.is_invoice_approver) return { error: 'Only designated approvers can reject invoices.' }

  const { data: inv } = await ctx.supabase
    .from('invoices').select('created_by, status').eq('id', id).eq('organization_id', ctx.orgId).single()
  if (!inv) return { error: 'Invoice not found.' }
  if (inv.status !== 'pending_approval') return { error: 'This invoice is not awaiting approval.' }
  if (inv.created_by === ctx.userId) return { error: 'You cannot reject an invoice you created yourself.' }

  const { error } = await ctx.supabase
    .from('invoices')
    .update({
      status:         'draft',
      rejected_by:    ctx.userId,
      rejected_at:    new Date().toISOString(),
      rejection_note: note.trim(),
      approved_by:    null,
      approved_at:    null,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .eq('status', 'pending_approval')

  if (error) return { error: error.message }

  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'invoice', entityId: id,
    action: 'update', newValues: { status: 'rejected', rejection_note: note.trim() },
  })

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return {}
}
