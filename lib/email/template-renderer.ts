export type TemplateVars = Record<string, string>

export function substituteVars(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`)
}

// Default subjects — used as placeholder text in the editor
export const DEFAULT_SUBJECTS: Record<string, string> = {
  invoice:  'Invoice {{invoice_number}} from {{org_name}}',
  reminder: 'Payment reminder: Invoice {{invoice_number}} from {{org_name}}',
  estimate: 'Estimate {{estimate_number}} from {{org_name}}',
}

// Default body paragraphs — used as placeholder text in the editor
export const DEFAULT_BODIES: Record<string, string> = {
  invoice:  'Please find your invoice details below. The PDF is attached to this email.',
  reminder: 'This is a friendly reminder that the following invoice is awaiting payment. The invoice PDF is attached to this email for your reference.',
  estimate: 'Please find your estimate details below. The PDF is attached to this email.',
}

// Variables available per template type, shown as chips in the editor UI
export const TEMPLATE_VARS: Record<string, { key: string; label: string }[]> = {
  invoice: [
    { key: 'client_name',     label: 'Client name'     },
    { key: 'org_name',        label: 'Company name'    },
    { key: 'invoice_number',  label: 'Invoice #'       },
    { key: 'amount_due',      label: 'Amount due'      },
    { key: 'total',           label: 'Total'           },
    { key: 'issue_date',      label: 'Issue date'      },
    { key: 'due_date',        label: 'Due date'        },
    { key: 'invoice_url',     label: 'Invoice link'    },
  ],
  reminder: [
    { key: 'client_name',     label: 'Client name'     },
    { key: 'org_name',        label: 'Company name'    },
    { key: 'invoice_number',  label: 'Invoice #'       },
    { key: 'amount_due',      label: 'Amount due'      },
    { key: 'total',           label: 'Total'           },
    { key: 'issue_date',      label: 'Issue date'      },
    { key: 'due_date',        label: 'Due date'        },
    { key: 'invoice_url',     label: 'Invoice link'    },
  ],
  estimate: [
    { key: 'client_name',     label: 'Client name'     },
    { key: 'org_name',        label: 'Company name'    },
    { key: 'estimate_number', label: 'Estimate #'      },
    { key: 'total',           label: 'Total'           },
    { key: 'issue_date',      label: 'Issue date'      },
    { key: 'expiry_date',     label: 'Expiry date'     },
    { key: 'estimate_url',    label: 'Estimate link'   },
  ],
}
