import { z } from 'zod'

export const recurringItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity:    z.number({ invalid_type_error: 'Enter a quantity' }).min(0.0001),
  unit_price:  z.number({ invalid_type_error: 'Enter a price' }).min(0),
})

export const recurringFormSchema = z.object({
  title:                z.string().max(255).optional().or(z.literal('')),
  client_id:            z.string().min(1, 'Please select a client'),
  frequency:            z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  next_issue_date:      z.string().min(1, 'Next issue date is required'),
  due_days:             z.number().int().min(0).max(365).default(30),
  currency:             z.string().length(3, 'Select a currency'),
  tax_type:             z.enum(['vat', 'gst', 'sales_tax', 'none']).default('none'),
  tax_rate:             z.number().min(0).max(100).default(0),
  discount_amount:      z.number().min(0).default(0),
  notes:                z.string().max(2000).optional().or(z.literal('')),
  payment_instructions: z.string().max(2000).optional().or(z.literal('')),
  items:                z.array(recurringItemSchema).min(1, 'At least one item is required'),
})

export type RecurringFormData = z.infer<typeof recurringFormSchema>
export type RecurringItemData = z.infer<typeof recurringItemSchema>
