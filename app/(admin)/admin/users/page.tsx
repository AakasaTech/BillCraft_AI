import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin-auth'
import { ToggleActiveButton } from './toggle-active-button'

export const metadata = { title: 'Users — Admin', robots: 'noindex, nofollow' }

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' })
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) redirect('/dashboard')

  const db = createServiceClient()

  type UserRow = { id: string; email: string; name: string | null; role: string; is_active: boolean; organization_id: string | null; last_login_at: string | null; created_at: string; auth_provider: string | null }
  type OrgRow  = { id: string; name: string }

  const [usersRes, orgsRes] = await Promise.all([
    db.from('users')
      .select('id, email, name, role, is_active, organization_id, last_login_at, created_at, auth_provider')
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    db.from('organizations')
      .select('id, name')
      .is('deleted_at', null),
  ])

  const users = usersRes.data as UserRow[] | null
  const orgs  = orgsRes.data  as OrgRow[]  | null

  const orgMap = Object.fromEntries((orgs ?? []).map((o) => [o.id, o.name]))

  const activeCount    = (users ?? []).filter(u => u.is_active).length
  const suspendedCount = (users ?? []).filter(u => !u.is_active).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="mt-1 text-sm text-gray-400">
          {(users ?? []).length} total · {activeCount} active · {suspendedCount} suspended
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-gray-900">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-left font-medium">Organization</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Auth</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Last login</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(users ?? []).map((u) => (
              <tr key={u.id} className={`hover:bg-white/5 transition-colors ${!u.is_active ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{u.name || '—'}</div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {u.organization_id ? (
                    <Link
                      href={`/admin/organizations/${u.organization_id}`}
                      className="hover:text-blue-400 transition-colors"
                    >
                      {orgMap[u.organization_id] ?? <span className="text-gray-500">Unknown</span>}
                    </Link>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={u.role}
                    color={u.role === 'owner' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}
                  />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{u.auth_provider}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={u.is_active ? 'active' : 'suspended'}
                    color={u.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
                  />
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(u.last_login_at)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <ToggleActiveButton userId={u.id} isActive={u.is_active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
