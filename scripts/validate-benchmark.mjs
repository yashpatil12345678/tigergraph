import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const casesDir = path.join(root, 'cases')
const expectedIds = Array.from({ length: 20 }, (_, index) => `HHG-${String(index + 1).padStart(3, '0')}`)
const statuses = new Set(['open', 'closed_fraud', 'closed_legitimate', 'escalated'])
const verdicts = new Set(['fraud', 'legitimate', 'uncertain'])
const patterns = new Set(['card_testing', 'card_not_present_fraud', 'card_not_present_new_device', 'out_of_region_use', 'account_takeover', 'undocumented', 'none'])
const routes = new Set(['AUTO', 'L1', 'L2'])
const requiredTop = ['case_id', 'case', 'evidence_requests', 'next_best_actions', 'sar', 'stop_reason', 'tool_calls', 'tokens', 'latency_s']
const requiredCase = ['status', 'verdict', 'fraud_probability', 'pattern', 'affected_txn_ids', 'first_suspicious_txn_id', 'connected_card_ids', 'connected_device_profiles', 'exposure_usd', 'evidence', 'similar_prior_cases', 'summary', 'written_to_graph', 'graph_case_id']

function fail(message) { throw new Error(message) }
if (!fs.existsSync(casesDir)) fail('cases/ directory is missing')
const files = fs.readdirSync(casesDir).filter((file) => file.endsWith('.json')).sort()
if (files.length !== 20) fail(`Expected exactly 20 JSON files, found ${files.length}`)
if (files.join('|') !== expectedIds.map((id) => `${id}.json`).join('|')) fail('Benchmark filenames must be exactly HHG-001.json through HHG-020.json')

for (const file of files) {
  const id = file.slice(0, -5)
  let output
  try { output = JSON.parse(fs.readFileSync(path.join(casesDir, file), 'utf8')) } catch (error) { fail(`${file}: invalid JSON: ${error.message}`) }
  for (const key of requiredTop) if (!(key in output)) fail(`${file}: missing top-level field ${key}`)
  if (output.case_id !== id) fail(`${file}: case_id mismatch`)
  for (const key of requiredCase) if (!(key in output.case)) fail(`${file}: missing case field ${key}`)
  const current = output.case
  if (!statuses.has(current.status)) fail(`${file}: invalid status ${current.status}`)
  if (!verdicts.has(current.verdict)) fail(`${file}: invalid verdict ${current.verdict}`)
  if (!patterns.has(current.pattern)) fail(`${file}: invalid pattern ${current.pattern}`)
  if (typeof current.fraud_probability !== 'number' || current.fraud_probability < 0 || current.fraud_probability > 1) fail(`${file}: invalid fraud_probability`)
  if (typeof current.exposure_usd !== 'number' || current.exposure_usd < 0) fail(`${file}: invalid exposure_usd`)
  if (current.pattern === 'undocumented' && !current.pattern_description) fail(`${file}: undocumented pattern requires description`)
  if (current.verdict === 'legitimate' && (current.affected_txn_ids.length !== 0 || current.exposure_usd !== 0)) fail(`${file}: legitimate case must have zero exposure and no affected transactions`)
  if (typeof output.sar?.file !== 'boolean') fail(`${file}: malformed SAR object`)
  if (!output.sar.file && (output.sar.narrative !== '' || output.sar.subjects.length !== 0 || output.sar.total_amount_usd !== 0 || output.sar.activity_dates.length !== 0)) fail(`${file}: SAR false must have empty fields`)
  for (const actionSet of [output.next_best_actions.initial, output.next_best_actions.final]) {
    if (!Array.isArray(actionSet)) fail(`${file}: action set must be an array`)
    for (const action of actionSet) {
      if (!action.action || !routes.has(action.route)) fail(`${file}: invalid action route`)
      if ((action.route === 'L1' || action.route === 'L2') && action.status === 'executed') fail(`${file}: approval-required action marked executed`)
    }
  }
  for (const item of current.evidence) if (!item.claim || !item.source || !item.ref || !Array.isArray(item.entity_ids)) fail(`${file}: malformed evidence item`)
}
console.log(JSON.stringify({ total_cases: 20, validation: 'passed', files }, null, 2))
