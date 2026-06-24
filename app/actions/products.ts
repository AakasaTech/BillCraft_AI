'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const productSchema = z.object({
  name:        z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  unit_price:  z.number().min(0, 'Price must be 0 or more'),
  currency:    z.string().length(3, 'Invalid currency'),
  is_active:   z.boolean().default(true),
})

export type ProductFormData = z.infer<typeof productSchema>
type ActionResult = { error?: string }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

export async function createProductAction(data: ProductFormData): Promise<ActionResult> {
  const parsed = productSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase.from('products').insert({
    organization_id: ctx.orgId,
    created_by:      ctx.userId,
    name:            parsed.data.name,
    description:     parsed.data.description || null,
    unit_price:      parsed.data.unit_price,
    currency:        parsed.data.currency,
    is_active:       parsed.data.is_active,
  })

  if (error) return { error: 'Failed to create product.' }

  revalidatePath('/products')
  return {}
}

export async function updateProductAction(id: string, data: ProductFormData): Promise<ActionResult> {
  const parsed = productSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('products')
    .update({
      name:        parsed.data.name,
      description: parsed.data.description || null,
      unit_price:  parsed.data.unit_price,
      currency:    parsed.data.currency,
      is_active:   parsed.data.is_active,
    })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: 'Failed to update product.' }

  revalidatePath('/products')
  return {}
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: 'Failed to delete product.' }

  revalidatePath('/products')
  return {}
}
