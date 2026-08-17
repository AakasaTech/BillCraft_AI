// App-level list of common shipping/trade terms for trading-category orgs.
// Not a DB table — the shipping_terms column on invoices/proformas is plain
// TEXT with no CHECK constraint, so this list is just what the UI offers;
// nothing enforces it server-side (the AI extraction prompt is free-text too).
export const SHIPPING_TERMS = [
  { value: 'EXW',                   label: 'EXW — Ex Works' },
  { value: 'FOB',                   label: 'FOB — Free on Board' },
  { value: 'Consolidated shipment', label: 'Consolidated shipment' },
  { value: 'CIF',                   label: 'CIF — Cost, Insurance and Freight' },
  { value: 'OCFF',                  label: 'OCFF' },
] as const

export type ShippingTerm = typeof SHIPPING_TERMS[number]['value']
