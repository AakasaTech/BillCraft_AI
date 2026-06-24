import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/utils'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userRecord } = await supabase
      .from('users').select('organization_id').eq('id', user.id).single()
    if (!userRecord?.organization_id)
      return NextResponse.json({ error: 'No organization' }, { status: 403 })

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('gateway_customer_id')
      .eq('organization_id', userRecord.organization_id)
      .not('gateway_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!sub?.gateway_customer_id)
      return NextResponse.json({ error: 'No billing account found.' }, { status: 404 })

    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.gateway_customer_id,
      return_url: absoluteUrl('/billing'),
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe/portal]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
