'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { clientSubunitSchema, type ClientSubunitFormData } from '@/lib/validations/client-subunits'

type ActionResult = { error?: string }

async function getOrgAndUser() {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!data?.organization_id) return null
  return { supabase, userId: user.id, orgId: data.organization_id }
}

function normalize(data: ClientSubunitFormData) {
  return {
    name:          data.name,
    address_line1: data.address_line1 || null,
    address_line2: data.address_line2 || null,
    city:          data.city || null,
    state:         data.state || null,
    postal_code:   data.postal_code || null,
    country_code:  data.country_code || null,
  }
}

export async function createClientSubunitAction(
  clientId: string,
  data: ClientSubunitFormData,
): Promise<ActionResult> {
  const parsed = clientSubunitSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getOrgAndUser()
  if (!ctx) return { error: 'Not authenticated' }

  const { error } = await ctx.supabase.from('client_subunits').insert({
    ...normalize(parsed.data),
    client_id:       clientId,
    organization_id: ctx.orgId,
  })

  if (error) return { error: 'Failed to create sub-unit. Please try again.' }

  revalidatePath(`/clients/${clientId}`)
  return {}
}

export async function updateClientSubunitAction(
  id: string,
  data: ClientSubunitFormData,
): Promise<ActionResult> {
  const parsed = clientSubunitSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }

  const ctx = await getOrgAndUser()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: subunit, error } = await ctx.supabase
    .from('client_subunits')
    .update(normalize(parsed.data))
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .select('client_id')
    .single()

  if (error || !subunit) return { error: 'Failed to update sub-unit. Please try again.' }

  revalidatePath(`/clients/${subunit.client_id}`)
  return {}
}

export async function deleteClientSubunitAction(id: string): Promise<ActionResult> {
  const ctx = await getOrgAndUser()
  if (!ctx) return { error: 'Not authenticated' }

  const { data: subunit, error } = await ctx.supabase
    .from('client_subunits')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.orgId)
    .select('client_id')
    .single()

  if (error || !subunit) return { error: 'Failed to delete sub-unit.' }

  revalidatePath(`/clients/${subunit.client_id}`)
  return {}
}
