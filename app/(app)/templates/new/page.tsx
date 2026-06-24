import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplateEditor } from '@/components/templates/template-editor'

export const metadata = { title: 'New Template — BillCraft AI' }

export default async function NewTemplatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const [{ data: org }, { data: productsRaw }] = await Promise.all([
    supabase.from('organizations').select('default_currency').eq('id', userRecord.organization_id).single(),
    supabase
      .from('products')
      .select('id, name, description, unit_price, currency')
      .eq('organization_id', userRecord.organization_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name'),
  ])

  const products = (productsRaw ?? []).map(p => ({
    id: p.id, name: p.name, description: p.description,
    unit_price: p.unit_price, currency: p.currency,
  }))

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New template</h1>
        <p className="text-sm text-muted-foreground">
          Define reusable line items, tax settings, and notes.
        </p>
      </div>
      <TemplateEditor defaultCurrency={org?.default_currency ?? 'USD'} products={products} />
    </div>
  )
}
