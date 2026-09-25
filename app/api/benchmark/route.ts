import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { benchmarkCases } from '@/lib/fraud/case-data'
import { runInvestigationAgent } from '@/lib/fraud/agent'
import { dataFilesStatus } from '@/lib/data/investigation-data'

export const runtime = 'nodejs'

export async function POST() {
  const readiness = dataFilesStatus()
  if (readiness.status !== 'DATA_READY') return NextResponse.json({ status: 'DATA_INCOMPLETE', missing: readiness.files.filter((item) => !item.available).map((item) => item.file), directory: readiness.directory }, { status: 503 })
  const started = Date.now()
  const outputDir = path.join(process.cwd(), 'cases')
  await fs.mkdir(outputDir, { recursive: true })
  const results = []
  for (const benchmarkCase of benchmarkCases) {
    const caseStarted = Date.now()
    try {
      const result = await runInvestigationAgent({ case_id: benchmarkCase.case_id })
      const output = {
        case_id: benchmarkCase.case_id,
        case: result.case,
        evidence_requests: result.evidence_requests,
        next_best_actions: { ...result.next_best_actions, pattern: result.case.pattern },
        sar: result.sar,
        stop_reason: result.stop_reason,
        tool_calls: result.tool_calls,
        tokens: result.tokens ?? 0,
        latency_s: Number(((Date.now() - caseStarted) / 1000).toFixed(3)),
      }
      await fs.writeFile(path.join(outputDir, `${benchmarkCase.case_id}.json`), `${JSON.stringify(output, null, 2)}\n`, 'utf8')
      results.push({ case_id: benchmarkCase.case_id, status: 'success', latency_s: output.latency_s, written_to_graph: output.case.written_to_graph })
    } catch (error) {
      results.push({ case_id: benchmarkCase.case_id, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
  return NextResponse.json({ total: benchmarkCases.length, elapsed_s: Number(((Date.now() - started) / 1000).toFixed(3)), results })
}

export async function GET() {
  return NextResponse.json({ cases: benchmarkCases.map(({ case_id }) => case_id), output_directory: 'cases/' })
}
