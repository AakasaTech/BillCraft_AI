import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Proforma, ProformaItem, Client, ClientSubunit, Organization } from '@/types/database'

export interface ProformaPDFProps {
  proforma:      Proforma
  items:         ProformaItem[]
  client:        Client | null
  clientSubunit?: ClientSubunit | null
  org:           Organization
}

const c = {
  black:  '#0f172a',
  muted:  '#64748b',
  border: '#e2e8f0',
  bg:     '#f8fafc',
  accent: '#0d9488',   // teal for proformas — distinct from invoice indigo (#6366f1) and estimate amber (#f59e0b)
  white:  '#ffffff',
}

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 10, color: c.black, padding: 48, backgroundColor: c.white },
  header:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 36 },
  orgName:     { fontSize: 18, fontFamily: 'Helvetica-Bold', color: c.black, marginBottom: 4 },
  orgMeta:     { fontSize: 9, color: c.muted, lineHeight: 1.5 },
  proNumLabel: { fontSize: 9, color: c.muted, textAlign: 'right' },
  proNum:      { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'right', marginBottom: 4 },
  badge:       { alignSelf: 'flex-end', backgroundColor: c.bg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.muted, textTransform: 'uppercase' },
  twoCol:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  sectionLabel:{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sectionVal:  { fontSize: 10, color: c.black, lineHeight: 1.6 },
  metaRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  metaLabel:   { fontSize: 9, color: c.muted, width: 90 },
  metaVal:     { fontSize: 9, color: c.black, fontFamily: 'Helvetica-Bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: c.bg, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 4, marginBottom: 2 },
  tableRow:    { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  colDesc:     { flex: 1 },
  colQty:      { width: 45, textAlign: 'right' },
  colPrice:    { width: 72, textAlign: 'right' },
  colAmt:      { width: 72, textAlign: 'right' },
  thText:      { fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.muted, textTransform: 'uppercase' },
  tdText:      { fontSize: 9, color: c.black },
  totalsBlock: { marginTop: 12, alignItems: 'flex-end' },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', width: 200, marginBottom: 4 },
  totalLabel:  { fontSize: 9, color: c.muted },
  totalVal:    { fontSize: 9, color: c.black, fontFamily: 'Helvetica-Bold' },
  divider:     { borderBottomWidth: 1, borderBottomColor: c.border, width: 200, marginVertical: 6 },
  grandLabel:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: c.black },
  grandVal:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: c.accent },
  notesBlock:  { marginTop: 32, flexDirection: 'row', gap: 24 },
  noteSection: { flex: 1 },
  noteText:    { fontSize: 9, color: c.muted, lineHeight: 1.6, marginTop: 4 },
  footer:      { marginTop: 40, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10, fontSize: 8, color: c.muted, textAlign: 'center' },
})

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) } catch { return d }
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed',
  accepted: 'Accepted', converted: 'Converted', expired: 'Expired',
}

