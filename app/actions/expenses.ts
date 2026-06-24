'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getPlanStatus } from '@/lib/subscription'

const CATEGORIES = [
  'software', 'marketing', 'salaries', 'office', 'travel',
  'professional_services', 'equipment', 'utilities', 'other',
] as const

const schema = z.object({
  date:        z.string().min(1, 'Date is required'),
  category:    z.enum(CATEGORIES),
  description: z.string().min(1, 'Description is required').max(500),
  amount:      z.number().min(0, 'Amount must be non-negative'),
  currency:    z.string().length(3, 'Currency must be 3 characters'),
  vendor:      z.string().max(255).optional().or(z.literal('')),
  notes:       z.string().max(5000).optional().or(z.literal('')),
})

export type ExpenseInput = z.infer<typeof schema>
type ActionResult = { error?: string }

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, orgId: null }
  const { data: ur } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  return { supabase, user, orgId: ur?.organization_id ?? null }
}

export async function createExpenseAction(data: ExpenseInput): Promise<ActionResult> {
  const parsed = schema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const { supabase, user, orgId } = await getContext()
  if (!user || !orgId) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(orgId, supabase)
  if (!plan.canUseExpenses) return { error: 'Expense tracking requires a Pro or Agency plan.' }

  const { error } = await supabase.from('expenses').insert({
    organization_id: orgId,
    created_by:      user.id,
    date:            parsed.data.date,
    category:        parsed.data.category,
    description:     parsed.data.description,
    amount:          parsed.data.amount,
    currency:        parsed.data.currency,
    vendor:          parsed.data.vendor || null,
    notes:           parsed.data.notes  || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/expenses')
  revalidatePath('/reports/pl')
  return {}
}

export async function updateExpenseAction(id: string, data: ExpenseInput): Promise<ActionResult> {
  const parsed = schema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const { supabase, user, orgId } = await getContext()
  if (!user || !orgId) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(orgId, supabase)
  if (!plan.canUseExpenses) return { error: 'Expense tracking requires a Pro or Agency plan.' }

  const { error } = await supabase.from('expenses')
    .update({
      date:        parsed.data.date,
      category:    parsed.data.category,
      description: parsed.data.description,
      amount:      parsed.data.amount,
      currency:    parsed.data.currency,
      vendor:      parsed.data.vendor || null,
      notes:       parsed.data.notes  || null,
    })
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  if (error) return { error: error.message }
  revalidatePath('/expenses')
  revalidatePath('/reports/pl')
  return {}
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const { supabase, user, orgId } = await getContext()
  if (!user || !orgId) return { error: 'Not authenticated' }

  const { error } = await supabase.from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  if (error) return { error: error.message }
  revalidatePath('/expenses')
  revalidatePath('/reports/pl')
  return {}
}
