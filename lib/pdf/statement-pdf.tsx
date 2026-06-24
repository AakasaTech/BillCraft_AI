import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Client, Organization } from '@/types/database'

export interface StatementEntry {
  date:        string
  type:        'invoice' | 'payment'
  reference:   string
  description: string
  charged:     number
  paid:        number
  balance:     number
}

export interface StatementPDFProps {
  org:          Organization
  client:       Client
  from_date:    string
  to_date:      string
  currency:     string
  entries:      StatementEntry[]
  totalCharged: number
  totalPaid:    number
  outstanding:  number
}

const c = {
  black:  '#0f172a',
  muted:  '#64748b',
  border: '#e2e8f0',
  bg:     '#f8fafc',
  accent: '#6366f1',
  green:  '#16a34a',
  white:  '#ffffff',
}

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 10, color: c.black, padding: 48, backgroundColor: c.white },
  header:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  orgName:     { fontSize: 16, fontFamily: 'Helvetica-Bold', color: c.black, marginBottom: 3 },
  orgMeta:     { fontSize: 8, color: c.muted, lineHeight: 1.5 },
  stmtTitle:   { fontSize: 20, fontFamily: 'Helvetica-Bold', color: c.accent, textAlign: 'right', marginBottom: 3 },
  stmtPeriod:  { fontSize: 8, color: c.muted, textAlign: 'right' },
  twoCol:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  sectionLabel:{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  sectionVal:  { fontSize: 10, color: c.black, lineHeight: 1.5 },
  tableHeader: { flexDirection: 'row', backgroundColor: c.bg, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4, marginBottom: 2 },
  tableRow:    { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  colDate:     { width: 68 },
  colRef:      { width: 90 },
  colDesc:     { flex: 1 },
  colAmt:      { width: 72, textAlign: 'right' },
  thText:      { fontSize: 8, fontFamily: 'Helvetica-Bold', color: c.muted, textTransform: 'uppercase' },
  tdText:      { fontSize: 9, color: c.black },
  tdMuted:     { fontSize: 9, color: c.muted },
  tdGreen:     { fontSize: 9, color: c.green, fontFamily: 'Helvetica-Bold' },
  tdBalance:   { fontSize: 9, color: c.accent, fontFamily: 'Helvetica-Bold' },
  summaryBlock:{ marginTop: 20, alignItems: 'flex-end' },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', width: 220, marginBottom: 4 },
  summaryLabel:{ fontSize: 9, color: c.muted },
  summaryVal:  { fontSize: 9, color: c.black, fontFamily: 'Helvetica-Bold' },
  divider:     { borderBottomWidth: 1, borderBottomColor: c.border, width: 220, marginVertical: 5 },
  grandLabel:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: c.black },
  grandVal:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: c.accent },
  footer:      { marginTop: 40, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10, fontSize: 8, color: c.muted, textAlign: 'center' },
})

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) } catch { return d }
}

export function StatementPDF({
  org, client, from_date, to_date, currency, entries,
  totalCharged, totalPaid, outstanding,
}: StatementPDFProps) {
  return (
    <Document title={`Statement — ${client.name}`} author={org.name}>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            {org.logo_url ? (
              <Image
                src={org.logo_url.split('?')[0]}
                style={{ height: 44, maxWidth: 150, objectFit: 'contain', marginBottom: 6 }}
              />
            ) : null}
            <Text style={s.orgName}>{org.name}</Text>
            <Text style={s.orgMeta}>
              {[org.address_line1, org.city, org.country_code].filter(Boolean).join(', ')}
              {org.tax_registration_number ? `\nTax Reg: ${org.tax_registration_number}` : ''}
            </Text>
          </View>
          <View>
            <Text style={s.stmtTitle}>STATEMENT</Text>
            <Text style={s.stmtPeriod}>
              {fmtDate(from_date)} – {fmtDate(to_date)}
            </Text>
          </View>
        </View>

        {/* Billed to */}
        <View style={s.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionLabel}>Prepared for</Text>
            <Text style={[s.sectionVal, { fontFamily: 'Helvetica-Bold' }]}>{client.name}</Text>
            {client.email    && <Text style={s.sectionVal}>{client.email}</Text>}
            {client.address_line1 && <Text style={s.sectionVal}>{client.address_line1}</Text>}
            {(client.city || client.country_code) && (
              <Text style={s.sectionVal}>
                {[client.city, client.country_code].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
          <View style={{ width: 180 }}>
            <Text style={s.sectionLabel}>Summary</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: c.muted }}>Total charged</Text>
              <Text style={{ fontSize: 9, color: c.black, fontFamily: 'Helvetica-Bold' }}>{fmt(totalCharged, currency)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: c.muted }}>Total paid</Text>
              <Text style={{ fontSize: 9, color: c.green, fontFamily: 'Helvetica-Bold' }}>{fmt(totalPaid, currency)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 9, color: c.muted }}>Outstanding</Text>
              <Text style={{ fontSize: 9, color: c.accent, fontFamily: 'Helvetica-Bold' }}>{fmt(outstanding, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Table */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colDate]}>Date</Text>
          <Text style={[s.thText, s.colRef]}>Reference</Text>
          <Text style={[s.thText, s.colDesc]}>Description</Text>
          <Text style={[s.thText, s.colAmt]}>Charged</Text>
          <Text style={[s.thText, s.colAmt]}>Paid</Text>
          <Text style={[s.thText, s.colAmt]}>Balance</Text>
        </View>

        {entries.length === 0 ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Text style={s.tdMuted}>No transactions in this period.</Text>
          </View>
        ) : (
          entries.map((entry, i) => (
            <View key={i} style={s.tableRow} wrap={false}>
              <Text style={[s.tdMuted, s.colDate]}>{fmtDate(entry.date)}</Text>
              <Text style={[s.tdText, s.colRef]}>{entry.reference}</Text>
              <Text style={[s.tdText, s.colDesc]}>{entry.description}</Text>
              <Text style={[entry.charged > 0 ? s.tdText : s.tdMuted, s.colAmt]}>
                {entry.charged > 0 ? fmt(entry.charged, currency) : '—'}
              </Text>
              <Text style={[entry.paid > 0 ? s.tdGreen : s.tdMuted, s.colAmt]}>
                {entry.paid > 0 ? fmt(entry.paid, currency) : '—'}
              </Text>
              <Text style={[s.tdBalance, s.colAmt]}>{fmt(entry.balance, currency)}</Text>
            </View>
          ))
        )}

        {/* Totals summary */}
        <View style={s.summaryBlock}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Total charged</Text>
            <Text style={s.summaryVal}>{fmt(totalCharged, currency)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Total paid</Text>
            <Text style={[s.summaryVal, { color: c.green }]}>{fmt(totalPaid, currency)}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryRow}>
            <Text style={s.grandLabel}>Outstanding</Text>
            <Text style={s.grandVal}>{fmt(outstanding, currency)}</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          {org.name} · Account Statement · Generated by BillCraft AI
        </Text>
      </Page>
    </Document>
  )
}
