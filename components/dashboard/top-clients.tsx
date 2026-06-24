import { formatCurrency } from '@/lib/utils'

export interface TopClient {
  id:       string
  name:     string
  revenue:  number
  invoices: number
}

export function TopClients({ clients, currency }: { clients: TopClient[]; currency: string }) {
  if (clients.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        No revenue data yet.
      </div>
    )
  }

  const max = clients[0]?.revenue ?? 1

  return (
    <div className="space-y-3">
      {clients.map((client, idx) => (
        <div key={client.id} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground">
                {idx + 1}
              </span>
              <span className="truncate font-medium">{client.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {client.invoices} inv
              </span>
            </div>
            <span className="shrink-0 font-semibold">
              {formatCurrency(client.revenue, currency)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round((client.revenue / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
