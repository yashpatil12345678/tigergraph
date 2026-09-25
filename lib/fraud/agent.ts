import 'server-only'

import { getInvestigationEvidence, normalize, transactionToInvestigationFields } from '@/lib/data/investigation-data'
import { checkTigerGraph, queryInvestigationGraph } from '@/lib/tigergraph/client'
import { benchmarkCases, type BenchmarkCase } from './case-data'
import { calculateExposure, makeDecision, type ActionDecision, type Evidence, type EvidenceRequest, type InvestigationResult, type Pattern } from './types'

type ToolStatus = 'success' | 'unavailable'
type ToolCall = { name: string; input: Record<string, unknown>; status: ToolStatus; provenance: string }

type AgentContext = {
  case: BenchmarkCase
  data: ReturnType<typeof getInvestigationEvidence>
  graph: Awaited<ReturnType<typeof queryInvestigationGraph>>
  evidence: Evidence[]
  tools: ToolCall[]
  requests: EvidenceRequest[]
  trace: string[]
}

function tool(context: AgentContext, name: string, input: Record<string, unknown>, status: ToolStatus, provenance: string) {
  context.tools.push({ name, input, status, provenance })
  context.trace.push(`${context.trace.length + 1}. ${name}: ${provenance}`)
}
function field(row: Record<string, string> | null, ...keys: string[]) { if (!row) return '' ; for (const key of keys) if (normalize(row[key])) return normalize(row[key]); return '' }
function evidence(id: string, claim: string, source: Evidence['source'], ref: string, entity_ids: string[], relevance = 0.8): Evidence { return { evidence_id: id, claim, source, ref, entity_ids, confidence: 1, relevance } }

function detectPattern(context: AgentContext, identityCount: number, historyCount: number): { pattern: Pattern; probability: number; findings: string[]; independent: Set<string> } {
  const txn = context.data.flagged_transaction
  const related = context.data.related_transactions
  const online = [txn, ...related].filter(Boolean).filter((row) => field(row, 'channel') === 'online' || field(row, 'ProductCD') !== 'W')
  const tiny = online.filter((row) => { const amount = Number(field(row, 'TransactionAmt')); return Number.isFinite(amount) && amount > 0 && amount < 5 }).length
  const device = context.data.identity_records.map((row) => field(row, 'DeviceInfo', 'DeviceType', 'id_30', 'id_31')).filter(Boolean)
  const distinctDevices = new Set(device).size
  const findings: string[] = []
  const independent = new Set<string>(['transaction'])
  let probability = Number(context.case.risk_score ?? 0) * 0.35
  let pattern: Pattern = 'none'
  if (tiny >= 3 && related.length >= 3) { pattern = 'card_testing'; probability += 0.35; independent.add('behavior'); findings.push('At least three small online authorizations appear in the bounded card/customer window.') }
  else if (online.length >= 3 && related.length >= 2) { pattern = 'card_not_present_fraud'; probability += 0.22; independent.add('behavior'); findings.push('Repeated online activity is present in the bounded investigation window.') }
  if (distinctDevices > 1) { pattern = pattern === 'none' ? 'card_not_present_new_device' : pattern; probability += 0.18; independent.add('identity'); findings.push('Multiple device values are present in identity records joined by TransactionID.') }
  if (context.graph.status === 'available') { independent.add('graph'); probability += 0.1; findings.push('TigerGraph returned a transaction investigation response.') }
  if (historyCount > 0) { independent.add('historical_case'); findings.push(`${historyCount} related closed case record(s) were retrieved for context.`) }
  return { pattern, probability: Math.min(0.98, Math.max(0.05, Number(probability.toFixed(2)))), findings, independent }
}

