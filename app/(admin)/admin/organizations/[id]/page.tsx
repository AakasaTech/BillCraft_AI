import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-auth'
import { GrantFreepassDialog } from './grant-freepass-dialog'
import { ChevronLeft, Gift } from 'lucide-react'
import type { Organization, Subscription, User } from '@/types/database'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' })
}

function fmtCurrency(amount: number | null | undefined, currency = 'USD') {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-white text-right">{value}</span>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
}

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) redirect('/dashboard')

  const db  = createServiceClient()
  const now = new Date()

  const [orgRes, membersRes, subRes, clientsRes, invoicesRes] = await Promise.all([
    db.from('organizations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single(),

    db.from('users')
      .select('id, email, name, role, is_active, last_login_at, created_at')
      .eq('organization_id', id)
      .is('deleted_at', null)
      .order('role'),

    db.from('subscriptions')
      .select('*')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    db.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', id).is('deleted_at', null),
    db.from('invoices').select('id', { count: 'exact', head: true }).eq('organization_id', id).is('deleted_at', null),
  ])

  const org          = orgRes.data as Organization | null
  const members      = membersRes.data as Pick<User, 'id' | 'email' | 'name' | 'role' | 'is_active' | 'last_login_at' | 'created_at'>[] | null
  const sub          = subRes.data as Subscription | null
  const clientCount  = clientsRes.count
  const invoiceCount = invoicesRes.count
  if (!org) notFound()

  const hasFreepass = org.freepass_until && new Date(org.freepass_until) > now
  const hasTrial    = org.trial_ends_at && new Date(org.trial_ends_at) > now

  const planStatus = sub?.status === 'active'
    ? `${sub.plan_name} · ${sub.status}`
    : hasFreepass
    ? `Free pass · ${org.freepass_plan}`
    : hasTrial
    ? 'Trial'
    : 'Expired'

  const planColor = sub?.status === 'active'
    ? 'bg-emerald-500/20 text-emerald-400'
    : hasFreepass
    ? 'bg-violet-500/20 text-violet-400'
    : hasTrial
    ? 'bg-blue-500/20 text-blue-400'
    : 'bg-red-500/20 text-red-400'

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/organizations" className="text-gray-400 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{org.name}</h1>
          <p className="text-sm text-gray-400">{org.slug}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Members', value: members?.length ?? 0 },
          { label: 'Clients', value: clientCount ?? 0 },
          { label: 'Invoices', value: invoiceCount ?? 0 },
          { label: 'Status', value: <Badge label={planStatus} color={planColor} /> },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-gray-900 p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Org Info */}
        <div className="rounded-xl border border-white/10 bg-gray-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Organization info</h2>
          <InfoRow label="ID" value={<code className="text-xs text-gray-400">{org.id}</code>} />
          <InfoRow label="Currency" value={org.default_currency} />
          <InfoRow label="Timezone" value={org.timezone} />
          <InfoRow label="Website" value={org.website ?? '—'} />
          <InfoRow label="Tax number" value={org.tax_registration_number ?? '—'} />
          <InfoRow label="Trial ends" value={fmtDate(org.trial_ends_at)} />
          <InfoRow label="Created" value={fmtDate(org.created_at)} />
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-white/10 bg-gray-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Subscription</h2>
          {sub ? (
            <>
              <InfoRow label="Plan" value={sub.plan_name} />
              <InfoRow label="Status" value={<Badge label={sub.status} color="bg-emerald-500/20 text-emerald-400" />} />
              <InfoRow label="Amount" value={fmtCurrency(sub.amount, sub.currency)} />
              <InfoRow label="Billing cycle" value={sub.billing_cycle ?? '—'} />
              <InfoRow label="Period end" value={fmtDate(sub.current_period_end)} />
              <InfoRow label="Gateway" value={sub.gateway ?? '—'} />
            </>
          ) : (
            <p className="text-sm text-gray-500">No active subscription</p>
          )}
        </div>
      </div>

      {/* Free Pass */}
      <div className="rounded-xl border border-white/10 bg-gray-900 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Gift className="h-4 w-4 text-violet-400" />
              Free Pass
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              {hasFreepass
                ? `Active · ${org.freepass_plan} plan until ${fmtDate(org.freepass_until)}`
                : 'No active free pass'}
            </p>
          </div>
          <GrantFreepassDialog
            orgId={org.id}
            currentFreepassPlan={org.freepass_plan ?? null}
            currentFreepassUntil={org.freepass_until ?? null}
          />
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl border border-white/10 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Members ({members?.length ?? 0})</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-gray-500">
              <th className="pb-2 text-left font-medium">Name / Email</th>
              <th className="pb-2 text-left font-medium">Role</th>
              <th className="pb-2 text-left font-medium">Status</th>
              <th className="pb-2 text-left font-medium">Last login</th>
              <th className="pb-2 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(members ?? []).map((m) => (
              <tr key={m.id}>
                <td className="py-2.5">
                  <div className="font-medium text-white">{m.name || '—'}</div>
                  <div className="text-xs text-gray-400">{m.email}</div>
                </td>
                <td className="py-2.5">
                  <Badge
                    label={m.role}
                    color={m.role === 'owner' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}
                  />
                </td>
                <td className="py-2.5">
                  <Badge
                    label={m.is_active ? 'active' : 'suspended'}
                    color={m.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
                  />
                </td>
                <td className="py-2.5 text-gray-400 text-xs">{fmtDate(m.last_login_at)}</td>
                <td className="py-2.5 text-gray-400 text-xs">{fmtDate(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
