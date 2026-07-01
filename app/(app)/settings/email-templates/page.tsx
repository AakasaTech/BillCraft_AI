import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/server'
import { getPlanStatus } from '@/lib/subscription'
import { EmailTemplateEditor } from '@/components/settings/email-template-editor'
import type { EmailTemplate, EmailTemplateType } from '@/types/database'

export const metadata: Metadata = { title: 'Email Templates — BillCraft AI' }

const TABS: { value: EmailTemplateType; label: string; description: string }[] = [
  {
    value:       'invoice',
    label:       'Invoice',
    description: 'Sent when you email an invoice to a client.',
  },
  {
    value:       'reminder',
    label:       'Reminder',
    description: 'Sent when you send a payment reminder for an overdue or outstanding invoice.',
  },
  {
    value:       'estimate',
    label:       'Estimate',
    description: 'Sent when you email an estimate/quote to a client.',
  },
]

export default async function EmailTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [plan, { data: templatesRaw }] = await Promise.all([
    getPlanStatus(orgId, supabase),
    supabase
      .from('email_templates')
      .select('*')
      .eq('organization_id', orgId),
  ])

  const templatesByType: Record<string, EmailTemplate> = {}
  for (const tpl of templatesRaw ?? []) {
    templatesByType[tpl.type] = tpl as EmailTemplate
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Email Templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customise the subject line and opening message for emails sent to clients.
          Use <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{'{{variable}}'}</code> placeholders
          to insert dynamic values.
        </p>
      </div>

      <Tabs defaultValue="invoice">
        <TabsList>
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(t => (
          <TabsContent key={t.value} value={t.value} className="mt-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <EmailTemplateEditor
                type={t.value}
                saved={templatesByType[t.value] ?? null}
                canEdit={plan.canUseTemplates}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
