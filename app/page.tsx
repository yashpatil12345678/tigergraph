'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, CircleDot, Clock3, FileText, GitBranch, Menu, Play, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type CaseRow = { id: string; subject: string; signal: string; amount: string; score: number; status: 'Investigating' | 'Approval required' | 'Closed'; time: string }

const cases: CaseRow[] = [
  { id: 'HHG-017', subject: 'CUST-008421 · CARD-1042', signal: 'Shared device cluster', amount: '$1,842.60', score: 0.91, status: 'Approval required', time: '2 min ago' },
  { id: 'HHG-004', subject: 'CUST-002118 · CARD-0918', signal: 'Card testing burst', amount: '$186.40', score: 0.87, status: 'Investigating', time: '18 min ago' },
  { id: 'HHG-012', subject: 'CUST-004507 · CARD-2201', signal: 'New device / CNP', amount: '$428.00', score: 0.74, status: 'Investigating', time: '41 min ago' },
  { id: 'HHG-009', subject: 'CUST-001992 · CARD-0674', signal: 'Out-of-region activity', amount: '$96.18', score: 0.38, status: 'Closed', time: '1 hr ago' },
]

const evidence = [
  { type: 'GRAPH', label: 'Device shared across 4 cards in a 17-minute window', ref: 'TG · find_shared_devices', tone: 'red' },
  { type: 'BEHAVIOR', label: '6 low-value online authorizations followed by one high-value attempt', ref: 'TXN · burst_3005419–3005425', tone: 'amber' },
  { type: 'HISTORY', label: '2 similar closed cases escalated to report filing', ref: 'CASE · HHG-2025-0841, HHG-2025-0917', tone: 'violet' },
  { type: 'POLICY', label: 'R6 shared origin applies; monitor connected cards', ref: 'POLICY · fraud-policy.md#R6', tone: 'blue' },
]

function ScoreRing({ score }: { score: number }) {
  return <div className="score-ring" style={{ '--score': `${score * 100}%` } as React.CSSProperties}><span>{Math.round(score * 100)}</span></div>
}

function StatusBadge({ status }: { status: CaseRow['status'] }) {
  return <Badge variant="outline" className={cn('status-badge', status === 'Approval required' && 'status-amber', status === 'Investigating' && 'status-blue', status === 'Closed' && 'status-green')}><span className="status-dot" />{status}</Badge>
}

