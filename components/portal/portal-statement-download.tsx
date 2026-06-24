'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'

interface PortalStatementDownloadProps {
  token:      string
  clientName: string
}

export function PortalStatementDownload({ token, clientName }: PortalStatementDownloadProps) {
  const thisYear = new Date().getFullYear()
  const [from, setFrom] = useState(`${thisYear}-01-01`)
  const [to,   setTo]   = useState(new Date().toISOString().split('T')[0])

  const pdfUrl  = `/api/portal/${token}/statement/pdf?from=${from}&to=${to}`
  const filename = `statement-${clientName.replace(/\s+/g, '-')}-${from}-${to}.pdf`

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">Account Statement</h2>
        <p className="text-xs text-muted-foreground">Download a PDF summary of invoices and payments for any date range.</p>
      </div>
      <div className="px-6 py-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="stmt-from">
              From
            </label>
            <input
              id="stmt-from"
              type="date"
              value={from}
              max={to}
              onChange={e => setFrom(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="stmt-to">
              To
            </label>
            <input
              id="stmt-to"
              type="date"
              value={to}
              min={from}
              onChange={e => setTo(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <a
            href={pdfUrl}
            download={filename}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            Download PDF
          </a>
        </div>
      </div>
    </div>
  )
}
