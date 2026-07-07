import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'

// BillCraft does not have a "projects" concept.
// This endpoint exists for API compatibility with TaskCraft and returns an empty list.
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('Authorization'))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({ data: [] })
}
