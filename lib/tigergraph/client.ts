import 'server-only'

export type TigerGraphStatus = 'connected' | 'not_configured' | 'connection_failed'

export type TigerGraphConfig = {
  host: string
  graphName: string
  apiToken?: string
  username?: string
  password?: string
}

export type GraphEvidence = {
  source: 'TigerGraph'
  status: 'available' | 'unavailable'
  query: string
  entity_ids: string[]
  claim?: string
  evidence?: unknown
  error?: string
}

function config(): TigerGraphConfig | null {
  const host = process.env.TIGERGRAPH_HOST?.trim()
  const graphName = process.env.TIGERGRAPH_GRAPH_NAME?.trim()
  if (!host || !graphName) return null
  return { host: host.replace(/\/$/, ''), graphName, apiToken: process.env.TIGERGRAPH_API_TOKEN, username: process.env.TIGERGRAPH_USERNAME, password: process.env.TIGERGRAPH_PASSWORD }
}

function headers(value: TigerGraphConfig) {
  const result: Record<string, string> = { accept: 'application/json' }
  if (value.apiToken) result.Authorization = `Bearer ${value.apiToken}`
  return result
}

async function tigerFetch<T>(path: string, init: RequestInit = {}) {
  const value = config()
  if (!value) throw new Error('TigerGraph is not configured. Set TIGERGRAPH_HOST and TIGERGRAPH_GRAPH_NAME.')
  const response = await fetch(`${value.host}${path}`, { ...init, headers: { ...headers(value), ...(init.headers ?? {}) }, signal: AbortSignal.timeout(8000), cache: 'no-store' })
  const text = await response.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!response.ok) throw new Error(`TigerGraph request failed (${response.status})`)
  return body as T
}

export async function checkTigerGraph(): Promise<{ status: TigerGraphStatus; graph_name?: string; message: string }> {
  const value = config()
  if (!value) return { status: 'not_configured', message: 'TigerGraph not configured. No graph query was attempted.' }
  try {
    await tigerFetch(`/restpp/graph/${encodeURIComponent(value.graphName)}/vertices/Customer?limit=1`)
    return { status: 'connected', graph_name: value.graphName, message: `TigerGraph connected: ${value.graphName}` }
  } catch (error) {
    return { status: 'connection_failed', graph_name: value.graphName, message: error instanceof Error ? error.message : 'TigerGraph connection failed' }
  }
}

export async function queryInvestigationGraph(input: { transactionId: number; customerId: string; cardId: string }): Promise<GraphEvidence> {
  const value = config()
  if (!value) return { source: 'TigerGraph', status: 'unavailable', query: 'transaction_investigation', entity_ids: [String(input.transactionId), input.customerId, input.cardId], error: 'TigerGraph not configured. Configure TIGERGRAPH_HOST, TIGERGRAPH_GRAPH_NAME, and authentication before graph queries.' }
  try {
    const transaction = await tigerFetch(`/restpp/graph/${encodeURIComponent(value.graphName)}/vertices/Transaction/${encodeURIComponent(String(input.transactionId))}?select=*&limit=1`)
    return { source: 'TigerGraph', status: 'available', query: 'transaction_investigation', entity_ids: [String(input.transactionId), input.customerId, input.cardId], claim: 'TigerGraph returned the requested transaction vertex.', evidence: transaction }
  } catch (error) {
    return { source: 'TigerGraph', status: 'unavailable', query: 'transaction_investigation', entity_ids: [String(input.transactionId), input.customerId, input.cardId], error: error instanceof Error ? error.message : 'TigerGraph query failed' }
  }
}

export function tigerGraphConfigStatus() { return config() ? 'configured' : 'not_configured' }

export default { checkTigerGraph, queryInvestigationGraph, tigerGraphConfigStatus }
