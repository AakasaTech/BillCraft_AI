import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrgSettingsForm } from '@/components/settings/org-settings-form'
import { EmailSenderForm } from '@/components/settings/email-sender-form'
import type { Organization } from '@/types/database'

export const metadata = { title: 'Organization Settings — BillCraft AI' }

export default async function OrganizationSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const { data: org } = await supabase
    .from('organizations').select('*').eq('id', userRecord.organization_id).single()
  if (!org) redirect('/onboard')

  const canEdit = userRecord.role === 'owner' || userRecord.role === 'admin'

  return (
    <div className="space-y-6">
      <OrgSettingsForm org={org as Organization} canEdit={canEdit} />
      <EmailSenderForm emailPrefix={(org as Organization).email_prefix} canEdit={canEdit} />
    </div>
  )
}
