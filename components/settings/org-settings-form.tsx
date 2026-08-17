'use client'

import { useTransition } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, PlusIcon, Trash2 } from 'lucide-react'
import { orgSettingsSchema, type OrgSettingsData } from '@/lib/validations/settings'
import { updateOrgSettingsAction } from '@/app/actions/settings'
import { CURRENCIES, COUNTRIES, TIMEZONES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LogoUpload } from '@/components/settings/logo-upload'
import type { Organization } from '@/types/database'

interface OrgSettingsFormProps {
  org:     Organization
  canEdit: boolean
}

export function OrgSettingsForm({ org, canEdit }: OrgSettingsFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<OrgSettingsData>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      name:                    org.name,
      category:                org.category ?? 'service',
      default_currency:        org.default_currency,
      timezone:                org.timezone,
      country_code:            org.country_code ?? '',
      address_line1:           org.address_line1 ?? '',
      address_line2:           org.address_line2 ?? '',
      city:                    org.city ?? '',
      state:                   org.state ?? '',
      postal_code:             org.postal_code ?? '',
      tax_registration_number: org.tax_registration_number ?? '',
      invoice_prefix:          org.invoice_prefix ?? '',
      website:                 org.website ?? '',
      payment_instructions:    (org.payment_instructions ?? []) as { name: string; content: string }[],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name:    'payment_instructions',
  })

  const onSubmit = (data: OrgSettingsData) => {
    startTransition(async () => {
      const result = await updateOrgSettingsAction(data)
      if (result?.error) toast.error(result.error)
      else toast.success('Organization settings saved.')
    })
  }

  const field = (name: keyof OrgSettingsData) => ({
    ...form.register(name),
    disabled: !canEdit,
    'aria-invalid': !!form.formState.errors[name],
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

      {/* ── General ──────────────────────────────────────────── */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <p className="text-sm font-semibold">General</p>
          <p className="text-xs text-muted-foreground">Your workspace name and primary settings.</p>
        </div>
        <Separator />

        {/* Logo */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Organization logo</p>
          <p className="text-xs text-muted-foreground">Appears on invoice PDFs and public invoice pages.</p>
          <div className="mt-3">
            <LogoUpload initialUrl={org.logo_url} canEdit={canEdit} />
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Organization name *</Label>
            <Input id="name" {...field('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <Input id="website" placeholder="https://example.com" {...field('website')} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Organization category</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field: f }) => (
              <Select onValueChange={f.onChange} value={f.value} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service — standard invoicing</SelectItem>
                  <SelectItem value="trading">Trading Company — proformas, shipping terms, HS codes</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Trading Company unlocks proforma invoices and import/export fields (shipping terms, HS codes, local transport) across invoices and proformas.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Default currency *</Label>
            <Controller
              control={form.control}
              name="default_currency"
              render={({ field: f }) => (
                <Select onValueChange={f.onChange} value={f.value} disabled={!canEdit}>
                  <SelectTrigger aria-invalid={!!form.formState.errors.default_currency}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone *</Label>
            <Controller
              control={form.control}
              name="timezone"
              render={({ field: f }) => (
                <Select onValueChange={f.onChange} value={f.value} disabled={!canEdit}>
                  <SelectTrigger aria-invalid={!!form.formState.errors.timezone}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      </section>

      {/* ── Address ──────────────────────────────────────────── */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <p className="text-sm font-semibold">Address</p>
          <p className="text-xs text-muted-foreground">Appears on invoices and PDF exports.</p>
        </div>
        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="address_line1">Address line 1</Label>
          <Input id="address_line1" placeholder="123 Main Street" {...field('address_line1')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address_line2">Address line 2</Label>
          <Input id="address_line2" placeholder="Suite 100" {...field('address_line2')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...field('city')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State / Province</Label>
            <Input id="state" {...field('state')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal_code">Postal code</Label>
            <Input id="postal_code" {...field('postal_code')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Country</Label>
          <Controller
            control={form.control}
            name="country_code"
            render={({ field: f }) => (
              <Select onValueChange={f.onChange} value={f.value ?? ''} disabled={!canEdit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </section>

      {/* ── Tax & Invoicing ───────────────────────────────────── */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <p className="text-sm font-semibold">Tax &amp; Invoicing</p>
          <p className="text-xs text-muted-foreground">These appear on invoice PDFs.</p>
        </div>
        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tax_registration_number">Tax registration number</Label>
            <Input id="tax_registration_number" placeholder="VAT123456789" {...field('tax_registration_number')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invoice_prefix">Invoice number prefix</Label>
            <Input id="invoice_prefix" placeholder="INV" {...field('invoice_prefix')} />
            <p className="text-xs text-muted-foreground">
              e.g. "INV" → INV-2024-0001
            </p>
          </div>
        </div>
      </section>

      {/* ── Payment Instructions ──────────────────────────────── */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Payment Instructions</p>
            <p className="text-xs text-muted-foreground">
              Saved templates you can load into any invoice. Up to 5.
            </p>
          </div>
          {canEdit && fields.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', content: '' })}
            >
              <PlusIcon className="mr-2 h-4 w-4" /> Add
            </Button>
          )}
        </div>
        <Separator />

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No templates yet.{canEdit && ' Click "Add" to create one.'}
          </p>
        )}

        <div className="space-y-4">
          {fields.map((field, idx) => (
            <div key={field.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={`pi-name-${idx}`}>Template name</Label>
                  <Input
                    id={`pi-name-${idx}`}
                    placeholder="e.g. Bank Transfer"
                    disabled={!canEdit}
                    aria-invalid={!!form.formState.errors.payment_instructions?.[idx]?.name}
                    {...form.register(`payment_instructions.${idx}.name`)}
                  />
                  {form.formState.errors.payment_instructions?.[idx]?.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.payment_instructions[idx]?.name?.message}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6 h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`pi-content-${idx}`}>Instructions</Label>
                <Textarea
                  id={`pi-content-${idx}`}
                  rows={3}
                  className="resize-none"
                  placeholder={"Bank: Example Bank\nAccount: 123456789\nSWIFT: EXMPLXX"}
                  disabled={!canEdit}
                  aria-invalid={!!form.formState.errors.payment_instructions?.[idx]?.content}
                  {...form.register(`payment_instructions.${idx}.content`)}
                />
                {form.formState.errors.payment_instructions?.[idx]?.content && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.payment_instructions[idx]?.content?.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Only owners and admins can edit organization settings.</p>
      )}
    </form>
  )
}
