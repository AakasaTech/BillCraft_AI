import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-auth'
import { Building2, Users, TrendingUp, Activity, DollarSign, Clock } from 'lucide-react'

function fmt(n: number | null | undefined) {
  return (n ?? 0).toLocaleString()
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-emerald-500/20 text-emerald-400',
    trialing:  'bg-blue-500/20 text-blue-400',
    past_due:  'bg-amber-500/20 text-amber-400',
    cancelled: 'bg-gray-500/20 text-gray-400',
    unpaid:    'bg-red-500/20 text-red-400',
    trial:     'bg-blue-500/20 text-blue-400',
    expired:   'bg-red-500/20 text-red-400',
    none:      'bg-gray-500/20 text-gray-400',
  }
  const cls = map[status] ?? 'bg-gray-500/20 text-gray-400'
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) redirect('/dashboard')

  const db = createServiceClient()
  const now = new Date()

  type SubRow    = { status: string; amount: number | null; plan_name: string }
  type RecentOrg = { id: string; name: string; slug: string; created_at: string; trial_ends_at: string | null; freepass_plan: string | null; freepass_until: string | null }

  const [orgsCountRes, usersCountRes, subsRes, recentOrgsRes] = await Promise.all([
    db.from('organizations').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('users').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    db.from('subscriptions').select('status, amount, plan_name').eq('status', 'active'),
    db.from('organizations')
      .select('id, name, slug, created_at, trial_ends_at, freepass_plan, freepass_until')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const totalOrgs    = orgsCountRes.count
  const totalUsers   = usersCountRes.count
  const subs         = subsRes.data      as SubRow[]    | null
  const recentOrgsRaw = recentOrgsRes.data as RecentOrg[] | null

  // Compute stats
  const mrr = (subs ?? []).reduce((sum, s) => sum + (s.amount ?? 0), 0)
  const activeSubCount = (subs ?? []).length

  const planBreakdown = (subs ?? []).reduce<Record<string, number>>((acc, s) => {
    const p = s.plan_name ?? 'unknown'
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {})

  type OwnerRow  = { organization_id: string; email: string; name: string | null }
  type OrgSubRow = { organization_id: string; status: string; plan_name: string }

  // Get org ids for recent orgs to fetch owner emails
  const recentOrgs = recentOrgsRaw ?? []
  const orgIds = recentOrgs.map((o) => o.id)
  const ownersRes = orgIds.length
    ? await db.from('users').select('organization_id, email, name').in('organization_id', orgIds).eq('role', 'owner')
    : null
  const owners = (ownersRes?.data ?? []) as OwnerRow[]

  const ownerByOrg = Object.fromEntries(owners.map((u) => [u.organization_id, u]))

  // Get sub status per org
  const orgSubsRes = orgIds.length
    ? await db.from('subscriptions').select('organization_id, status, plan_name').in('organization_id', orgIds).eq('status', 'active')
    : null
  const orgSubs = (orgSubsRes?.data ?? []) as OrgSubRow[]
  const subByOrg = Object.fromEntries(orgSubs.map((s) => [s.organization_id, s]))

  const statCards = [
    { label: 'Total organizations', value: fmt(totalOrgs), icon: Building2, color: 'text-blue-400' },
    { label: 'Total users',         value: fmt(totalUsers), icon: Users,     color: 'text-purple-400' },
    { label: 'Active subscriptions',value: fmt(activeSubCount), icon: Activity, color: 'text-emerald-400' },
    { label: 'Monthly revenue',     value: fmtCurrency(mrr),   icon: DollarSign, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">Platform overview as of {now.toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-gray-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plan breakdown */}
        <div className="rounded-xl border border-white/10 bg-gray-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            Active plan breakdown
          </h2>
          {Object.keys(planBreakdown).length === 0 ? (
            <p className="text-sm text-gray-500">No active subscriptions</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(planBreakdown).map(([plan, count]) => (
                <li key={plan} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-300">{plan}</span>
                  <span className="font-semibold text-white">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent signups */}
        <div className="col-span-2 rounded-xl border border-white/10 bg-gray-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              Recent signups
            </h2>
            <Link href="/admin/organizations" className="text-xs text-blue-400 hover:text-blue-300">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500">
                  <th className="pb-2 text-left font-medium">Organization</th>
                  <th className="pb-2 text-left font-medium">Owner</th>
                  <th className="pb-2 text-left font-medium">Plan / Status</th>
                  <th className="pb-2 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrgs.map((org) => {
                  const owner = ownerByOrg[org.id]
                  const sub   = subByOrg[org.id]
                  const hasFreepass = org.freepass_until && new Date(org.freepass_until) > now
                  const status = sub
                    ? sub.plan_name
                    : hasFreepass
                    ? `freepass:${org.freepass_plan}`
                    : org.trial_ends_at && new Date(org.trial_ends_at) > now
                    ? 'trial'
                    : 'expired'
                  return (
                    <tr key={org.id}>
                      <td className="py-2.5 font-medium text-white">
                        <Link href={`/admin/organizations/${org.id}`} className="hover:text-blue-400">
                          {org.name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-gray-400">{owner?.email ?? '—'}</td>
                      <td className="py-2.5"><StatusBadge status={status ?? 'none'} /></td>
                      <td className="py-2.5 text-gray-400">{fmtDate(org.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
