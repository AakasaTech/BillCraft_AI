'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error?: string; success?: boolean }

export async function updateLateFeeSettings(
  enabled:    boolean,
  percentage: number,
  afterDays:  number,
): Promise<ActionResult> {
  if (enabled) {
    if (percentage <= 0 || percentage > 100) return { error: 'Percentage must be between 0.01 and 100.' }
    if (afterDays < 0)                        return { error: 'Days must be 0 or greater.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) return { error: 'No organization found' }
  if (!['owner', 'admin'].includes(userRecord.role)) return { error: 'Only admins can change late fee settings.' }

  const { error } = await supabase
    .from('organizations')
    .update({
      late_fee_enabled:    enabled,
      late_fee_percentage: percentage,
      late_fee_after_days: afterDays,
    })
    .eq('id', userRecord.organization_id)

  if (error) return { error: error.message }

  revalidatePath('/settings/notifications')
  return { success: true }
}
