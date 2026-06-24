'use client'

import { useRef, useState } from 'react'
import { ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface LogoUploadProps {
  initialUrl: string | null
  canEdit:    boolean
}

export function LogoUpload({ initialUrl, canEdit }: LogoUploadProps) {
  const [url, setUrl]         = useState(initialUrl)
  const [loading, setLoading] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/upload/logo', { method: 'POST', body: form })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Upload failed'); return }
      // Append cache-buster so the browser reloads the new image
      setUrl(`${data.url}?t=${Date.now()}`)
      toast.success('Logo updated.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleRemove = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/upload/logo', { method: 'DELETE' })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Remove failed'); return }
      setUrl(null)
      toast.success('Logo removed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-6">
      {/* Preview */}
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Organization logo" className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      <div className="space-y-2">
        {canEdit ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => inputRef.current?.click()}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {url ? 'Replace logo' : 'Upload logo'}
              </Button>
              {url && !loading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleRemove}
                >
                  <X className="mr-1.5 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP or SVG · max 2 MB</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {url ? 'Organization logo' : 'No logo uploaded'}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
