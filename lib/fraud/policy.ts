import { makeDecision, type ActionDecision, type Pattern } from './types'

export type PolicyContext = { probability: number; pattern: Pattern; exposure: number; sharedOrigin: boolean; conflictingEvidence: boolean; customerResponse?: 'denied' | 'confirmed' | 'no_reply' }

export function applyPolicy(context: PolicyContext): ActionDecision[] {
  const { probability, pattern, exposure, sharedOrigin, conflictingEvidence, customerResponse } = context
  if (customerResponse === 'confirmed') return [makeDecision('CLOSE_NO_FRAUD', 'Customer confirmed the activity.', 'R3', [], exposure)]
  if (customerResponse === 'denied') return [makeDecision('BLOCK_CARD', 'Customer denied the activity; card blocking requires approval.', 'R2', [], exposure), makeDecision('CREATE_CASE', 'A denied transaction requires a case.', 'R2', [], exposure), ...(exposure > 1000 || sharedOrigin ? [makeDecision('FILE_REPORT', 'Denied activity meets reporting criteria.', 'R2', [], exposure)] : [])]
  if (customerResponse === 'no_reply') return [makeDecision('MONITOR_CARD', 'No reply after the verification window requires monitoring.', 'R4', [], exposure), makeDecision('DECLINE_TRANSACTION', 'Pending authorizations should be declined.', 'R4', [], exposure), ...(exposure > 500 ? [makeDecision('ESCALATE_TO_ANALYST', 'No reply with material exposure requires escalation.', 'R4', [], exposure)] : [])]
  if (pattern === 'card_testing') return [makeDecision('DECLINE_TRANSACTION', 'Card testing requires a decline recommendation.', 'R5', [], exposure), makeDecision('STEP_UP_AUTH', 'Card testing requires step-up authentication.', 'R5', [], exposure), ...(exposure > 100 ? [makeDecision('BLOCK_CARD', 'Card-testing exposure exceeds the blocking threshold.', 'R5', [], exposure)] : [])]
  if (sharedOrigin) return [makeDecision('CREATE_CASE', 'Shared origin across cards requires a case.', 'R6', [], exposure), makeDecision('FILE_REPORT', 'Shared-origin activity requires reporting review.', 'R6', [], exposure), makeDecision('MONITOR_CONNECTED_CARDS', 'Connected cards require monitoring.', 'R6', [], exposure)]
  if (pattern === 'undocumented') return [makeDecision('CREATE_CASE', 'Coordinated abuse does not match a documented pattern.', 'R9', [], exposure), makeDecision('FILE_REPORT', 'Undocumented coordinated abuse requires reporting review.', 'R9', [], exposure), makeDecision('ESCALATE_TO_ANALYST', 'Undocumented abuse requires analyst review.', 'R9', [], exposure)]
  if (probability < 0.7 || conflictingEvidence) return [makeDecision('VERIFY_WITH_CUSTOMER', 'A weak or conflicting signal requires verification before blocking.', 'R1', [], exposure), ...(conflictingEvidence || exposure > 500 ? [makeDecision('ESCALATE_TO_ANALYST', 'Conflicting or material evidence requires analyst review.', 'R8', [], exposure)] : [])]
  return [makeDecision('STEP_UP_AUTH', 'Additional authentication is appropriate before stronger action.', 'R1', [], exposure)]
}

export function canExecuteAutomatically(action: ActionDecision) { return action.route === 'AUTO' }
