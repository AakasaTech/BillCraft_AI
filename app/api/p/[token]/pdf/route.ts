import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import type { Invoice, InvoiceItem, Client, ClientSubunit, Organization } from '@/types/database'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const supabase  = createServiceClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(*)')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const inv = invoice as Invoice & { clients: Client | null }

  const [{ data: itemsRaw }, { data: orgRaw }, { data: subunitRaw }] = await Promise.all([
    supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id).order('sort_order'),
    supabase.from('organizations').select('*').eq('id', invoice.organization_id).single(),
    inv.client_subunit_id
      ? supabase.from('client_subunits').select('*').eq('id', inv.client_subunit_id).single()
      : Promise.resolve({ data: null }),
  ])

  if (!orgRaw) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { InvoicePDF }     = await import('@/lib/pdf/invoice-pdf')

  const items         = (itemsRaw ?? []) as InvoiceItem[]
  const client        = inv.clients
  const clientSubunit = subunitRaw as ClientSubunit | null
  const org           = orgRaw as Organization

  const buffer = await renderToBuffer(
    createElement(InvoicePDF, { invoice: inv, items, client, clientSubunit, org }) as any,
  )

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${inv.invoice_number}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
