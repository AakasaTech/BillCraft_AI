'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2, Copy, Eye, Trash2, Key, CheckCircle2 } from 'lucide-react'
import { generateApiKeyAction, revokeApiKeyAction } from '@/app/actions/api-keys'

interface ApiKeyRow {
  id:          string
  name:        string
  prefix:      string
  lastUsedAt:  string | null
  expiresAt:   string | null
  revokedAt:   string | null
  createdAt:   string
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' })
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  function handle() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handle}
      title="Copy to clipboard"
      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function ApiKeysClient({ keys: initialKeys, canManage }: { keys: ApiKeyRow[]; canManage: boolean }) {
  const [keys,     setKeys]     = useState<ApiKeyRow[]>(initialKeys)
  const [newName,  setNewName]  = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newKey,   setNewKey]   = useState<string | null>(null) // shown once after generation
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    if (!newName.trim()) { toast.error('Enter a name for the key.'); return }
    startTransition(async () => {
      const r = await generateApiKeyAction(newName.trim())
      if (r.error) { toast.error(r.error); return }
      const { id, key, prefix } = r.data!
      setNewKey(key)
      setKeys((prev) => [{
        id, name: newName.trim(), prefix, lastUsedAt: null, expiresAt: null, revokedAt: null, createdAt: new Date().toISOString()
      }, ...prev])
      setNewName('')
      setShowForm(false)
    })
  }

  function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? Any apps using it will immediately lose access.')) return
    startTransition(async () => {
      const r = await revokeApiKeyAction(keyId)
      if (r.error) { toast.error(r.error); return }
      setKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, revokedAt: new Date().toISOString() } : k))
      toast.success('API key revoked.')
    })
  }

  const activeKeys  = keys.filter((k) => !k.revokedAt)
  const revokedKeys = keys.filter((k) => k.revokedAt)

  return (
    <div className="space-y-6">

      {/* New key revealed banner */}
      {newKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Eye className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">Copy this key now — it won&apos;t be shown again.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white dark:border-amber-700 dark:bg-amber-950/40 px-3 py-2 font-mono text-xs">
            <span className="flex-1 break-all select-all">{newKey}</span>
            <CopyButton value={newKey} />
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-amber-700 dark:text-amber-400 hover:underline"
          >
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Active keys */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              Active keys <span className="text-muted-foreground font-normal">({activeKeys.length})</span>
            </span>
          </div>
          {canManage && (
            <button
              onClick={() => setShowForm((x) => !x)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              New key
            </button>
          )}
        </div>

        {/* New key form */}
        {showForm && (
          <div className="flex items-center gap-3 border-b border-border bg-muted/10 px-4 py-3">
            <input
              type="text"
              placeholder="Key name, e.g. TaskCraft Production"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <button
              onClick={handleGenerate}
              disabled={isPending || !newName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Generate'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        )}

        {/* Active key list */}
        {activeKeys.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No active keys. Generate one to connect TaskCraft AI.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Key</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Last used</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Created</th>
                {canManage && <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Revoke</th>}
              </tr>
            </thead>
            <tbody>
              {activeKeys.map((k) => (
                <tr key={k.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{k.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{k.prefix}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{fmtDate(k.lastUsedAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{fmtDate(k.createdAt)}</td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleRevoke(k.id)}
                        disabled={isPending}
                        title="Revoke key"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Revoked keys (collapsed) */}
      {revokedKeys.length > 0 && (
        <details className="rounded-xl border border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors select-none">
            Revoked keys ({revokedKeys.length})
          </summary>
          <table className="w-full text-sm border-t border-border">
            <tbody>
              {revokedKeys.map((k) => (
                <tr key={k.id} className="border-b border-border/50 last:border-b-0 opacity-60">
                  <td className="px-4 py-2.5 font-medium line-through text-muted-foreground">{k.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{k.prefix}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                    revoked {fmtDate(k.revokedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* Usage hint */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">How to use</p>
        <p>In TaskCraft AI, go to <strong>Integrations → BillCraft AI</strong> and paste your API key.</p>
        <p>The base URL should be <code className="rounded bg-muted px-1 py-0.5">{typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.billcraft.ai'}/api</code></p>
      </div>
    </div>
  )
}
