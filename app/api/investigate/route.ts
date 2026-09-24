import { NextResponse } from 'next/server'
import { investigate } from '@/lib/fraud/engine'
import type { InvestigationInput } from '@/lib/fraud/types'
import { getInvestigationEvidence, transactionToInvestigationFields, validateEvidenceReferences } from '@/lib/data/investigation-data'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<InvestigationInput>
    const required = ['case_id', 'customer_id', 'card_id'] as const
    const missing = required.filter((key) => body[key] === undefined || body[key] === null || body[key] === '')
    const flaggedTransactionId = body.flagged_transaction_id ?? (body as { flagged_txn_id?: number }).flagged_txn_id
    if (missing.length || flaggedTransactionId === undefined || flaggedTransactionId === null) return NextResponse.json({ error: `Missing required case fields: ${[...missing, flaggedTransactionId == null ? 'flagged_txn_id' : ''].filter(Boolean).join(', ')}` }, { status: 400 })
    const caseInput = { case_id: String(body.case_id), customer_id: String(body.customer_id), card_id: String(body.card_id), flagged_txn_id: Number(flaggedTransactionId) }
    const evidenceData = validateEvidenceReferences(getInvestigationEvidence(caseInput))
    const transactionFields = transactionToInvestigationFields(evidenceData.flagged_transaction)
    const channel = body.channel && ['online', 'in_person'].includes(String(body.channel)) ? body.channel as InvestigationInput['channel'] : transactionFields.channel
    const result = investigate({
      case_id: caseInput.case_id, customer_id: caseInput.customer_id, card_id: caseInput.card_id,
      flagged_transaction_id: caseInput.flagged_txn_id, transaction_amount: transactionFields.amount,
      risk_score: transactionFields.risk_score || Number(body.risk_score ?? 0), channel,
      device_shared: Boolean(body.device_shared), burst_count: transactionFields.burst_count,
      customer_response: body.customer_response,
    })
    const realEvidence = [
      ...(evidenceData.flagged_transaction ? [{ evidence_id: 'data-flagged-transaction', claim: `Flagged transaction ${caseInput.flagged_txn_id} retrieved from transactions.csv.`, source: 'transaction' as const, ref: `TransactionID:${caseInput.flagged_txn_id}`, entity_ids: [String(caseInput.flagged_txn_id), caseInput.customer_id, caseInput.card_id], confidence: 1, relevance: 1 }] : []),
      ...(evidenceData.identity_records.length ? [{ evidence_id: 'data-identity', claim: `${evidenceData.identity_records.length} identity record(s) joined by TransactionID.`, source: 'identity' as const, ref: `TransactionID:${caseInput.flagged_txn_id}`, entity_ids: [String(caseInput.flagged_txn_id)], confidence: 1, relevance: 0.8 }] : []),
      ...(evidenceData.historical_cases.length ? evidenceData.historical_cases.map((item, index) => ({ evidence_id: `data-history-${index}`, claim: `Historical case ${item.case_id || 'record'} matched the selected case context.`, source: 'historical_case' as const, ref: `closed_cases_history.csv:${item.case_id || index}`, entity_ids: [caseInput.customer_id, caseInput.card_id], confidence: 1, relevance: 0.7 })) : []),
    ]
    return NextResponse.json({ ...result, case: { ...result.case, evidence: [...realEvidence, ...result.case.evidence], exposure_usd: transactionFields.amount ? result.case.exposure_usd : 0 }, data_evidence: evidenceData, system_status: { tigergraph: 'unconfigured', message: 'Real dataset adapter queried server-side. TigerGraph is not yet connected; no external graph result or write was claimed.' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Investigation failed' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ service: 'investigate', status: 'ready', tigergraph: process.env.TIGERGRAPH_URL ? 'configured' : 'unconfigured' }) }

export const runtime = 'nodejs'
