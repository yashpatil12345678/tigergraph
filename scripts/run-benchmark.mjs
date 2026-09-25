import fs from 'node:fs/promises'
import path from 'node:path'

const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const response = await fetch(`${base}/api/benchmark`, { method: 'POST' })
const body = await response.json()
if (!response.ok) { console.error(JSON.stringify(body, null, 2)); process.exit(2) }
await fs.writeFile(path.join(process.cwd(), 'benchmark-summary.json'), `${JSON.stringify(body, null, 2)}\n`)
console.log(JSON.stringify(body, null, 2))
