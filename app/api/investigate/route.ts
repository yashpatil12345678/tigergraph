import { NextResponse } from 'next/server'
import { investigate } from '@/lib/fraud/engine'
import type { InvestigationInput } from '@/lib/fraud/types'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<InvestigationInput>
    const required = ['case_id', 'customer_id', 'card_id'] as const
    const missing = required.filter((key) => body[key] === undefined || body[key] === null || body[key] === '')
    const flaggedTransactionId = body.flagged_transaction_id ?? (body as { flagged_txn_id?: number }).flagged_txn_id
    if (missing.length || flaggedTransactionId === undefined || flaggedTransactionId === null) return NextResponse.json({ error: `Missing required case fields: ${[...missing, flaggedTransactionId == null ? 'flagged_txn_id' : ''].filter(Boolean).join(', ')}` }, { status: 400 })
    const channel = body.channel && ['online', 'in_person'].includes(String(body.channel)) ? body.channel as InvestigationInput['channel'] : 'online'
    const result = investigate({
      case_id: String(body.case_id), customer_id: String(body.customer_id), card_id: String(body.card_id),
      flagged_transaction_id: Number(flaggedTransactionId), transaction_amount: Number(body.transaction_amount ?? 0),
      risk_score: Number(body.risk_score ?? 0), channel,
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
