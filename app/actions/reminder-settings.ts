'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error?: string; success?: boolean }

const VALID_OFFSETS = new Set([-7, -3, -1, 0, 1, 3, 7, 14, 30])

export async function updateReminderSettings(
  enabled: boolean,
  offsets: number[],
): Promise<ActionResult> {
  if (enabled && offsets.length === 0) {
    return { error: 'Select at least one reminder day when auto-reminders are enabled.' }
  }

  const sanitized = offsets.filter((o) => VALID_OFFSETS.has(o))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) return { error: 'No organization found' }
  if (!['owner', 'admin'].includes(userRecord.role)) return { error: 'Only admins can change reminder settings.' }

  const { error } = await supabase
    .from('organizations')
    .update({ auto_reminders_enabled: enabled, reminder_offsets: sanitized })
    .eq('id', userRecord.organization_id)

  if (error) return { error: error.message }

  revalidatePath('/settings/notifications')
  return { success: true }
}
