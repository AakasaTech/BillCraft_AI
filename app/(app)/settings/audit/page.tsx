import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AuditLogTable } from '@/components/settings/audit-log-table'

export const metadata = { title: 'Audit Log — BillCraft AI' }

export default async function AuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  if (!userRecord?.organization_id) redirect('/onboard')

  const orgId = userRecord.organization_id

  // Check plan — audit logs require Agency subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_name, status')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .maybeSingle()

  const isAgency = sub?.plan_name === 'agency'

  // Fetch recent logs regardless — gated in UI
  const { data: rows } = isAgency
    ? await supabase
        .from('audit_logs')
        .select('id, entity_type, entity_id, action, new_values, old_values, created_at, users(name, email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: null }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Audit Log
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          A tamper-evident record of all actions taken in your workspace.
        </p>
      </div>

      {!isAgency ? (
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold">Agency plan required</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Audit logs are available on the Agency plan. Upgrade to keep a complete,
            tamper-evident trail of every action in your workspace.
          </p>
          {userRecord.role === 'owner' && (
            <Link
              href="/billing"
              className="inline-block mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View plans
            </Link>
          )}
        </div>
      ) : (
        <AuditLogTable rows={(rows ?? []) as unknown as Parameters<typeof AuditLogTable>[0]['rows']} />
      )}
    </div>
  )
}
