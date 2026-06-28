'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export interface BreakdownItem {
  status: string
  count:  number
}

const COLOR: Record<string, string> = {
  draft:     '#94a3b8',
  sent:      '#6366f1',
  viewed:    '#3b82f6',
  partial:   '#f59e0b',
  paid:      '#22c55e',
  overdue:   '#ef4444',
  cancelled: '#cbd5e1',
  void:      '#e2e8f0',
}

const LABEL: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', partial: 'Partial',
  paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled', void: 'Void',
}

export function InvoiceBreakdown({ data }: { data: BreakdownItem[] }) {
  const filtered = data.filter(d => d.count > 0)

  if (filtered.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No invoices yet.
      </div>
    )
  }

  const chartData = filtered.map(d => ({
    name:  LABEL[d.status] ?? d.status,
    value: d.count,
    color: COLOR[d.status] ?? '#94a3b8',
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [value as number, name as string]}
          contentStyle={{
            fontSize:        12,
            borderRadius:    8,
            border:          '1px solid hsl(var(--border))',
            backgroundColor: 'hsl(var(--popover))',
            color:           'hsl(var(--popover-foreground))',
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
