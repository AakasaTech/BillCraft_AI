import { z } from 'zod'

const opt = (max: number) => z.string().max(max).optional().or(z.literal(''))

export const clientSubunitSchema = z.object({
  name:          z.string().min(1, 'Name is required').max(255),
  address_line1: opt(255),
  address_line2: opt(255),
  city:          opt(100),
  state:         opt(100),
  postal_code:   opt(20),
  country_code:  opt(2),
})

export type ClientSubunitFormData = z.infer<typeof clientSubunitSchema>
