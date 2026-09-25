import { NextResponse } from 'next/server'
import { runInvestigationAgent } from '@/lib/fraud/agent'
import { benchmarkCases } from '@/lib/fraud/case-data'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { case_id?: string }
    if (!body.case_id) return NextResponse.json({ error: 'Missing required field: case_id' }, { status: 400 })
    const result = await runInvestigationAgent({ case_id: body.case_id })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Investigation failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ service: 'investigate', status: 'ready', benchmark_cases: benchmarkCases.length, tigergraph: process.env.TIGERGRAPH_HOST && process.env.TIGERGRAPH_GRAPH_NAME ? 'configured' : 'not_configured' })
}

export const runtime = 'nodejs'
