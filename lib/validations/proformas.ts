import { z } from 'zod'

const itemSchema = z.object({
  description:       z.string().min(1),
  quantity:           z.number().positive(),
  unit_price:         z.number().min(0),
  hs_code:            z.string().max(20).optional().or(z.literal('')),
  country_of_origin:  z.string().max(2).optional().or(z.literal('')),
  sort_order:         z.number().default(0),
})

export const proformaFormSchema = z.object({
  client_id:              z.string().uuid(),
  client_subunit_id:      z.string().uuid().optional().or(z.literal('')),
  proforma_number:        z.string().min(1),
  issue_date:             z.string().min(1),
  expiry_date:            z.string().optional().or(z.literal('')),
  currency:               z.string().length(3),
  tax_type:               z.enum(['vat', 'gst', 'sales_tax', 'none']).default('none'),
  tax_rate:               z.number().min(0).max(100).default(0),
  discount_amount:        z.number().min(0).default(0),
  shipping_terms:         z.string().max(100).optional().or(z.literal('')),
  local_transport_amount: z.number().min(0).default(0),
  notes:                  z.string().max(2000).optional().or(z.literal('')),
  terms:                  z.string().max(2000).optional().or(z.literal('')),
  items:                  z.array(itemSchema).min(1),
})

export type ProformaFormData = z.infer<typeof proformaFormSchema>
