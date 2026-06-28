export function getDateRange(
  preset:      string,
  customFrom?: string,
  customTo?:   string,
): { from: string | null; to: string | null } {
  const now   = new Date()
  const y     = now.getFullYear()
  const m     = now.getMonth()
  const today = now.toISOString().slice(0, 10)

  if (preset === 'this_month')  return { from: `${y}-${String(m + 1).padStart(2, '0')}-01`, to: today }
  if (preset === 'last_month') {
    const f = new Date(y, m - 1, 1)
    const t = new Date(y, m, 0)
    return { from: f.toISOString().slice(0, 10), to: t.toISOString().slice(0, 10) }
  }
  if (preset === 'this_quarter') {
    const q = Math.floor(m / 3)
    return { from: new Date(y, q * 3, 1).toISOString().slice(0, 10), to: today }
  }
  if (preset === 'last_quarter') {
    const q  = Math.floor(m / 3)
    const pq = q === 0 ? 3 : q - 1
    const py = q === 0 ? y - 1 : y
    const f  = new Date(py, pq * 3, 1)
    const t  = new Date(py, pq * 3 + 3, 0)
    return { from: f.toISOString().slice(0, 10), to: t.toISOString().slice(0, 10) }
  }
  if (preset === 'this_year') return { from: `${y}-01-01`,     to: today }
  if (preset === 'last_year') return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }
  if (preset === 'custom')    return { from: customFrom ?? null, to: customTo ?? null }
  return { from: null, to: null } // 'all'
}

// Build a URL query string from search params, optionally excluding keys
export function buildSearchParams(
  sp:      Record<string, string | string[] | undefined>,
  exclude: string[] = [],
): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v && !exclude.includes(k)) {
      params.set(k, Array.isArray(v) ? (v[0] ?? '') : v)
    }
  }
  return params.toString()
}

// Escape a value for CSV — wraps in quotes and escapes internal quotes
export function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