export default function Page() {
  const [selected, setSelected] = useState('HHG-017')
  const [mobileNav, setMobileNav] = useState(false)
  const [tab, setTab] = useState('Overview')
  const [running, setRunning] = useState(false)
  const activeCase = useMemo(() => cases.find((item) => item.id === selected) ?? cases[0], [selected])

  return <div className="app-shell">
    <aside className={cn('sidebar', mobileNav && 'sidebar-open')}>
      <div className="brand"><div className="brand-mark"><ShieldAlert /></div><div><strong>ARGUS</strong><span>Fraud Intelligence</span></div><button className="sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-stack" aria-label="Primary navigation">
        {['Overview', 'Investigations', 'Case memory', 'Benchmarks'].map((item, index) => <button key={item} className={cn('nav-item', tab === item && 'nav-item-active')} onClick={() => { setTab(item); setMobileNav(false) }}>{index === 0 ? <CircleDot /> : index === 1 ? <ShieldAlert /> : index === 2 ? <GitBranch /> : <FileText />}<span>{item}</span>{item === 'Investigations' && <span className="nav-count">4</span>}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="system-card"><div className="system-header"><span className="live-dot" />All systems operational</div><p>TigerGraph connected<br />Agent runtime healthy</p><div className="system-meta"><span>Latency</span><strong>184ms</strong></div></div>
      <div className="profile"><div className="avatar">AR</div><div><strong>Analyst workspace</strong><span>Tier 2 reviewer</span></div><ChevronDown /></div>
    </aside>
    {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main className="main-content">
      <header className="topbar"><div className="topbar-left"><button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button><div><div className="eyebrow">OPERATIONS / {tab.toUpperCase()}</div><h1>{tab === 'Overview' ? 'Investigation command center' : tab}</h1></div></div><div className="topbar-actions"><div className="search-box"><Search /><input placeholder="Search cases, entities, transactions" aria-label="Search" /></div><Button variant="outline" size="sm" onClick={() => { setRunning(true); setTimeout(() => setRunning(false), 900) }}><Play data-icon="inline-start" />{running ? 'Running…' : 'Run benchmark'}</Button><div className="avatar avatar-small">JD</div></div></header>
      <div className="content-wrap">
        <section className="metric-grid"><Metric label="Open investigations" value="24" delta="+6 today" icon={<ShieldAlert />} tone="red" /><Metric label="Pending approvals" value="07" delta="3 high exposure" icon={<Clock3 />} tone="amber" /><Metric label="Cases closed today" value="18" delta="92% within SLA" icon={<CheckCircle2 />} tone="green" /><Metric label="Benchmark pass rate" value="94.2%" delta="20 / 20 executed" icon={<Sparkles />} tone="violet" /></section>
        <section className="workspace-grid">
          <Card className="case-list-card"><CardHeader className="section-header"><div><CardTitle>Active investigations</CardTitle><CardDescription>Signals ranked by decision urgency</CardDescription></div><Button variant="ghost" size="icon" aria-label="Filter cases"><SlidersHorizontal /></Button></CardHeader><CardContent className="case-list-content"><div className="case-filters"><button className="filter-active">All <span>24</span></button><button>Needs review <span>7</span></button><button>High exposure</button></div>{cases.map((item) => <button key={item.id} className={cn('case-row', item.id === selected && 'case-row-selected')} onClick={() => setSelected(item.id)}><div className="case-row-top"><span className="case-id">{item.id}</span><StatusBadge status={item.status} /></div><strong>{item.subject}</strong><div className="case-row-bottom"><span>{item.signal}</span><span>{item.amount}</span></div><div className="case-row-footer"><span>{item.time}</span><span className="mini-score"><i style={{ width: `${item.score * 100}%` }} />{Math.round(item.score * 100)}% assessed</span></div></button>)}</CardContent></Card>
          <div className="detail-column"><Card className="detail-card"><CardHeader className="detail-header"><div><div className="case-heading"><span className="case-id">{activeCase.id}</span><StatusBadge status={activeCase.status} /></div><CardTitle>Shared origin investigation</CardTitle><CardDescription>Triggered by graph risk signal · {activeCase.time}</CardDescription></div><Button variant="outline" size="sm">Open case <ArrowUpRight data-icon="inline-end" /></Button></CardHeader><CardContent><div className="entity-strip"><Entity label="Customer" value="CUST-008421" /><Entity label="Card" value="CARD-1042" /><Entity label="Flagged transaction" value="TXN-3005419" /><Entity label="Channel" value="Online" /></div><div className="assessment"><div><div className="eyebrow">AGENT ASSESSMENT</div><h3>Coordinated activity likely</h3><p>Multiple independent signals indicate a shared-origin pattern. The agent found a device relationship across four cards and a matching authorization burst.</p><div className="assessment-tags"><Badge className="tag-red">R6 · Shared origin</Badge><Badge className="tag-amber">Human approval required</Badge></div></div><ScoreRing score={activeCase.score} /></div><Separator /><div className="detail-tabs">{['Overview', 'Evidence', 'Graph', 'Timeline'].map((item) => <button key={item} className={cn(tab === item && 'detail-tab-active')} onClick={() => setTab(item)}>{item}</button>)}</div><div className="evidence-list">{evidence.map((item) => <div className="evidence-item" key={item.label}><div className={cn('evidence-icon', `evidence-${item.tone}`)}>{item.type === 'GRAPH' ? <GitBranch /> : item.type === 'BEHAVIOR' ? <AlertTriangle /> : item.type === 'HISTORY' ? <FileText /> : <ShieldCheck />}</div><div><div className="evidence-type">{item.type}</div><strong>{item.label}</strong><span>{item.ref}</span></div><CheckCircle2 className="evidence-check" /></div>)}</div></CardContent></Card>
            <div className="bottom-grid"><Card><CardHeader><CardTitle>Next-best action</CardTitle><CardDescription>Policy-aware recommendation</CardDescription></CardHeader><CardContent><div className="action-main"><div className="action-icon"><ShieldAlert /></div><div><div className="eyebrow">INITIAL → FINAL</div><h3>File report & monitor connected cards</h3><p>R6 applies. Report filing is L2 approval; monitoring may execute automatically.</p></div></div><div className="action-meta"><span><b>Route</b><Badge variant="outline" className="status-amber">L2 approval</Badge></span><span><b>Exposure</b><strong>$1,842.60</strong></span></div><Button className="full-button">Review approval request <ArrowUpRight data-icon="inline-end" /></Button></CardContent></Card><Card><CardHeader><CardTitle>Investigation timeline</CardTitle><CardDescription>Auditable agent activity</CardDescription></CardHeader><CardContent><Timeline /></CardContent></Card></div>
          </div>
        </section>
        <div className="footer-note"><span><span className="live-dot" />Live investigation workspace</span><span>Last graph sync 14 seconds ago</span><span>Build 0.8.4 · deterministic mode</span></div>
      </div>
    </main>
  </div>
}

function Metric({ label, value, delta, icon, tone }: { label: string; value: string; delta: string; icon: React.ReactNode; tone: string }) { return <Card className="metric-card"><CardContent><div className={cn('metric-icon', `metric-${tone}`)}>{icon}</div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{delta}</small></div></CardContent></Card> }
function Entity({ label, value }: { label: string; value: string }) { return <div className="entity"><span>{label}</span><strong>{value}</strong></div> }
function Timeline() { return <div className="timeline"><div><span className="timeline-dot done" /><div><strong>Graph expansion complete</strong><span>4 cards · 2 devices · 16 transactions</span><small>14:32:08</small></div></div><div><span className="timeline-dot done" /><div><strong>Historical cases retrieved</strong><span>2 relevant matches found</span><small>14:32:11</small></div></div><div><span className="timeline-dot active" /><div><strong>Awaiting L2 approval</strong><span>FILE_REPORT · BLOCK_CARD</span><small>14:32:14</small></div></div></div> }
