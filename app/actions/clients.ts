'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { clientSchema, type ClientFormData } from '@/lib/validations/clients'
import { getPlanStatus, TRIAL_CLIENT_LIMIT } from '@/lib/subscription'
import { logAudit } from '@/lib/audit'

type ActionResult = { error?: string }

async function getOrgAndUser() {
  const supabase = await createSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

function normalize(data: ClientFormData) {
  return {
    name:                    data.name,
    email:                   data.email || null,
    phone:                   data.phone || null,
    address_line1:           data.address_line1 || null,
    address_line2:           data.address_line2 || null,
    city:                    data.city || null,
    state:                   data.state || null,
    postal_code:             data.postal_code || null,
    country_code:            data.country_code || null,
    preferred_currency:      data.preferred_currency || null,
    tax_registration_number: data.tax_registration_number || null,
    notes:                   data.notes || null,
    cc_emails:               data.cc_emails ?? [],
  }
}

export async function createClientAction(data: ClientFormData): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getOrgAndUser()
  if (!ctx) return { error: 'Not authenticated' }

  const plan = await getPlanStatus(ctx.orgId, ctx.supabase)
  if (!plan.canCreateClient) {
    if (plan.status === 'expired') {
      return { error: 'Your trial has expired. Subscribe to a Pro or Agency plan to add more clients.' }
    }
    return { error: `Trial limit reached: you can have up to ${TRIAL_CLIENT_LIMIT} active client during the trial. Subscribe to add more.` }
  }

  const { data: newClient, error } = await ctx.supabase.from('clients').insert({
    ...normalize(parsed.data),
    organization_id: ctx.orgId,
    created_by: ctx.userId,
  }).select('id').single()

  if (error) return { error: 'Failed to create client. Please try again.' }

  if (newClient) {
    logAudit(ctx.supabase, {
      orgId: ctx.orgId, userId: ctx.userId, entityType: 'client', entityId: newClient.id,
      action: 'create', newValues: { name: parsed.data.name, email: parsed.data.email },
    })
  }

  revalidatePath('/clients')
  return {}
}

export async function updateClientAction(id: string, data: ClientFormData): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getOrgAndUser()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('clients')
    .update(normalize(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: 'Failed to update client. Please try again.' }

  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'client', entityId: id,
    action: 'update', newValues: { name: parsed.data.name, email: parsed.data.email },
  })

  revalidatePath('/clients')
  return {}
}

export async function regeneratePortalTokenAction(id: string): Promise<ActionResult & { token?: string }> {
  const ctx = await getOrgAndUser()
  if (!ctx) return { error: 'Not authenticated' }

  const { data, error } = await ctx.supabase
    .from('clients')
    .update({ portal_token: crypto.randomUUID() })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .select('portal_token')
    .single()

  if (error) return { error: 'Failed to regenerate portal link.' }

  revalidatePath(`/clients/${id}`)
  return { token: data?.portal_token ?? undefined }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const ctx = await getOrgAndUser()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)

  if (error) return { error: 'Failed to delete client.' }

  logAudit(ctx.supabase, {
    orgId: ctx.orgId, userId: ctx.userId, entityType: 'client', entityId: id,
    action: 'delete',
  })

  revalidatePath('/clients')
  return {}
}
