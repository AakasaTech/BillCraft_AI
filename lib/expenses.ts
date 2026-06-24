import type { ExpenseCategory } from '@/types/database'

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'software',              label: 'Software & Tools'      },
  { value: 'marketing',             label: 'Marketing & Ads'       },
  { value: 'salaries',              label: 'Salaries & Wages'      },
  { value: 'office',                label: 'Office & Rent'         },
  { value: 'travel',                label: 'Travel & Transport'    },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'equipment',             label: 'Equipment & Hardware'  },
  { value: 'utilities',             label: 'Utilities'             },
  { value: 'other',                 label: 'Other'                 },
]

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map(c => [c.value, c.label])
)
