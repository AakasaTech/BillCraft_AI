import { z } from 'zod'

export const onboardSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(255, 'Organization name is too long'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]/, 'Slug must start with a letter or number')
    .regex(/[a-z0-9]$/, 'Slug must end with a letter or number'),
  country_code: z.string().length(2, 'Please select a country'),
  default_currency: z.string().length(3, 'Please select a currency'),
  timezone: z.string().min(1, 'Timezone is required'),
})

export type OnboardFormData = z.infer<typeof onboardSchema>
