'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlanStatus } from '@/lib/subscription'

const itemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity:    z.number({ invalid_type_error: 'Enter a quantity' }).min(0.0001),
  unit_price:  z.number({ invalid_type_error: 'Enter a price'    }).min(0),
  sort_order:  z.number().default(0),
})

const templateSchema = z.object({
  name:                 z.string().min(1, 'Name is required').max(255),
  currency:             z.string().length(3, 'Currency is required'),
  tax_type:             z.enum(['vat', 'gst', 'sales_tax', 'none']).default('none'),
  tax_rate:             z.number().min(0).max(100).default(0),
  discount_amount:      z.number().min(0).default(0),
  due_days:             z.number().int().min(0).max(365).nullable().default(null),
  notes:                z.string().max(2000).optional().or(z.literal('')),
  payment_instructions: z.string().max(2000).optional().or(z.literal('')),
  items:                z.array(itemSchema).min(1, 'At least one line item is required'),
})

export type TemplateFormData = z.infer<typeof templateSchema>

export async function createTemplateAction(raw: unknown) {
  const parsed = templateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) return { error: 'Organization not found' }

  const plan = await getPlanStatus(userRecord.organization_id, supabase)
  if (!plan.canUseTemplates) return { error: 'Invoice templates require a Pro or Agency plan.' }

  const { items, ...fields } = parsed.data

  const { data: template, error } = await supabase
    .from('invoice_templates')
    .insert({ ...fields, organization_id: userRecord.organization_id, created_by: user.id })
    .select('id')
    .single()

  if (error || !template) return { error: error?.message ?? 'Failed to create template' }

  const { error: itemsError } = await supabase
    .from('invoice_template_items')
    .insert(items.map((item, i) => ({ ...item, template_id: template.id, sort_order: i })))

  if (itemsError) return { error: itemsError.message }

  revalidatePath('/templates')
  redirect('/templates')
}

export async function updateTemplateAction(id: string, raw: unknown) {
  const parsed = templateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { items, ...fields } = parsed.data

  const { error } = await supabase
    .from('invoice_templates')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }

  // Replace items: delete then re-insert
  await supabase.from('invoice_template_items').delete().eq('template_id', id)
  await supabase
    .from('invoice_template_items')
    .insert(items.map((item, i) => ({ ...item, template_id: id, sort_order: i })))

  revalidatePath('/templates')
  redirect('/templates')
}

export async function deleteTemplateAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  await supabase
    .from('invoice_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/templates')
}
