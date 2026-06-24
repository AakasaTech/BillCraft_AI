'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, UserPlus, Trash2, MailIcon, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, getInitials } from '@/lib/utils'
import { inviteSchema, type InviteFormData } from '@/lib/validations/team'
import {
  inviteTeamMemberAction,
  revokeInvitationAction,
  removeMemberAction,
} from '@/app/actions/team'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { UserRole } from '@/types/database'

const ROLE_LABELS: Record<string, string> = {
  owner:  'Owner',
  admin:  'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<string, string> = {
  owner:  'default',
  admin:  'secondary',
  member: 'outline',
  viewer: 'outline',
}

interface Member     { id: string; name: string; email: string; role: UserRole; created_at: string }
interface Invitation { id: string; email: string; role: UserRole; expires_at: string; created_at: string }

interface TeamMembersProps {
  currentUserId: string
  callerRole:    UserRole
  members:       Member[]
  invitations:   Invitation[]
}

export function TeamMembers({ currentUserId, callerRole, members, invitations }: TeamMembersProps) {
  const [isPending, startTransition] = useTransition()
  const canManage = callerRole === 'owner' || callerRole === 'admin'

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'member' },
  })

  const onInvite = (data: InviteFormData) => {
    startTransition(async () => {
      const result = await inviteTeamMemberAction(data)
      if (result?.error) toast.error(result.error)
      else {
        toast.success(`Invitation sent to ${data.email}.`)
        form.reset()
      }
    })
  }

  const handleRevoke = (id: string, email: string) => {
    startTransition(async () => {
      const result = await revokeInvitationAction(id)
      if (result?.error) toast.error(result.error)
      else toast.success(`Invitation to ${email} revoked.`)
    })
  }

  const handleRemove = (id: string, name: string) => {
    startTransition(async () => {
      const result = await removeMemberAction(id)
      if (result?.error) toast.error(result.error)
      else toast.success(`${name} removed from the team.`)
    })
  }

  return (
    <div className="space-y-8">

      {/* ── Invite ───────────────────────────────────────────────── */}
      {canManage && (
        <section className="space-y-4 rounded-xl border bg-card p-6">
          <div>
            <p className="text-sm font-semibold">Invite a team member</p>
            <p className="text-xs text-muted-foreground">They'll receive an email with a link to join your workspace.</p>
          </div>
          <Separator />
          <form onSubmit={form.handleSubmit(onInvite)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="w-full space-y-1.5 sm:w-36">
              <Label>Role</Label>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" disabled={isPending} className="shrink-0">
              {isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <UserPlus className="mr-2 h-4 w-4" />}
              Send invite
            </Button>
          </form>
        </section>
      )}

      {/* ── Members ──────────────────────────────────────────────── */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <p className="text-sm font-semibold">Team members</p>
          <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <Separator />

        <div className="divide-y">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(member.name ?? member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.name || member.email}
                    {member.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={ROLE_COLORS[member.role] as 'default' | 'secondary' | 'outline'}>
                  {ROLE_LABELS[member.role] ?? member.role}
                </Badge>
                {callerRole === 'owner' &&
                  member.id !== currentUserId &&
                  member.role !== 'owner' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {member.name || member.email}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            They will lose access to your workspace immediately. Their invoices and clients will remain.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(member.id, member.name || member.email)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pending invitations ───────────────────────────────────── */}
      {invitations.length > 0 && (
        <section className="space-y-4 rounded-xl border bg-card p-6">
          <div>
            <p className="text-sm font-semibold">Pending invitations</p>
            <p className="text-xs text-muted-foreground">{invitations.length} awaiting acceptance</p>
          </div>
          <Separator />

          <div className="divide-y">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(inv.expires_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline">{ROLE_LABELS[inv.role] ?? inv.role}</Badge>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleRevoke(inv.id, inv.email)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Role guide */}
      <section className="space-y-3 rounded-xl border bg-muted/40 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role permissions</p>
        <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
          <div><ShieldCheck className="mb-1 h-4 w-4 text-primary" /><strong className="text-foreground">Admin</strong> — can invite, edit clients/invoices</div>
          <div><ShieldCheck className="mb-1 h-4 w-4 text-muted-foreground" /><strong className="text-foreground">Member</strong> — can create and edit invoices</div>
          <div><ShieldCheck className="mb-1 h-4 w-4 text-muted-foreground/60" /><strong className="text-foreground">Viewer</strong> — read-only access</div>
        </div>
      </section>
    </div>
  )
}
