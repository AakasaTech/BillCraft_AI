'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recurringFormSchema, type RecurringFormData } from '@/lib/validations/recurring'
import { getPlanStatus } from '@/lib/subscription'

type ActionResult = { error?: string }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

export async function createRecurringAction(data: RecurringFormData): Promise<ActionResult> {
  const parsed = recurringFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(ctx.orgId, ctx.supabase)
  if (!plan.canUseRecurring) return { error: 'Recurring invoices require a Pro or Agency plan.' }

  const { data: rec, error } = await ctx.supabase
    .from('recurring_invoices')
    .insert({
      organization_id:      ctx.orgId,
      client_id:            parsed.data.client_id,
      title:                parsed.data.title ?? '',
      frequency:            parsed.data.frequency,
      next_issue_date:      parsed.data.next_issue_date,
      due_days:             parsed.data.due_days,
      currency:             parsed.data.currency,
      tax_type:             parsed.data.tax_type,
      tax_rate:             parsed.data.tax_rate,
      discount_amount:      parsed.data.discount_amount,
      notes:                parsed.data.notes || null,
      payment_instructions: parsed.data.payment_instructions || null,
      items:                parsed.data.items,
      is_active:            true,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/recurring')
  redirect(`/recurring/${rec.id}`)
}

export async function updateRecurringAction(id: string, data: RecurringFormData): Promise<ActionResult> {
  const parsed = recurringFormSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('recurring_invoices')
    .update({
      client_id:            parsed.data.client_id,
      title:                parsed.data.title ?? '',
      frequency:            parsed.data.frequency,
      next_issue_date:      parsed.data.next_issue_date,
      due_days:             parsed.data.due_days,
      currency:             parsed.data.currency,
      tax_type:             parsed.data.tax_type,
      tax_rate:             parsed.data.tax_rate,
      discount_amount:      parsed.data.discount_amount,
      notes:                parsed.data.notes || null,
      payment_instructions: parsed.data.payment_instructions || null,
      items:                parsed.data.items,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/recurring')
  revalidatePath(`/recurring/${id}`)
  return {}
}

export async function toggleRecurringAction(id: string, isActive: boolean): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('recurring_invoices')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/recurring')
  revalidatePath(`/recurring/${id}`)
  return {}
}

export async function deleteRecurringAction(id: string): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('recurring_invoices')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/recurring')
  redirect('/recurring')
}
