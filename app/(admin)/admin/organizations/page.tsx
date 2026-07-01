import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-auth'
import { ChevronRight, Gift } from 'lucide-react'

export const metadata = { title: 'Organizations — Admin', robots: 'noindex, nofollow' }

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' })
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

function getOrgStatus(org: {
  trial_ends_at: string | null
  freepass_plan: string | null
  freepass_until: string | null
}, sub: { status: string; plan_name: string } | undefined) {
  const now = new Date()
  if (sub) return { label: sub.plan_name, color: 'bg-emerald-500/20 text-emerald-400' }
  if (org.freepass_until && new Date(org.freepass_until) > now)
    return { label: `Free pass · ${org.freepass_plan}`, color: 'bg-violet-500/20 text-violet-400' }
  if (org.trial_ends_at && new Date(org.trial_ends_at) > now)
    return { label: 'Trial', color: 'bg-blue-500/20 text-blue-400' }
  return { label: 'Expired', color: 'bg-red-500/20 text-red-400' }
}

export default async function AdminOrgsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) redirect('/dashboard')

  const db  = createServiceClient()
  const now = new Date()

  type OrgRow    = { id: string; name: string; slug: string; created_at: string; trial_ends_at: string | null; freepass_plan: string | null; freepass_until: string | null }
  type SubRow    = { organization_id: string; status: string; plan_name: string; amount: number | null; current_period_end: string | null }
  type OwnerRow  = { organization_id: string; email: string }
  type UsageRow  = { organization_id: string }

  const [orgsRes, subsRes, ownersRes, usageRes] = await Promise.all([
    db.from('organizations')
      .select('id, name, slug, created_at, trial_ends_at, freepass_plan, freepass_until')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    db.from('subscriptions')
      .select('organization_id, status, plan_name, amount, current_period_end')
      .eq('status', 'active'),

    db.from('users')
      .select('organization_id, email')
      .eq('role', 'owner')
      .is('deleted_at', null),

    db.from('users')
      .select('organization_id')
      .is('deleted_at', null),
  ])

  const orgsRaw     = orgsRes.data    as OrgRow[]   | null
  const subsRaw     = subsRes.data    as SubRow[]   | null
  const ownersRaw   = ownersRes.data  as OwnerRow[] | null
  const usageCounts = usageRes.data   as UsageRow[] | null

  const orgs   = orgsRaw  ?? []
  const subMap = Object.fromEntries((subsRaw ?? []).map((s) => [s.organization_id, s]))
  const ownerMap = Object.fromEntries((ownersRaw ?? []).map((u) => [u.organization_id, u.email]))

  const userCountMap: Record<string, number> = {}
  for (const u of usageCounts ?? []) {
    if (u.organization_id) userCountMap[u.organization_id] = (userCountMap[u.organization_id] ?? 0) + 1
  }

  const trialCount   = orgs.filter(o => !subMap[o.id] && o.trial_ends_at && new Date(o.trial_ends_at) > now).length
  const expiredCount = orgs.filter(o => !subMap[o.id] && (!o.trial_ends_at || new Date(o.trial_ends_at) <= now) && !(o.freepass_until && new Date(o.freepass_until) > now)).length
  const freepassCount = orgs.filter(o => o.freepass_until && new Date(o.freepass_until) > now).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Organizations</h1>
        <p className="mt-1 text-sm text-gray-400">
          {orgs.length} total · {Object.keys(subMap).length} active · {trialCount} trial · {freepassCount} free pass · {expiredCount} expired
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-3 text-left font-medium">Organization</th>
              <th className="px-4 py-3 text-left font-medium">Owner</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Users</th>
              <th className="px-4 py-3 text-left font-medium">Trial ends</th>
              <th className="px-4 py-3 text-left font-medium">Free pass until</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orgs.map((org) => {
              const sub    = subMap[org.id]
              const status = getOrgStatus(org, sub)
              const hasFreepass = org.freepass_until && new Date(org.freepass_until) > now
              return (
                <tr key={org.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{org.name}</div>
                    <div className="text-xs text-gray-500">{org.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{ownerMap[org.id] ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={status.label} color={status.color} />
                  </td>
                  <td className="px-4 py-3 text-gray-300">{userCountMap[org.id] ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(org.trial_ends_at)}</td>
                  <td className="px-4 py-3">
                    {hasFreepass ? (
                      <span className="inline-flex items-center gap-1 text-violet-400 text-xs">
                        <Gift className="h-3 w-3" />
                        {fmtDate(org.freepass_until)}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(org.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Manage <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
