import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/settings/profile-form'
import { EmailSenderForm } from '@/components/settings/email-sender-form'

export const metadata = { title: 'Profile — BillCraft AI' }

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('name, email, role, auth_provider, email_prefix').eq('id', user.id).single()

  return (
    <div className="space-y-6">
      <ProfileForm
        name={userRecord?.name ?? ''}
        email={user.email ?? ''}
        authProvider={userRecord?.auth_provider ?? 'email'}
      />
      <EmailSenderForm emailPrefix={userRecord?.email_prefix ?? null} />
    </div>
  )
}
