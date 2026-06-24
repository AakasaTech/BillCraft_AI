'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  profileSchema, changePasswordSchema,
  type ProfileData, type ChangePasswordData,
} from '@/lib/validations/settings'
import { updateProfileAction, changePasswordAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface ProfileFormProps {
  name:         string
  email:        string
  authProvider: string
}

export function ProfileForm({ name, email, authProvider }: ProfileFormProps) {
  const [profilePending, startProfile]   = useTransition()
  const [passwordPending, startPassword] = useTransition()

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  })

  const passwordForm = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })

  const onProfileSubmit = (data: ProfileData) => {
    startProfile(async () => {
      const result = await updateProfileAction(data)
      if (result?.error) toast.error(result.error)
      else toast.success('Profile updated.')
    })
  }

  const onPasswordSubmit = (data: ChangePasswordData) => {
    startPassword(async () => {
      const result = await changePasswordAction(data)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Password changed successfully.')
        passwordForm.reset()
      }
    })
  }

  const isOAuth = authProvider !== 'email'

  return (
    <div className="space-y-8">

      {/* ── Profile ──────────────────────────────────────────── */}
      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
        <section className="space-y-4 rounded-xl border bg-card p-6">
          <div>
            <p className="text-sm font-semibold">Profile</p>
            <p className="text-xs text-muted-foreground">Your personal name as shown in the app.</p>
          </div>
          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name *</Label>
              <Input
                id="name"
                aria-invalid={!!profileForm.formState.errors.name}
                {...profileForm.register('name')}
              />
              {profileForm.formState.errors.name && (
                <p className="text-xs text-destructive">{profileForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={profilePending}>
              {profilePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </section>
      </form>

      {/* ── Change Password ───────────────────────────────────── */}
      {isOAuth ? (
        <section className="space-y-4 rounded-xl border bg-card p-6">
          <div>
            <p className="text-sm font-semibold">Password</p>
            <p className="text-xs text-muted-foreground">
              You signed in with {authProvider === 'google' ? 'Google' : authProvider}. Password management is handled by your identity provider.
            </p>
          </div>
        </section>
      ) : (
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
          <section className="space-y-4 rounded-xl border bg-card p-6">
            <div>
              <p className="text-sm font-semibold">Change password</p>
              <p className="text-xs text-muted-foreground">Choose a strong password of at least 8 characters.</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!passwordForm.formState.errors.new_password}
                  {...passwordForm.register('new_password')}
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.new_password.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!passwordForm.formState.errors.confirm_password}
                  {...passwordForm.register('confirm_password')}
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-xs text-destructive">{passwordForm.formState.errors.confirm_password.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={passwordPending}>
                {passwordPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change password
              </Button>
            </div>
          </section>
        </form>
      )}
    </div>
  )
}
