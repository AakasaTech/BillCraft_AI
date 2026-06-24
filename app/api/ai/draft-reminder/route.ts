import { NextResponse } from 'next/server'
import https from 'node:https'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getPlanStatus } from '@/lib/subscription'

export const runtime     = 'nodejs'
export const maxDuration = 30

const requestSchema = z.object({
  invoice_id: z.string().uuid(),
})

function callOpenAI(apiKey: string, payload: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload))
    const req  = https.request(
      {
        hostname: 'api.openai.com',
        path:     '/v1/chat/completions',
        method:   'POST',
        headers: {
          'Authorization':  `Bearer ${apiKey}`,
          'Content-Type':   'application/json',
          'Content-Length': body.length,
        },
        agent: new https.Agent({ keepAlive: false }),
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString('utf8'))
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(json.error?.message ?? `OpenAI HTTP ${res.statusCode}`))
            } else {
              resolve(json)
            }
          } catch {
            reject(new Error('Failed to parse OpenAI response'))
          }
        })
        res.on('error', reject)
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) } catch { return d }
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ur } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  if (!ur?.organization_id) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
  }

  const plan = await getPlanStatus(ur.organization_id, supabase)
  if (!plan.canUseAI) {
    return NextResponse.json(
      { error: 'AI reminder drafting requires a Pro or Agency plan.' },
      { status: 403 },
    )
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invoice_id is required.' }, { status: 400 })
  }

  const { invoice_id } = parsed.data
  const orgId = ur.organization_id

  const [{ data: invoice }, { data: org }, { count: reminderCount }] = await Promise.all([
    supabase
      .from('invoices')
      .select('invoice_number, amount_due, total, currency, due_date, issue_date, last_reminder_sent_at, clients(name)')
      .eq('id', invoice_id)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single(),
    supabase
      .from('email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('invoice_id', invoice_id)
      .eq('organization_id', orgId),
  ])

  if (!invoice || !org) {
    return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
  }

  const clientName   = (invoice.clients as { name: string } | null)?.name ?? 'the client'
  const daysOverdue  = invoice.due_date
    ? Math.max(0, Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86_400_000))
    : 0
  const prevCount    = reminderCount ?? 0

  const toneInstruction = daysOverdue > 14
    ? 'The invoice is significantly overdue. Be firm but respectful; convey urgency without being aggressive.'
    : daysOverdue > 0
    ? 'The invoice is overdue. Be polite but clear that prompt payment is needed.'
    : 'The invoice is approaching or at its due date. Keep the tone friendly and helpful.'

  const systemPrompt = `You are a professional accounts receivable assistant for ${org.name}.
Write a short, personalized payment reminder message body — 2 to 3 sentences.

Rules:
- Do NOT include a greeting (e.g. "Hi [name],") — it is added automatically.
- Do NOT mention attaching a PDF — that is handled automatically.
- Do NOT include a sign-off or closing (e.g. "Thank you", "Best regards").
- Reference the specific invoice number and amount due.
- Return only the plain message text. No labels, no markdown, no JSON.

${toneInstruction}`

  const userPrompt = `Draft a payment reminder for:
- Client: ${clientName}
- Invoice: ${invoice.invoice_number}
- Amount due: ${fmt(invoice.amount_due, invoice.currency)}
- Issue date: ${fmtDate(invoice.issue_date)}
- Due date: ${fmtDate(invoice.due_date)}${daysOverdue > 0 ? `\n- Days overdue: ${daysOverdue}` : ''}
- Reminders already sent: ${prevCount}`

  try {
    const aiResponse = await callOpenAI(process.env.OPENAI_API_KEY, {
      model:       'gpt-4o',
      temperature: 0.7,
      max_tokens:  200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
    }) as { choices?: Array<{ message?: { content?: string } }> }

    const draft = aiResponse?.choices?.[0]?.message?.content?.trim()
    if (!draft) return NextResponse.json({ error: 'No response from AI.' }, { status: 500 })

    // Log AI usage (fire-and-forget)
    void supabase.from('ai_requests').insert({
      organization_id: orgId,
      user_id:         user.id,
      feature:         'payment_reminder',
      prompt_tokens:   0,
      completion_tokens: 0,
      total_tokens:    0,
      model:           'gpt-4o',
      status:          'success',
    })

    return NextResponse.json({ body: draft })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai/draft-reminder]', message)
    return NextResponse.json({ error: `AI drafting failed: ${message}` }, { status: 500 })
  }
}
