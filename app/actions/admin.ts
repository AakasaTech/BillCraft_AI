'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-auth'

type Result = { error?: string; success?: boolean }

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) throw new Error('Unauthorized')
  return user
}

export async function grantFreePassAction(
  orgId: string,
  plan: string,
  until: string,
): Promise<Result> {
  try {
    await verifyAdmin()
    const db = createServiceClient()
    const { error } = await db
      .from('organizations')
      .update({ freepass_plan: plan, freepass_until: until })
      .eq('id', orgId)
    if (error) return { error: error.message }
    revalidatePath('/admin/organizations')
    revalidatePath(`/admin/organizations/${orgId}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function revokeFreePassAction(orgId: string): Promise<Result> {
  try {
    await verifyAdmin()
    const db = createServiceClient()
    const { error } = await db
      .from('organizations')
      .update({ freepass_plan: null, freepass_until: null })
      .eq('id', orgId)
    if (error) return { error: error.message }
    revalidatePath('/admin/organizations')
    revalidatePath(`/admin/organizations/${orgId}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function toggleUserActiveAction(
  userId: string,
  active: boolean,
): Promise<Result> {
  try {
    await verifyAdmin()
    const db = createServiceClient()
    const { error } = await db
      .from('users')
      .update({ is_active: active })
      .eq('id', userId)
    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}

export async function extendTrialAction(
  orgId: string,
  days: number,
): Promise<Result> {
  try {
    await verifyAdmin()
    const db = createServiceClient()
    const { data: org } = await db
      .from('organizations')
      .select('trial_ends_at')
      .eq('id', orgId)
      .single()
    const base = org?.trial_ends_at && new Date(org.trial_ends_at) > new Date()
      ? new Date(org.trial_ends_at)
      : new Date()
    base.setDate(base.getDate() + days)
    const { error } = await db
      .from('organizations')
      .update({ trial_ends_at: base.toISOString() })
      .eq('id', orgId)
    if (error) return { error: error.message }
    revalidatePath('/admin/organizations')
    revalidatePath(`/admin/organizations/${orgId}`)
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed' }
  }
}
