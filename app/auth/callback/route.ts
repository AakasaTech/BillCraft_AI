import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Use the configured app URL so redirects work correctly behind a reverse proxy
  // (request.url resolves to the container's internal address in Docker)
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  if (error) {
    const url = new URL('/login', base)
    url.searchParams.set('error', errorDescription ?? 'Authentication failed')
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login', base))
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const url = new URL('/login', base)
    url.searchParams.set('error', 'Could not verify your email. Please try again.')
    return NextResponse.redirect(url)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', base))
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!userRecord?.organization_id) {
    return NextResponse.redirect(new URL('/onboard', base))
  }

  return NextResponse.redirect(new URL(next, base))
}
