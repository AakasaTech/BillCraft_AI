'use client'

import { useRef, useState, useTransition } from 'react'
import { Loader2, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { upsertEmailTemplateAction, resetEmailTemplateAction } from '@/app/actions/email-templates'
import { TEMPLATE_VARS, DEFAULT_SUBJECTS, DEFAULT_BODIES } from '@/lib/email/template-renderer'
import type { EmailTemplateType, EmailTemplate } from '@/types/database'

interface Props {
  type:     EmailTemplateType
  saved:    EmailTemplate | null
  canEdit:  boolean
}

export function EmailTemplateEditor({ type, saved, canEdit }: Props) {
  const [subject, setSubject] = useState(saved?.subject ?? '')
  const [body,    setBody]    = useState(saved?.body    ?? '')
  const [error,   setError]   = useState<string | null>(null)
  const [ok,      setOk]      = useState(false)
  const [isPending, startTransition] = useTransition()
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const vars = TEMPLATE_VARS[type] ?? []

  function insertVar(key: string) {
    const tag = `{{${key}}}`
    const el  = bodyRef.current
    if (!el) {
      setBody(b => b + tag)
      return
    }
    const start = el.selectionStart ?? body.length
    const end   = el.selectionEnd   ?? body.length
    const next  = body.slice(0, start) + tag + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + tag.length, start + tag.length)
    })
  }

  function handleSave() {
    setError(null)
    setOk(false)
    startTransition(async () => {
      const res = await upsertEmailTemplateAction({ type, subject, body })
      if (res.error) { setError(res.error); return }
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    })
  }

  function handleReset() {
    setError(null)
    setOk(false)
    startTransition(async () => {
      const res = await resetEmailTemplateAction(type)
      if (res.error) { setError(res.error); return }
      setSubject('')
      setBody('')
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    })
  }

  const dirty = subject !== (saved?.subject ?? '') || body !== (saved?.body ?? '')

  return (
    <div className="space-y-5">

      {/* Subject */}
      <div className="space-y-1.5">
        <Label htmlFor={`subject-${type}`}>Subject line</Label>
        <Input
          id={`subject-${type}`}
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder={DEFAULT_SUBJECTS[type]}
          disabled={!canEdit || isPending}
          maxLength={500}
        />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <Label htmlFor={`body-${type}`}>Opening message</Label>
        <p className="text-xs text-muted-foreground">
          This text appears at the top of the email body, after the greeting. The invoice details and PDF attachment notice follow automatically.
        </p>
        <Textarea
          id={`body-${type}`}
          ref={bodyRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={DEFAULT_BODIES[type]}
          disabled={!canEdit || isPending}
          rows={4}
          maxLength={5000}
          className="resize-none font-mono text-sm"
        />
      </div>

      {/* Variable chips */}
      {canEdit && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Insert variable</p>
          <div className="flex flex-wrap gap-1.5">
            {vars.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVar(v.key)}
                disabled={isPending}
                className="rounded border bg-muted px-2 py-0.5 font-mono text-xs text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                {`{{${v.key}}}`}
                <span className="ml-1 font-sans text-muted-foreground">— {v.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback */}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok    && <p className="text-sm text-green-600">Saved successfully.</p>}

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={isPending || !dirty}
            size="sm"
          >
            {isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
            Save
          </Button>
          {saved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset to default
            </Button>
          )}
        </div>
      )}

      {!canEdit && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Custom email templates are available on the <strong>Pro</strong> and <strong>Agency</strong> plans.
        </p>
      )}
    </div>
  )
}