export function ProformaPDF({ proforma, items, client, clientSubunit, org }: ProformaPDFProps) {
  const subtotal = proforma.subtotal
  const discount = proforma.discount_amount
  const tax      = proforma.tax_amount
  const total    = proforma.total
  const cur      = proforma.currency

  // Ship-to falls back to the parent client's own address when no sub-unit is set.
  const billToAddr1   = clientSubunit?.address_line1 ?? client?.address_line1 ?? null
  const billToAddr2   = clientSubunit?.address_line2 ?? client?.address_line2 ?? null
  const billToCity    = clientSubunit?.city           ?? client?.city           ?? null
  const billToCountry = clientSubunit?.country_code   ?? client?.country_code   ?? null

  return (
    <Document title={`Proforma ${proforma.proforma_number}`} author={org.name}>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            {org.logo_url ? (
              <Image
                src={org.logo_url.split('?')[0] ?? org.logo_url}
                style={{ height: 48, maxWidth: 160, objectFit: 'contain', marginBottom: 6 }}
              />
            ) : null}
            <Text style={s.orgName}>{org.name}</Text>
            <Text style={s.orgMeta}>
              {[org.address_line1, org.city, org.country_code].filter(Boolean).join(', ')}
              {org.tax_registration_number ? `\nTax Reg: ${org.tax_registration_number}` : ''}
            </Text>
          </View>
          <View>
            <Text style={s.proNum}>{proforma.proforma_number}</Text>
            <Text style={s.proNumLabel}>PROFORMA INVOICE</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>{STATUS_LABEL[proforma.status] ?? proforma.status}</Text>
            </View>
          </View>
        </View>

        {/* Bill To + meta */}
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionLabel}>Bill To</Text>
            <Text style={[s.sectionVal, { fontFamily: 'Helvetica-Bold' }]}>{client?.name ?? '—'}</Text>
            {clientSubunit?.name  && <Text style={s.sectionVal}>Attn: {clientSubunit.name}</Text>}
            {client?.email        && <Text style={s.sectionVal}>{client.email}</Text>}
            {billToAddr1          && <Text style={s.sectionVal}>{billToAddr1}</Text>}
            {billToAddr2          && <Text style={s.sectionVal}>{billToAddr2}</Text>}
            {(billToCity || billToCountry) && (
              <Text style={s.sectionVal}>
                {[billToCity, billToCountry].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
          <View style={{ width: 190 }}>
            <Text style={s.sectionLabel}>Proforma Details</Text>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Issue date</Text>
              <Text style={s.metaVal}>{fmtDate(proforma.issue_date)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Valid until</Text>
              <Text style={s.metaVal}>{fmtDate(proforma.expiry_date)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Currency</Text>
              <Text style={s.metaVal}>{cur}</Text>
            </View>
            {proforma.tax_type !== 'none' && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Tax type</Text>
                <Text style={s.metaVal}>{proforma.tax_type.toUpperCase()}</Text>
              </View>
            )}
            {proforma.shipping_terms && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Shipping terms</Text>
                <Text style={s.metaVal}>{proforma.shipping_terms}</Text>
              </View>
            )}
            {proforma.local_transport_amount > 0 && (
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>Local transport</Text>
                <Text style={s.metaVal}>{fmt(proforma.local_transport_amount, cur)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line items */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colDesc]}>Description</Text>
          <Text style={[s.thText, s.colQty]}>Qty</Text>
          <Text style={[s.thText, s.colPrice]}>Unit Price</Text>
          <Text style={[s.thText, s.colAmt]}>Amount</Text>
        </View>
        {items.map((item, i) => (
          <View key={i} style={s.tableRow} wrap={false}>
            <Text style={[s.tdText, s.colDesc]}>{item.description}</Text>
            <Text style={[s.tdText, s.colQty]}>{item.quantity}</Text>
            <Text style={[s.tdText, s.colPrice]}>{fmt(item.unit_price, cur)}</Text>
            <Text style={[s.tdText, s.colAmt]}>{fmt(item.total, cur)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsBlock}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalVal}>{fmt(subtotal, cur)}</Text>
          </View>
          {discount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Discount</Text>
              <Text style={s.totalVal}>−{fmt(discount, cur)}</Text>
            </View>
          )}
          {tax > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Tax ({proforma.tax_rate}%)</Text>
              <Text style={s.totalVal}>{fmt(tax, cur)}</Text>
            </View>
          )}
          {proforma.local_transport_amount > 0 && (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Local transport</Text>
              <Text style={s.totalVal}>{fmt(proforma.local_transport_amount, cur)}</Text>
            </View>
          )}
          <View style={s.divider} />
          <View style={s.totalRow}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandVal}>{fmt(total, cur)}</Text>
          </View>
        </View>

        {/* Notes + Terms */}
        {(proforma.notes || proforma.terms) && (
          <View style={s.notesBlock}>
            {proforma.notes && (
              <View style={s.noteSection}>
                <Text style={s.sectionLabel}>Notes</Text>
                <Text style={s.noteText}>{proforma.notes}</Text>
              </View>
            )}
            {proforma.terms && (
              <View style={s.noteSection}>
                <Text style={s.sectionLabel}>Terms &amp; Conditions</Text>
                <Text style={s.noteText}>{proforma.terms}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={s.footer} fixed>
          {org.name} · Proforma Invoice · Generated by BillCraft AI
        </Text>
      </Page>
    </Document>
  )
}
