import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TemplatesTable } from '@/components/templates/templates-table'
import { UpgradePrompt } from '@/components/ui/upgrade-prompt'
import { getPlanStatus } from '@/lib/subscription'
import { Button } from '@/components/ui/button'
import type { InvoiceTemplate, InvoiceTemplateItem } from '@/types/database'

export const metadata = { title: 'Templates — BillCraft AI' }

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const plan = await getPlanStatus(orgId, supabase)
  if (!plan.canUseTemplates) {
    return (
      <div className="p-6">
        <UpgradePrompt
          feature="Invoice Templates"
          description="Save reusable templates with pre-filled line items, tax settings, and notes. Available on Pro and Agency plans."
        />
      </div>
    )
  }

  const [{ data: templatesRaw }, { data: itemsRaw }] = await Promise.all([
    supabase
      .from('invoice_templates')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoice_template_items')
      .select('*')
      .order('sort_order'),
  ])

  const templates = (templatesRaw ?? []) as InvoiceTemplate[]
  const allItems  = (itemsRaw ?? []) as InvoiceTemplateItem[]
  const itemsByTemplate = allItems.reduce<Record<string, InvoiceTemplateItem[]>>((acc, item) => {
    ;(acc[item.template_id] ??= []).push(item)
    return acc
  }, {})

  const rows = templates.map(t => ({ ...t, items: itemsByTemplate[t.id] ?? [] }))

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable invoice templates with pre-filled line items and settings.
          </p>
        </div>
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="mr-2 h-4 w-4" /> New template
          </Link>
        </Button>
      </div>

      <TemplatesTable templates={rows} />
    </div>
  )
}
