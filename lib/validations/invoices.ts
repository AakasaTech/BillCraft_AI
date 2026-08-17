import { z } from 'zod'

export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity:    z.number({ invalid_type_error: 'Enter a quantity' }).min(0.0001),
  unit_price:  z.number({ invalid_type_error: 'Enter a price' }).min(0),
  sort_order:  z.number().default(0),
})

export const invoiceFormSchema = z.object({
  client_id:            z.string().min(1, 'Please select a client'),
  invoice_number:       z.string().min(1, 'Invoice number is required'),
  issue_date:           z.string().min(1, 'Issue date is required'),
  due_date:             z.string().optional().or(z.literal('')),
  currency:             z.string().length(3, 'Currency is required'),
  tax_type:             z.enum(['vat', 'gst', 'sales_tax', 'none']).default('none'),
  tax_rate:             z.number().min(0).max(100).default(0),
  discount_amount:      z.number().min(0).default(0),
  notes:                z.string().max(2000).optional().or(z.literal('')),
  payment_instructions: z.string().max(2000).optional().or(z.literal('')),
  items:                z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  // Trading-category fields — ignored/blank for service-category orgs
  client_subunit_id:      z.string().uuid().optional().or(z.literal('')),
  shipping_terms:         z.string().max(100).optional().or(z.literal('')),
  local_transport_amount: z.number().min(0).default(0),
  is_simplified:          z.boolean().default(false),
})

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>
export type InvoiceItemData = z.infer<typeof invoiceItemSchema>
