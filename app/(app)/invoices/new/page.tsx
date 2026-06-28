import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoiceEditor } from '@/components/invoices/invoice-editor'
import type { InvoiceTemplate, InvoiceTemplateItem } from '@/types/database'
import type { InvoiceFormData } from '@/lib/validations/invoices'

export const metadata = { title: 'New Invoice — BillCraft AI' }

const today = () => new Date().toISOString().split('T')[0]
const addDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().split('T')[0]

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>
}) {
  const { template: templateId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('*').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  const [{ data: clientsRaw }, { data: orgData }, { data: nextNum }, { data: productsRaw }] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single(),
    supabase.rpc('peek_invoice_number', { p_org_id: orgId }),
    supabase
      .from('products')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name'),
  ])

  const clients  = (clientsRaw  ?? []).map(c => ({ id: c.id, name: c.name }))
  const products = (productsRaw ?? []).map(p => ({
    id: p.id, name: p.name, description: p.description,
    unit_price: p.unit_price, currency: p.currency,
  }))

  // Build defaultValues from template if provided
  let templateDefaults: Partial<InvoiceFormData> | undefined

  if (templateId) {
    const [{ data: tmplRaw }, { data: tmplItemsRaw }] = await Promise.all([
      supabase
        .from('invoice_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .single(),
      supabase
        .from('invoice_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order'),
    ])

    if (tmplRaw) {
      const tmpl  = tmplRaw as InvoiceTemplate
      const items = (tmplItemsRaw ?? []) as InvoiceTemplateItem[]

      templateDefaults = {
        invoice_number:       nextNum ?? 'INV-2024-0001',
        issue_date:           today(),
        due_date:             tmpl.due_days != null ? addDays(tmpl.due_days) : addDays(30),
        currency:             tmpl.currency,
        tax_type:             tmpl.tax_type,
        tax_rate:             tmpl.tax_rate,
        discount_amount:      tmpl.discount_amount,
        notes:                tmpl.notes ?? '',
        payment_instructions: tmpl.payment_instructions ?? '',
        items: items.length > 0
          ? items.map((i, idx) => ({
              description: i.description,
              quantity:    i.quantity,
              unit_price:  i.unit_price,
              sort_order:  idx,
            }))
          : [{ description: '', quantity: 1, unit_price: 0, sort_order: 0 }],
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Invoice</h1>
        <p className="text-sm text-muted-foreground">
          {templateDefaults
            ? 'Pre-filled from template — select a client and review before saving.'
            : 'Describe your work in plain language and let AI fill in the details, or fill in the form directly.'}
        </p>
      </div>
      <InvoiceEditor
        clients={clients}
        defaultCurrency={orgData?.default_currency ?? 'USD'}
        nextInvoiceNumber={nextNum ?? 'INV-2024-0001'}
        savedPaymentInstructions={(orgData?.payment_instructions ?? []) as { name: string; content: string }[]}
        defaultValues={templateDefaults}
        products={products}
      />
    </div>
  )
}
