import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    api:     'BillCraft AI',
    version: 'v1',
    endpoints: [
      'GET  /api/v1/workspace',
      'GET  /api/v1/clients',
      'POST /api/v1/clients',
      'GET  /api/v1/invoices',
      'POST /api/v1/invoices',
      'GET  /api/v1/invoices/:id',
    ],
  })
}
