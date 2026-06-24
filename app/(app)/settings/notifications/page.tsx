import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReminderSettings } from '@/components/settings/reminder-settings'
import { LateFeeSettings } from '@/components/settings/late-fee-settings'
import type { Organization } from '@/types/database'

export const metadata: Metadata = { title: 'Notifications — BillCraft AI' }

export default async function NotificationsSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const { data: org } = await supabase
    .from('organizations')
    .select('auto_reminders_enabled, reminder_offsets, late_fee_enabled, late_fee_percentage, late_fee_after_days')
    .eq('id', userRecord.organization_id)
    .single()

  const canEdit = userRecord.role === 'owner' || userRecord.role === 'admin'
  const o = org as Organization | null

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notifications &amp; Automations</h2>
        <p className="text-sm text-muted-foreground">
          Configure how BillCraft AI handles overdue invoices on your behalf.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm font-semibold mb-4">Payment reminders</p>
        <ReminderSettings
          initialEnabled={o?.auto_reminders_enabled ?? false}
          initialOffsets={o?.reminder_offsets ?? [-3, 0, 7]}
          canEdit={canEdit}
        />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm font-semibold mb-4">Late fees</p>
        <LateFeeSettings
          initialEnabled={o?.late_fee_enabled ?? false}
          initialPercentage={o?.late_fee_percentage ?? 1.5}
          initialAfterDays={o?.late_fee_after_days ?? 0}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}
