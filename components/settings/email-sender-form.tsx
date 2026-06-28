'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Mail } from 'lucide-react'
import { emailPrefixSchema } from '@/lib/validations/settings'
import { updateEmailPrefixAction } from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface EmailSenderFormProps {
  emailPrefix: string | null
}

type FormData = { email_prefix: string }

const EMAIL_DOMAIN = 'billcraft.aakasa.dev'

export function EmailSenderForm({ emailPrefix }: EmailSenderFormProps) {
  const [isPending, startTransition] = useTransition()
  const [currentPrefix, setCurrentPrefix] = useState(emailPrefix ?? '')

  const form = useForm<FormData>({
    resolver: zodResolver(emailPrefixSchema),
    defaultValues: { email_prefix: emailPrefix ?? '' },
  })

  const watchedPrefix = form.watch('email_prefix')

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const result = await updateEmailPrefixAction(data)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setCurrentPrefix(data.email_prefix)
        toast.success(
          data.email_prefix
            ? `Sender address set to ${data.email_prefix}@${EMAIL_DOMAIN}`
            : 'Sender address cleared.',
        )
      }
    })
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-6">
      <div>
        <p className="text-sm font-semibold">Sender Email Address</p>
        <p className="text-xs text-muted-foreground">
          Invoices and reminders you send will come from this address.
        </p>
      </div>
      <Separator />

      {currentPrefix && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-mono text-foreground">
            {currentPrefix}@{EMAIL_DOMAIN}
          </span>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email_prefix">Your sender prefix</Label>
          <div className="flex items-center gap-0">
            <Input
              id="email_prefix"
              className="rounded-r-none font-mono"
              placeholder="yourname"
              autoComplete="off"
              aria-invalid={!!form.formState.errors.email_prefix}
              {...form.register('email_prefix')}
            />
            <span className="flex h-9 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground select-none">
              @{EMAIL_DOMAIN}
            </span>
          </div>
          {form.formState.errors.email_prefix ? (
            <p className="text-xs text-destructive">{form.formState.errors.email_prefix.message}</p>
          ) : watchedPrefix ? (
            <p className="text-xs text-muted-foreground">
              Emails will be sent from{' '}
              <span className="font-mono">{watchedPrefix}@{EMAIL_DOMAIN}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Leave blank to use the system default sender address.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save sender address
          </Button>
        </div>
      </form>
    </section>
  )
}
