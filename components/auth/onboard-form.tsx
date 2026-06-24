'use client'

import { useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { onboardSchema, type OnboardFormData } from '@/lib/validations/onboard'
import { createOrganizationAction } from '@/app/actions/onboard'
import { COUNTRIES, CURRENCIES } from '@/lib/constants'
import { slugify } from '@/lib/utils'

interface OnboardFormProps {
  defaultName?: string
}

export function OnboardForm({ defaultName = '' }: OnboardFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<OnboardFormData>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      name: defaultName,
      slug: slugify(defaultName),
      country_code: '',
      default_currency: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const orgName = form.watch('name')
  const countryCode = form.watch('country_code')

  // Auto-generate slug from name
  useEffect(() => {
    if (!form.formState.dirtyFields.slug) {
      form.setValue('slug', slugify(orgName), { shouldValidate: false })
    }
  }, [orgName, form])

  // Auto-suggest currency from country
  useEffect(() => {
    if (countryCode && !form.formState.dirtyFields.default_currency) {
      const country = COUNTRIES.find((c) => c.code === countryCode)
      if (country) {
        form.setValue('default_currency', country.currency, { shouldDirty: false })
        form.setValue('timezone', country.timezone, { shouldDirty: false })
      }
    }
  }, [countryCode, form])

  const onSubmit = (data: OnboardFormData) => {
    startTransition(async () => {
      const result = await createOrganizationAction(data)
      if (result?.error) {
        toast.error(result.error)
        if (result.error.includes('URL')) {
          form.setError('slug', { message: result.error })
        }
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Organization name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          placeholder="Acme Studio"
          aria-invalid={!!form.formState.errors.name}
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label htmlFor="slug">
          Workspace URL
          <span className="ml-1.5 font-normal text-muted-foreground text-xs">
            (used in invoice numbers)
          </span>
        </Label>
        <div className="flex items-center rounded-lg border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <span className="border-r border-input px-3 py-2 text-sm text-muted-foreground select-none">
            billcraft.ai/
          </span>
          <input
            id="slug"
            type="text"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="acme-studio"
            aria-invalid={!!form.formState.errors.slug}
            {...form.register('slug', {
              onChange: () => form.setValue('slug', form.getValues('slug'), { shouldDirty: true }),
            })}
          />
        </div>
        {form.formState.errors.slug && (
          <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
        )}
      </div>

      {/* Country */}
      <div className="space-y-1.5">
        <Label>Country</Label>
        <Controller
          control={form.control}
          name="country_code"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-invalid={!!form.formState.errors.country_code}>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.country_code && (
          <p className="text-xs text-destructive">{form.formState.errors.country_code.message}</p>
        )}
      </div>

      {/* Default currency */}
      <div className="space-y-1.5">
        <Label>Default currency</Label>
        <Controller
          control={form.control}
          name="default_currency"
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger aria-invalid={!!form.formState.errors.default_currency}>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.default_currency && (
          <p className="text-xs text-destructive">
            {form.formState.errors.default_currency.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full mt-2" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create workspace
      </Button>
    </form>
  )
}
