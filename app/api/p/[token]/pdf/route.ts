import { NextResponse } from 'next/server'
import { createElement } from 'react'
import { createServiceClient } from '@/lib/supabase/server'
import type { Invoice, InvoiceItem, Client, Organization } from '@/types/database'

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

  const [{ data: itemsRaw }, { data: orgRaw }] = await Promise.all([
    supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id).order('sort_order'),
    supabase.from('organizations').select('*').eq('id', invoice.organization_id).single(),
  ])

  if (!orgRaw) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { InvoicePDF }     = await import('@/lib/pdf/invoice-pdf')

  const inv    = invoice as Invoice & { clients: Client | null }
  const items  = (itemsRaw ?? []) as InvoiceItem[]
  const client = inv.clients
  const org    = orgRaw as Organization

  const buffer = await renderToBuffer(
    createElement(InvoicePDF, { invoice: inv, items, client, org }) as any,
  )

  return new Response(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${inv.invoice_number}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
