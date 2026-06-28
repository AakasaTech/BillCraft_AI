'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export interface RevenueDataPoint {
  month:    string   // 'Jan', 'Feb', ...
  revenue:  number
  expenses?: number
}

interface RevenueChartProps {
  data:     RevenueDataPoint[]
  currency: string
}

function fmt(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style:    'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  } catch {
    return `${value}`
  }
}

export function RevenueChart({ data, currency }: RevenueChartProps) {
  const hasRevenue  = data.some(d => d.revenue > 0)
  const hasExpenses = data.some(d => (d.expenses ?? 0) > 0)

  if (!hasRevenue && !hasExpenses) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No data in the last 12 months.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => fmt(v, currency)}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          formatter={(value, name) => [fmt(value as number, currency), (name as string) === 'revenue' ? 'Revenue' : 'Expenses']}
          contentStyle={{
            fontSize:        12,
            borderRadius:    8,
            border:          '1px solid hsl(var(--border))',
            backgroundColor: 'hsl(var(--popover))',
            color:           'hsl(var(--popover-foreground))',
          }}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
        />
        {hasExpenses && (
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v) => <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{v === 'revenue' ? 'Revenue' : 'Expenses'}</span>}
          />
        )}
        <Bar dataKey="revenue"  fill="hsl(var(--primary))"    radius={[4, 4, 0, 0]} name="revenue" />
        {hasExpenses && (
          <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="expenses" fillOpacity={0.6} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
