export type BenchmarkCase = {
  case_id: string
  opened_at: string
  trigger_type: 'risk_score' | 'customer_report' | 'analyst_request'
  trigger_text?: string
  flagged_txn_id: number
  card_id: string
  customer_id: string
  risk_score?: number
}

export const benchmarkCases: BenchmarkCase[] = [
  { case_id: 'HHG-001', opened_at: '2016-12-05 01:55:28', trigger_type: 'risk_score', flagged_txn_id: 3514030, card_id: 'C12382-K1', customer_id: 'C12382', risk_score: 0.61 },
  { case_id: 'HHG-002', opened_at: '2016-11-22 23:27:07', trigger_type: 'risk_score', flagged_txn_id: 3478782, card_id: 'C11891-K1', customer_id: 'C11891', risk_score: 0.79 },
  { case_id: 'HHG-003', opened_at: '2016-12-10 15:01:21', trigger_type: 'customer_report', flagged_txn_id: 3530164, card_id: 'C08623-K2', customer_id: 'C08623' },
  { case_id: 'HHG-004', opened_at: '2016-12-29 07:53:54', trigger_type: 'customer_report', flagged_txn_id: 3583227, card_id: 'C08106-K1', customer_id: 'C08106' },
  { case_id: 'HHG-005', opened_at: '2016-12-08 03:38:37', trigger_type: 'risk_score', flagged_txn_id: 3523199, card_id: 'C02923-K1', customer_id: 'C02923', risk_score: 0.54 },
  { case_id: 'HHG-006', opened_at: '2016-11-22 02:30', trigger_type: 'customer_report', flagged_txn_id: 3476682, card_id: 'C07297-K1', customer_id: 'C07297' },
  { case_id: 'HHG-007', opened_at: '2016-12-05 03:46:14', trigger_type: 'risk_score', flagged_txn_id: 3514948, card_id: 'C09933-K2', customer_id: 'C09933', risk_score: 0.87 },
  { case_id: 'HHG-008', opened_at: '2016-12-20 03:08:56', trigger_type: 'customer_report', flagged_txn_id: 3558054, card_id: 'C13171-K2', customer_id: 'C13171' },
  { case_id: 'HHG-009', opened_at: '2016-12-28 17:10:53', trigger_type: 'customer_report', flagged_txn_id: 3581141, card_id: 'C08299-K1', customer_id: 'C08299' },
  { case_id: 'HHG-010', opened_at: '2016-12-02 18:18:27', trigger_type: 'risk_score', flagged_txn_id: 3506725, card_id: 'C10434-K1', customer_id: 'C10434', risk_score: 0.90 },
  { case_id: 'HHG-011', opened_at: '2016-12-29 06:27:44', trigger_type: 'customer_report', flagged_txn_id: 3583368, card_id: 'C11923-K2', customer_id: 'C11923' },
  { case_id: 'HHG-012', opened_at: '2016-12-18 05:00:31', trigger_type: 'risk_score', flagged_txn_id: 3553342, card_id: 'C05876-K2', customer_id: 'C05876', risk_score: 0.55 },
  { case_id: 'HHG-013', opened_at: '2016-12-09 05:39:29', trigger_type: 'risk_score', flagged_txn_id: 3526826, card_id: 'C07671-K2', customer_id: 'C07671', risk_score: 0.76 },
  { case_id: 'HHG-014', opened_at: '2016-11-22 20:11:00', trigger_type: 'analyst_request', trigger_text: 'several cards show purchases from same unusual device profile', flagged_txn_id: 3478561, card_id: 'C13487-K1', customer_id: 'C13487' },
  { case_id: 'HHG-015', opened_at: '2016-11-17 19:03:36', trigger_type: 'risk_score', flagged_txn_id: 3464869, card_id: 'C03042-K1', customer_id: 'C03042', risk_score: 0.77 },
  { case_id: 'HHG-016', opened_at: '2016-12-12 01:39:08', trigger_type: 'customer_report', flagged_txn_id: 3534820, card_id: 'C09988-K1', customer_id: 'C09988' },
  { case_id: 'HHG-017', opened_at: '2016-11-12 00:46:24', trigger_type: 'risk_score', flagged_txn_id: 3450629, card_id: 'C04570-K1', customer_id: 'C04570', risk_score: 0.57 },
  { case_id: 'HHG-018', opened_at: '2016-11-27 14:41:26', trigger_type: 'customer_report', flagged_txn_id: 3491361, card_id: 'C02354-K2', customer_id: 'C02354' },
  { case_id: 'HHG-019', opened_at: '2016-12-01 22:28:53', trigger_type: 'risk_score', flagged_txn_id: 3503878, card_id: 'C07987-K2', customer_id: 'C07987', risk_score: 0.90 },
  { case_id: 'HHG-020', opened_at: '2016-12-03 12:04:26', trigger_type: 'risk_score', flagged_txn_id: 3509359, card_id: 'C12265-K2', customer_id: 'C12265', risk_score: 0.52 },
]

const expectedCaseIds = Array.from({ length: 20 }, (_, index) => `HHG-${String(index + 1).padStart(3, '0')}`)
export const benchmarkValidation = (() => {
  const ids = benchmarkCases.map((item) => item.case_id)
  const valid = benchmarkCases.length === 20 && new Set(ids).size === 20 && expectedCaseIds.every((id) => ids.includes(id)) && benchmarkCases.every((item) => item.flagged_txn_id && item.customer_id && item.card_id)
  if (!valid) throw new Error('Benchmark case data must contain exactly HHG-001 through HHG-020 with required identifiers.')
  return { valid, count: benchmarkCases.length }
})()
