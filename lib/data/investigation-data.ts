import fs from 'node:fs'
import path from 'node:path'

export type CsvRecord = Record<string, string>
export type TransactionRecord = CsvRecord & { TransactionID: string }
export type IdentityRecord = CsvRecord & { TransactionID: string }
export type ClosedCaseRecord = CsvRecord

export type DatasetStatus = 'DATA_READY' | 'DATA_INCOMPLETE'

export type InvestigationEvidence = {
  case: { case_id: string; customer_id: string; card_id: string; flagged_txn_id: number }
  flagged_transaction: TransactionRecord | null
  related_transactions: TransactionRecord[]
  identity_records: IdentityRecord[]
  historical_cases: ClosedCaseRecord[]
  data_sources: { transactions: string; identity: string; closed_cases: string; case_pack: string }
  data_status: DatasetStatus
  validation: { flagged_transaction_found: boolean; identity_available: boolean; historical_cases_found: boolean }
}

const cache = new Map<string, { mtimeMs: number; rows: CsvRecord[] }>()
const dataDirectory = () => process.env.INVESTIGATION_DATA_DIR ? path.resolve(process.env.INVESTIGATION_DATA_DIR) : path.join(process.cwd(), 'data')

function parseCsvLine(line: string) {
  const cells: string[] = []; let cell = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') { if (quoted && line[index + 1] === '"') { cell += '"'; index += 1 } else quoted = !quoted }
    else if (char === ',' && !quoted) { cells.push(cell); cell = '' } else cell += char
  }
  cells.push(cell)
  return cells
}

function readCsv(fileName: string): { rows: CsvRecord[]; available: boolean } {
  const filePath = path.join(dataDirectory(), fileName)
  if (!fs.existsSync(filePath)) return { rows: [], available: false }
  const stat = fs.statSync(filePath); const cached = cache.get(filePath)
  if (cached?.mtimeMs === stat.mtimeMs) return { rows: cached.rows, available: true }
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/).filter(Boolean); if (!lines.length) return { rows: [], available: true }
  const headers = parseCsvLine(lines[0]); const rows = lines.slice(1).map((line) => { const values = parseCsvLine(line); return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) })
  cache.set(filePath, { mtimeMs: stat.mtimeMs, rows }); return { rows, available: true }
}

const normalize = (value: unknown) => String(value ?? '').trim()
const numeric = (value: string) => value === '' ? undefined : Number(value)

export function getInvestigationEvidence(input: { case_id: string; customer_id: string; card_id: string; flagged_txn_id: number }): InvestigationEvidence {
  const transactions = readCsv('transactions.csv'); const identity = readCsv('identity.csv'); const history = readCsv('closed_cases_history.csv'); const casePack = readCsv('case_pack.csv')
  const flaggedId = String(input.flagged_txn_id)
  const transactionRows = transactions.rows as TransactionRecord[]
  const flagged = transactionRows.find((row) => normalize(row.TransactionID) === flaggedId) ?? null
  const related = transactionRows.filter((row) => normalize(row.customer_id) === input.customer_id || normalize(row.card1) === input.card_id || normalize(row.card_id) === input.card_id).filter((row) => normalize(row.TransactionID) !== flaggedId).slice(0, 50)
  const identityRecords = identity.rows.filter((row) => normalize(row.TransactionID) === flaggedId || related.some((txn) => normalize(txn.TransactionID) === normalize(row.TransactionID))) as IdentityRecord[]
  const historical = history.rows.filter((row) => [row.customer_id, row.card_id, row.connected_card_ids, row.txn_ids].some((value) => normalize(value).includes(input.customer_id) || normalize(value).includes(input.card_id) || normalize(value).includes(flaggedId))).slice(0, 20)
  return {
    case: input,
    flagged_transaction: flagged,
    related_transactions: related,
    identity_records: identityRecords,
    historical_cases: historical,
    data_sources: { transactions: transactions.available ? 'transactions.csv' : 'unavailable', identity: identity.available ? 'identity.csv' : 'unavailable', closed_cases: history.available ? 'closed_cases_history.csv' : 'unavailable', case_pack: casePack.available ? 'case_pack.csv' : 'unavailable' },
    data_status: transactions.available && identity.available && history.available && casePack.available ? 'DATA_READY' : 'DATA_INCOMPLETE',
    validation: { flagged_transaction_found: Boolean(flagged), identity_available: identityRecords.length > 0, historical_cases_found: historical.length > 0 },
  }
}

export function transactionToInvestigationFields(transaction: TransactionRecord | null) {
  if (!transaction) return { amount: 0, risk_score: 0, channel: 'online' as const, burst_count: 1 }
  const channel = normalize(transaction.channel) === 'in_person' || normalize(transaction.ProductCD) === 'W' ? 'in_person' as const : 'online' as const
  return { amount: numeric(normalize(transaction.TransactionAmt)) ?? 0, risk_score: numeric(normalize(transaction.risk_score)) ?? 0, channel, burst_count: 1 }
}

export function dataFilesStatus() {
  const files = ['transactions.csv', 'identity.csv', 'closed_cases_history.csv', 'case_pack.csv']
  const statuses = files.map((file) => ({ file, available: fs.existsSync(path.join(dataDirectory(), file)), directory: dataDirectory() }))
  return { status: statuses.every((item) => item.available) ? 'DATA_READY' as const : 'DATA_INCOMPLETE' as const, directory: dataDirectory(), files: statuses }
}

export function validateEvidenceReferences(evidence: InvestigationEvidence) {
  if (evidence.case.flagged_txn_id <= 0 || !evidence.case.customer_id || !evidence.case.card_id) throw new Error('Invalid investigation identifiers')
  if (evidence.flagged_transaction && normalize(evidence.flagged_transaction.TransactionID) !== String(evidence.case.flagged_txn_id)) throw new Error('Flagged transaction reference mismatch')
  return evidence
}

export { normalize }
export default { getInvestigationEvidence, transactionToInvestigationFields, dataFilesStatus, validateEvidenceReferences }
