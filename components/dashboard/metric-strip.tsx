interface MetricItem {
  label: string
  value: string
  sub?:  string
}

export function MetricStrip({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map(item => (
        <div key={item.label} className="rounded-xl border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-xl font-bold">{item.value}</p>
          {item.sub && <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>}
        </div>
      ))}
    </div>
  )
}
