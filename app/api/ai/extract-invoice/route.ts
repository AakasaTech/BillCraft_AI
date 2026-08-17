import { NextResponse } from 'next/server'
import https from 'node:https'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getPlanStatus } from '@/lib/subscription'

export const runtime     = 'nodejs'
export const maxDuration = 30

const requestSchema = z.object({
  prompt:   z.string().min(1).max(2000),
  clients:  z.array(z.object({ id: z.string(), name: z.string() })).default([]),
  currency: z.string().default('USD'),
})

const responseSchema = z.object({
  client_name:          z.string().nullable(),
  client_id:            z.string().nullable(),
  items: z.array(z.object({
    description: z.string(),
    quantity:    z.number(),
    unit_price:  z.number(),
  })),
  currency:             z.string().nullable(),
  issue_date:           z.string().nullable(),
  due_date:             z.string().nullable(),
  notes:                z.string().nullable(),
  payment_instructions: z.string().nullable(),
  confidence: z.object({
    client:   z.number(),
    items:    z.number(),
    currency: z.number(),
    dates:    z.number(),
    overall:  z.number(),
  }),
})

// Trading-category orgs only. Purely additive over responseSchema — every field
// above is unchanged and in the same place, so service-category behavior (the
// branch above) never touches this schema at all.
const tradingResponseSchema = z.object({
  client_name:          z.string().nullable(),
  client_id:            z.string().nullable(),
  items: z.array(z.object({
    description: z.string(),
    quantity:    z.number(),
    unit_price:  z.number(),
    hs_code:     z.string().nullable(),
  })),
  currency:             z.string().nullable(),
  issue_date:           z.string().nullable(),
  due_date:             z.string().nullable(),
  notes:                z.string().nullable(),
  payment_instructions: z.string().nullable(),
  shipping_terms:       z.string().nullable(),
  po_reference:         z.string().nullable(),
  confidence: z.object({
    client:         z.number(),
    items:          z.number(),
    currency:       z.number(),
    dates:          z.number(),
    overall:        z.number(),
    trading_fields: z.number(),
  }),
})

// Uses node:https directly to avoid undici "premature close" issues with the
// OpenAI SDK's fetch-based client in Next.js dev/production environments.
function callOpenAI(apiKey: string, payload: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload))
    const req  = https.request(
      {
        hostname: 'api.openai.com',
        path:     '/v1/chat/completions',
        method:   'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
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

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ur } = await supabase.from('users').select('organization_id').eq('id', user.id).single()

  // canUseTradingFields resolves purely from org.category (see lib/subscription.ts),
  // so reading it off the plan we already fetch for the AI gate avoids a second
  // organizations query — no separate "fetch org.category" round trip needed.
  let isTrading = false
  if (ur?.organization_id) {
    const plan = await getPlanStatus(ur.organization_id, supabase)
    if (!plan.canUseAI) {
      return NextResponse.json({ error: 'AI invoice generation requires a Pro or Agency plan.' }, { status: 403 })
    }
    isTrading = plan.canUseTradingFields
  }

  try {
    const body   = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { prompt, clients, currency } = parsed.data
    const today = new Date().toISOString().slice(0, 10)

    const clientList = clients.length > 0
      ? clients.map(c => `- ${c.name} (id: ${c.id})`).join('\n')
      : 'No clients on file yet.'

    // Service-category prompt — byte-for-byte the original prompt, unchanged.
    const servicePrompt = `You are an invoice extraction assistant. Extract structured invoice data from a natural language description and return ONLY valid JSON matching this exact structure:

{
  "client_name": string | null,
  "client_id": string | null,
  "items": [{ "description": string, "quantity": number, "unit_price": number }],
  "currency": string | null,
  "issue_date": string | null,
  "due_date": string | null,
  "notes": string | null,
  "payment_instructions": string | null,
  "confidence": { "client": number, "items": number, "currency": number, "dates": number, "overall": number }
}

Available clients:
${clientList}

Rules:
- Match client_id to the exact id from the client list above, or null if not matched.
- Quantities and prices must be positive numbers.
- Dates must be ISO 8601 (YYYY-MM-DD). Today is ${today}. Resolve relative dates (e.g. "in 14 days" adds 14 to today).
- Default currency: ${currency}. Use the default if not mentioned.
- Confidence values are 0.0–1.0 per dimension.
- Return only the JSON object, no other text.`

    // Trading-category prompt — same shape plus shipping_terms/po_reference/
    // per-item hs_code and a trading_fields confidence dimension.
    const tradingPrompt = `You are an invoice extraction assistant for a trading/import-export company. Extract structured invoice data from a natural language description and return ONLY valid JSON matching this exact structure:

{
  "client_name": string | null,
  "client_id": string | null,
  "items": [{ "description": string, "quantity": number, "unit_price": number, "hs_code": string | null }],
  "currency": string | null,
  "issue_date": string | null,
  "due_date": string | null,
  "notes": string | null,
  "payment_instructions": string | null,
  "shipping_terms": string | null,
  "po_reference": string | null,
  "confidence": { "client": number, "items": number, "currency": number, "dates": number, "overall": number, "trading_fields": number }
}

Available clients:
${clientList}

Rules:
- Match client_id to the exact id from the client list above, or null if not matched.
- Quantities and prices must be positive numbers.
- Dates must be ISO 8601 (YYYY-MM-DD). Today is ${today}. Resolve relative dates (e.g. "in 14 days" adds 14 to today).
- Default currency: ${currency}. Use the default if not mentioned.
- hs_code is the Harmonized System code for a line item if it is stated explicitly or unambiguous from the description; otherwise null. Do not guess a code you are not confident in.
- shipping_terms is a trade/shipping arrangement such as EXW, FOB, CIF, DDP, "consolidated shipment", or another arrangement stated in the prompt; null if not mentioned. There is no fixed list — match the org's own phrasing where possible, otherwise use your best-guess standard term.
- po_reference is the client's purchase order number or reference if stated; otherwise null.
- Confidence values are 0.0–1.0 per dimension. trading_fields reflects your confidence in the shipping_terms/po_reference/hs_code extractions specifically, not the other fields.
- Return only the JSON object, no other text.`

    const payload = {
      model:       'gpt-4o',
      temperature: 0,
      max_tokens:  800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: isTrading ? tradingPrompt : servicePrompt },
        { role: 'user', content: prompt },
      ],
    }

    const raw = await callOpenAI(process.env.OPENAI_API_KEY, payload) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = raw?.choices?.[0]?.message?.content
    if (!content) return NextResponse.json({ error: 'No response from AI' }, { status: 500 })

    const aiData   = JSON.parse(content)
    const validated = isTrading ? tradingResponseSchema.safeParse(aiData) : responseSchema.safeParse(aiData)
    if (!validated.success) {
      console.error('[ai/extract-invoice] schema mismatch', validated.error)
      return NextResponse.json({ error: 'AI returned unexpected format.' }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai/extract-invoice]', message)
    return NextResponse.json({ error: `AI extraction failed: ${message}` }, { status: 500 })
  }
}
