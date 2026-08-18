'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  orgSettingsSchema, profileSchema, changePasswordSchema, emailPrefixSchema,
  type OrgSettingsData, type ProfileData, type ChangePasswordData,
} from '@/lib/validations/settings'

type ActionResult = { error?: string; success?: boolean }

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single()
  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id, role: data.role }
}

export async function updateOrgSettingsAction(data: OrgSettingsData): Promise<ActionResult> {
  const parsed = orgSettingsSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }
  if (ctx.role !== 'owner' && ctx.role !== 'admin') return { error: 'Only owners and admins can edit organization settings.' }

  const { error } = await ctx.supabase
    .from('organizations')
    .update({
      name:                    parsed.data.name,
      category:                parsed.data.category,
      default_currency:        parsed.data.default_currency,
      timezone:                parsed.data.timezone,
      country_code:            parsed.data.country_code || null,
      address_line1:           parsed.data.address_line1 || null,
      address_line2:           parsed.data.address_line2 || null,
      city:                    parsed.data.city || null,
      state:                   parsed.data.state || null,
      postal_code:             parsed.data.postal_code || null,
      tax_registration_number: parsed.data.tax_registration_number || null,
      invoice_prefix:          parsed.data.invoice_prefix || null,
      website:                 parsed.data.website || null,
      payment_instructions:    parsed.data.payment_instructions ?? [],
    })
    .eq('id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/settings/organization')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateProfileAction(data: ProfileData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('users')
    .update({ name: parsed.data.name })
    .eq('id', ctx.userId)

  if (error) return { error: error.message }

  // Keep auth metadata in sync
  await ctx.supabase.auth.updateUser({ data: { full_name: parsed.data.name } })

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateOrgEmailPrefixAction(raw: { email_prefix: string }): Promise<ActionResult> {
  const parsed = emailPrefixSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }
  if (ctx.role !== 'owner' && ctx.role !== 'admin') return { error: 'Only owners and admins can change the sender address.' }

  const prefix = parsed.data.email_prefix || null

  if (prefix) {
    const { data: existing } = await ctx.supabase
      .from('organizations')
      .select('id')
      .eq('email_prefix', prefix)
      .neq('id', ctx.orgId)
      .maybeSingle()

    if (existing) return { error: 'That sender address is already taken. Choose a different one.' }
  }

  const { error } = await ctx.supabase
    .from('organizations')
    .update({ email_prefix: prefix })
    .eq('id', ctx.orgId)

  if (error) return { error: error.message }

  revalidatePath('/settings/organization')
  return { success: true }
}

export async function changePasswordAction(data: ChangePasswordData): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getCtx()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase.auth.updateUser({ password: parsed.data.new_password })
  if (error) return { error: error.message }

  return { success: true }
}
