import { NextResponse } from 'next/server'
import { runInvestigationAgent } from '@/lib/fraud/agent'
import { benchmarkCases } from '@/lib/fraud/case-data'
import { dataFilesStatus } from '@/lib/data/investigation-data'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { case_id?: string }
    if (!body.case_id) return NextResponse.json({ error: 'Missing required field: case_id' }, { status: 400 })
    const readiness = dataFilesStatus()
    if (readiness.status !== 'DATA_READY') return NextResponse.json({ error: 'DATA_INCOMPLETE', status: readiness.status, missing: readiness.files.filter((item) => !item.available).map((item) => item.file), directory: readiness.directory }, { status: 503 })
    const result = await runInvestigationAgent({ case_id: body.case_id })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Investigation failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ service: 'investigate', benchmark_cases: benchmarkCases.length, data: dataFilesStatus(), tigergraph: process.env.TIGERGRAPH_HOST && (process.env.TIGERGRAPH_GRAPH_NAME || process.env.TIGERGRAPH_GRAPH) ? 'configured' : 'not_configured' })
}

export const runtime = 'nodejs'
