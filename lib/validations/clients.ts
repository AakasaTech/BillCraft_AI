import { z } from 'zod'

const optionalString = (max: number) =>
  z.string().max(max).optional().or(z.literal(''))

export const clientSchema = z.object({
  name:                   z.string().min(1, 'Name is required').max(255),
  email:                  z.string().email('Invalid email').optional().or(z.literal('')),
  phone:                  optionalString(50),
  address_line1:          optionalString(255),
  address_line2:          optionalString(255),
  city:                   optionalString(100),
  state:                  optionalString(100),
  postal_code:            optionalString(20),
  country_code:           optionalString(2),
  preferred_currency:     optionalString(3),
  tax_registration_number: optionalString(100),
  notes:                  optionalString(1000),
})

export type ClientFormData = z.infer<typeof clientSchema>
