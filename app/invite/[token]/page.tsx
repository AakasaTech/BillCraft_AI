import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { AcceptInviteButton } from '@/components/invite/accept-invite-button'

export const metadata = { title: 'Team Invitation — BillCraft AI', robots: 'noindex, nofollow' }

const ROLE_LABELS: Record<string, string> = {
  admin:  'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Fetch invitation details without auth (service client)
  const serviceClient = createServiceClient()
  const { data: invitation } = await serviceClient
    .from('invitations')
    .select('id, email, role, expires_at, accepted_at, deleted_at, organization_id')
    .eq('token', token)
    .single()

  const { data: org } = invitation
    ? await serviceClient
        .from('organizations')
        .select('name')
        .eq('id', invitation.organization_id)
        .single()
    : { data: null }

  // Check current user session
  const supabase    = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Determine invite state
  const isNotFound = !invitation || !!invitation.deleted_at
  const isAccepted = !!invitation?.accepted_at
  const isExpired  = invitation && !invitation.accepted_at
    ? new Date(invitation.expires_at) < new Date()
    : false

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <img src="/logo.png" alt="BillCraft AI" className="h-7 w-auto" />
          </Link>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm">

          {isNotFound && (
            <div className="text-center">
              <p className="text-2xl font-bold">Invitation not found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This invitation link is invalid or has been revoked.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Go to sign in
              </Link>
            </div>
          )}

          {!isNotFound && isAccepted && (
            <div className="text-center">
              <p className="text-2xl font-bold">Already accepted</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This invitation has already been accepted.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Go to dashboard
              </Link>
            </div>
          )}

          {!isNotFound && !isAccepted && isExpired && (
            <div className="text-center">
              <p className="text-2xl font-bold">Invitation expired</p>
              <p className="mt-2 text-sm text-muted-foreground">
                This invitation has expired. Ask the workspace owner to send a new one.
              </p>
            </div>
          )}

          {!isNotFound && !isAccepted && !isExpired && invitation && (
            <>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You've been invited to join</p>
                <p className="mt-2 text-2xl font-bold">{org?.name ?? 'a workspace'}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  as a <strong>{ROLE_LABELS[invitation.role] ?? invitation.role}</strong>
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {user ? (
                  <>
                    {user.email?.toLowerCase() === invitation.email.toLowerCase() ? (
                      <AcceptInviteButton token={token} />
                    ) : (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        This invitation was sent to <strong>{invitation.email}</strong>.
                        Please sign in with that email address to accept.
                      </div>
                    )}
                    <p className="text-center text-xs text-muted-foreground">
                      Signed in as {user.email}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-center text-sm text-muted-foreground">
                      Sign in or create an account to accept this invitation.
                    </p>
                    <Link
                      href={`/login?next=/invite/${token}`}
                      className="block w-full rounded-lg bg-primary px-6 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Sign in to accept
                    </Link>
                    <Link
                      href={`/register?next=/invite/${token}`}
                      className="block w-full rounded-lg border px-6 py-2.5 text-center text-sm font-semibold hover:bg-muted transition-colors"
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </div>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Invitation sent to {invitation.email} ·
                Expires {new Date(invitation.expires_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
