import { NextResponse } from 'next/server'
import { investigate } from '@/lib/fraud/engine'
import type { InvestigationInput } from '@/lib/fraud/types'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<InvestigationInput>
    const required = ['case_id', 'customer_id', 'card_id', 'flagged_transaction_id', 'transaction_amount', 'risk_score', 'channel'] as const
    const missing = required.filter((key) => body[key] === undefined || body[key] === null || body[key] === '')
    if (missing.length) return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    if (!['online', 'in_person'].includes(String(body.channel))) return NextResponse.json({ error: 'channel must be online or in_person' }, { status: 400 })
    const result = investigate({
      case_id: String(body.case_id), customer_id: String(body.customer_id), card_id: String(body.card_id),
      flagged_transaction_id: Number(body.flagged_transaction_id), transaction_amount: Number(body.transaction_amount),
      risk_score: Number(body.risk_score), channel: body.channel as InvestigationInput['channel'],
      device_shared: Boolean(body.device_shared), burst_count: Number(body.burst_count ?? 1),
      customer_response: body.customer_response,
    })
    return NextResponse.json({ ...result, system_status: { tigergraph: 'unconfigured', message: 'TigerGraph credentials are not configured; deterministic local graph adapter used and no external graph write was claimed.' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Investigation failed' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ service: 'investigate', status: 'ready', tigergraph: process.env.TIGERGRAPH_URL ? 'configured' : 'unconfigured' }) }

export const runtime = 'nodejs'
