import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplateEditor } from '@/components/templates/template-editor'
import type { InvoiceTemplate, InvoiceTemplateItem } from '@/types/database'

export const metadata = { title: 'Edit Template — BillCraft AI' }

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const [{ data: templateRaw }, { data: itemsRaw }, { data: org }, { data: productsRaw }] = await Promise.all([
    supabase
      .from('invoice_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userRecord.organization_id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('invoice_template_items')
      .select('*')
      .eq('template_id', id)
      .order('sort_order'),
    supabase
      .from('organizations')
      .select('default_currency')
      .eq('id', userRecord.organization_id)
      .single(),
    supabase
      .from('products')
      .select('id, name, description, unit_price, currency')
      .eq('organization_id', userRecord.organization_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name'),
  ])

  if (!templateRaw) notFound()

  const template = templateRaw as InvoiceTemplate
  const items    = (itemsRaw ?? []) as InvoiceTemplateItem[]
  const products = (productsRaw ?? []).map(p => ({
    id: p.id, name: p.name, description: p.description,
    unit_price: p.unit_price, currency: p.currency,
  }))

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit template</h1>
        <p className="text-sm text-muted-foreground">{template.name}</p>
      </div>
      <TemplateEditor
        templateId={id}
        defaultCurrency={org?.default_currency ?? 'USD'}
        products={products}
        defaultValues={{
          name:                 template.name,
          currency:             template.currency,
          tax_type:             template.tax_type,
          tax_rate:             template.tax_rate,
          discount_amount:      template.discount_amount,
          due_days:             template.due_days,
          notes:                template.notes ?? '',
          payment_instructions: template.payment_instructions ?? '',
          items: items.map(i => ({
            description: i.description,
            quantity:    i.quantity,
            unit_price:  i.unit_price,
            sort_order:  i.sort_order,
          })),
        }}
      />
    </div>
  )
}