export async function runInvestigationAgent(input: { case_id: string; customer_id?: string; card_id?: string; flagged_txn_id?: number }) : Promise<InvestigationResult> {
  const selected = benchmarkCases.find((item) => item.case_id === input.case_id)
  if (!selected) throw new Error(`Unknown benchmark case: ${input.case_id}`)
  const context: AgentContext = { case: selected, data: getInvestigationEvidence({ case_id: selected.case_id, customer_id: selected.customer_id, card_id: selected.card_id, flagged_txn_id: selected.flagged_txn_id }), graph: await queryInvestigationGraph({ transactionId: selected.flagged_txn_id, customerId: selected.customer_id, cardId: selected.card_id }), evidence: [], tools: [], requests: [], trace: [] }
  tool(context, 'get_case', { case_id: selected.case_id }, 'success', 'case_pack.csv')
  const txn = context.data.flagged_transaction
  if (txn) { context.evidence.push(evidence('txn-flagged', `Flagged transaction ${selected.flagged_txn_id} was retrieved from transactions.csv.`, 'transaction', `TransactionID:${selected.flagged_txn_id}`, [String(selected.flagged_txn_id), selected.customer_id, selected.card_id])); tool(context, 'get_transaction', { TransactionID: selected.flagged_txn_id }, 'success', 'transactions.csv') } else tool(context, 'get_transaction', { TransactionID: selected.flagged_txn_id }, 'unavailable', 'Flagged transaction was not found in transactions.csv')
  const related = context.data.related_transactions
  context.evidence.push(...related.slice(0, 12).map((row, i) => evidence(`txn-related-${i}`, `Related transaction ${field(row, 'TransactionID')} shares the selected customer/card context.`, 'transaction', `TransactionID:${field(row, 'TransactionID')}`, [field(row, 'TransactionID'), selected.customer_id, selected.card_id], 0.7)))
  tool(context, 'get_customer_history', { customer_id: selected.customer_id }, related.length ? 'success' : 'unavailable', `${related.length} bounded related transaction(s) returned`)
  tool(context, 'get_card_history', { card_id: selected.card_id }, related.length ? 'success' : 'unavailable', 'Card history derived from the same bounded transaction query')
  const identityCount = context.data.identity_records.length
  if (identityCount) context.evidence.push(evidence('identity-joined', `${identityCount} identity record(s) were joined by TransactionID without semantic renaming.`, 'identity', `TransactionID:${selected.flagged_txn_id}`, [String(selected.flagged_txn_id)], 0.85))
  tool(context, 'get_identity', { TransactionID: selected.flagged_txn_id }, identityCount ? 'success' : 'unavailable', identityCount ? 'identity.csv' : 'No identity record available for the flagged TransactionID')
  tool(context, 'graph_investigate_transaction', { TransactionID: selected.flagged_txn_id }, context.graph.status === 'available' ? 'success' : 'unavailable', context.graph.status === 'available' ? 'TigerGraph transaction_investigation query' : context.graph.error ?? 'TigerGraph unavailable')
  if (context.graph.status === 'available') context.evidence.push(evidence('graph-transaction', 'TigerGraph returned graph evidence for the flagged transaction.', 'graph', 'TigerGraph:transaction_investigation', context.graph.entity_ids, 0.95))
  const history = context.data.historical_cases
  context.evidence.push(...history.slice(0, 8).map((item, i) => evidence(`history-${i}`, `Historical case ${field(item, 'case_id')} matched customer/card/transaction context.`, 'historical_case', `closed_cases_history.csv:${field(item, 'case_id') || i}`, [selected.customer_id, selected.card_id], 0.75)))
  tool(context, 'find_similar_closed_cases', { case_id: selected.case_id, customer_id: selected.customer_id, card_id: selected.card_id }, history.length ? 'success' : 'unavailable', `${history.length} historical case(s) retrieved`)
  const assessment = detectPattern(context, identityCount, history.length)
  const findings = assessment.findings.length ? assessment.findings : ['No documented multi-signal pattern was established from the available bounded evidence.']
  const amounts = [txn, ...related].map((row) => Number(field(row, 'TransactionAmt'))).filter(Number.isFinite)
  const exposure = calculateExposure(amounts)
  const insufficient = assessment.independent.size < 2 || !txn
  if (insufficient) context.requests.push({ type: 'additional_transaction_or_customer_evidence', reason: !txn ? 'Flagged transaction is unavailable in the supplied transaction source.' : 'Fewer than two independent evidence sources support a decisive conclusion.', expected_decision_impact: 'A longer window or verification could materially change the recommendation.', simulated: false })
  tool(context, 'request_additional_evidence', { type: context.requests[0]?.type ?? 'none' }, context.requests.length ? 'success' : 'unavailable', context.requests.length ? 'Evidence request recorded; no response was invented.' : 'Additional evidence not required')
  const initial: ActionDecision[] = [makeDecision(assessment.probability >= 0.7 ? 'VERIFY_WITH_CUSTOMER' : 'MONITOR_CARD', 'Initial triage uses the trigger and preserves uncertainty before stronger action.', 'R1', ['txn-flagged'], exposure)]
  let final: ActionDecision[]
  if (assessment.pattern === 'card_testing') final = [makeDecision('DECLINE_TRANSACTION', 'Card-testing pattern requires an L1 decline recommendation.', 'R5', ['txn-flagged'], exposure), makeDecision('STEP_UP_AUTH', 'Step-up authentication is required for card testing.', 'R5', ['txn-flagged'], exposure)]
  else if (assessment.independent.has('graph') && context.graph.status === 'available') final = [makeDecision('CREATE_CASE', 'Graph evidence is available and the investigation is case-worthy.', 'R6', ['graph-transaction'], exposure), makeDecision('MONITOR_CARD', 'Continue monitoring while approval-required actions remain pending.', 'R6', ['graph-transaction'], exposure)]
  else if (insufficient) final = [makeDecision('ESCALATE_TO_ANALYST', 'Material uncertainty remains and no customer response is available.', 'R8', ['txn-flagged'], exposure)]
  else final = [makeDecision('VERIFY_WITH_CUSTOMER', 'Available evidence supports verification before stronger action.', 'R1', ['txn-flagged'], exposure)]
  const sarFile = assessment.pattern === 'undocumented' || exposure > 1000 && assessment.probability >= 0.7
  const stopReason = assessment.probability >= 0.85 && assessment.independent.size >= 2 ? 'High probability supported by independent evidence.' : assessment.probability <= 0.15 && assessment.independent.size >= 2 ? 'Low probability supported by independent evidence.' : 'Further evidence may change the decision; investigation stopped at the bounded evidence boundary.'
  const graphStatus = await checkTigerGraph()
  const status = final.some((item) => item.route !== 'AUTO') ? 'escalated' : 'open'
  return { case_id: selected.case_id, case: { status, verdict: assessment.probability >= 0.85 ? 'fraud' : assessment.probability <= 0.15 ? 'legitimate' : 'uncertain', fraud_probability: assessment.probability, pattern: assessment.pattern, pattern_description: assessment.pattern === 'none' ? undefined : findings.join(' ') , affected_txn_ids: amounts.length ? [selected.flagged_txn_id, ...related.map((row) => Number(field(row, 'TransactionID'))).filter(Number.isFinite).slice(0, 12)] : [selected.flagged_txn_id], first_suspicious_txn_id: selected.flagged_txn_id, connected_card_ids: [selected.card_id], connected_device_profiles: context.data.identity_records.map((row) => field(row, 'DeviceInfo', 'DeviceType', 'id_30', 'id_31')).filter(Boolean), exposure_usd: exposure, evidence: context.evidence, similar_prior_cases: history.slice(0, 8).map((item) => ({ case_id: field(item, 'case_id'), outcome: field(item, 'outcome'), pattern: field(item, 'pattern'), relevance: 'Matched source customer/card/transaction context' })), summary: findings.join(' '), written_to_graph: false, graph_case_id: '' }, evidence_requests: context.requests, next_best_actions: { initial, final, what_changed: 'Initial triage was reassessed after transaction, identity, historical, and TigerGraph tool results.' }, sar: { file: sarFile, reason: sarFile ? 'Strong evidence or exposure meets report criteria.' : '', narrative: sarFile ? `The investigation concerns customer ${selected.customer_id} and card ${selected.card_id}. Transaction ${selected.flagged_txn_id} was reviewed from the supplied transaction dataset. The activity occurred in the available transaction window. The observed channel and amount were taken from source records. Related transaction and identity evidence was considered where available. The report recommendation is based on the accumulated evidence and policy criteria.` : '', subjects: sarFile ? [selected.customer_id, selected.card_id] : [], total_amount_usd: sarFile ? exposure : 0, activity_dates: sarFile ? [selected.opened_at] : [] }, stop_reason: stopReason, tool_calls: context.tools, tokens: 0, latency_s: 0, system_status: { tigergraph: graphStatus.status, message: graphStatus.message } }
}

export default runInvestigationAgent
