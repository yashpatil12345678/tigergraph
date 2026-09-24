import { NextResponse } from 'next/server'
import { getInvestigationEvidence, validateEvidenceReferences } from '@/lib/data/investigation-data'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<{ case_id: string; customer_id: string; card_id: string; flagged_txn_id: number }>
    const required = ['case_id', 'customer_id', 'card_id', 'flagged_txn_id'] as const
    const missing = required.filter((key) => body[key] === undefined || body[key] === null || body[key] === '')
    if (missing.length) return NextResponse.json({ error: `Missing required case fields: ${missing.join(', ')}` }, { status: 400 })
    const input = { case_id: String(body.case_id), customer_id: String(body.customer_id), card_id: String(body.card_id), flagged_txn_id: Number(body.flagged_txn_id) }
    const evidence = validateEvidenceReferences(getInvestigationEvidence(input))
    return NextResponse.json(evidence)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Evidence retrieval failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ service: 'evidence', status: 'ready', data_directory: process.env.INVESTIGATION_DATA_DIR ?? 'data/', message: 'Server-side dataset adapter ready. Large CSVs are never sent to the browser.' })
}
