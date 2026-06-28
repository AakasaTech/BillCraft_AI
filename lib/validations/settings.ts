import { z } from 'zod'

const opt = (max: number) => z.string().max(max).optional().or(z.literal(''))

export const paymentInstructionSchema = z.object({
  name:    z.string().min(1, 'Name is required').max(100),
  content: z.string().min(1, 'Content is required').max(2000),
})

export const orgSettingsSchema = z.object({
  name:                     z.string().min(1, 'Name is required').max(255),
  default_currency:         z.string().length(3, 'Select a currency'),
  timezone:                 z.string().min(1, 'Select a timezone'),
  country_code:             opt(2),
  address_line1:            opt(255),
  address_line2:            opt(255),
  city:                     opt(100),
  state:                    opt(100),
  postal_code:              opt(20),
  tax_registration_number:  opt(100),
  invoice_prefix:           z.string().max(20).optional().or(z.literal('')),
  website:                  opt(255),
  payment_instructions:     z.array(paymentInstructionSchema).max(5).default([]),
})

export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
})

export const emailPrefixSchema = z.object({
  email_prefix: z
    .string()
    .max(30, 'Must be at most 30 characters')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      'Only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.',
    )
    .min(3, 'Must be at least 3 characters')
    .or(z.literal('')),
})

export const changePasswordSchema = z.object({
  new_password:     z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path:    ['confirm_password'],
})

export type OrgSettingsData     = z.infer<typeof orgSettingsSchema>
export type ProfileData         = z.infer<typeof profileSchema>
export type ChangePasswordData  = z.infer<typeof changePasswordSchema>
