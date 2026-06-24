'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { onboardSchema, type OnboardFormData } from '@/lib/validations/onboard'
import type { ActionState } from './auth'

export async function createOrganizationAction(data: OnboardFormData): Promise<ActionState> {
  const parsed = onboardSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Service client bypasses RLS — needed here because the user has no organization_id
  // yet, so get_user_org_id() returns null and the INSERT policy blocks the regular client.
  const admin = createServiceClient()

  const trialEndsAt = new Date()
  trialEndsAt.setMonth(trialEndsAt.getMonth() + 2)

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name:             parsed.data.name,
      slug:             parsed.data.slug,
      country_code:     parsed.data.country_code,
      default_currency: parsed.data.default_currency,
      timezone:         parsed.data.timezone,
      trial_ends_at:    trialEndsAt.toISOString(),
    })
    .select()
    .single()

  if (orgError) {
    if (orgError.code === '23505') {
      return { error: 'This workspace URL is already taken. Please choose a different one.' }
    }
    return { error: orgError.message }
  }

  // Link user to the org — regular client is fine here (user updates their own row)
  const { error: userError } = await supabase
    .from('users')
    .update({ organization_id: org.id, role: 'owner' })
    .eq('id', user.id)

  if (userError) {
    await admin.from('organizations').delete().eq('id', org.id)
    return { error: userError.message }
  }

  redirect('/dashboard')
}
