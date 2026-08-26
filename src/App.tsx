import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Check, CircleDot, Gauge, LoaderCircle, LockKeyhole, Play, ShieldCheck } from 'lucide-react'
import { mandate } from './data'
import { runAgentEvaluation, validateMandate, type AgentEvaluationReport } from './agent-engine'
import { connectExternalAgent, type ReferenceAgentManifest } from './remote-agent'
import type { Mandate } from './domain'

type Phase = 'ready' | 'connecting' | 'running' | 'complete' | 'error'
type Tab = 'overview' | 'evaluate' | 'policy' | 'reports'
type StoredRun = { createdAt: string; endpoint: string; report: AgentEvaluationReport }
type StoredProduct = { mandate?: Mandate; endpoint?: string; runs?: StoredRun[] }

const STORAGE_KEY = 'canary-product-v2'
const phaseCopy: Record<Phase, string> = { ready: 'Ready', connecting: 'Verifying endpoint', running: 'Evaluating decisions', complete: 'Report ready', error: 'Evaluation stopped' }
const formatPct = (value: number) => `${Math.round(value * 100)}%`

function loadProduct(): StoredProduct {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredProduct } catch { return {} }
}

function App() {
  const [initialProduct] = useState(loadProduct)
  const [phase, setPhase] = useState<Phase>('ready')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [report, setReport] = useState<AgentEvaluationReport | null>(null)
  const [manifest, setManifest] = useState<ReferenceAgentManifest | null>(null)
  const [error, setError] = useState('')
  const [agentEndpoint, setAgentEndpoint] = useState(initialProduct.endpoint ?? '')
  const [draftMandate, setDraftMandate] = useState<Mandate>(initialProduct.mandate ?? mandate)
  const [activeMandate, setActiveMandate] = useState<Mandate>(initialProduct.mandate ?? mandate)
  const [mandateSaved, setMandateSaved] = useState(Boolean(initialProduct.mandate))
  const [mandateError, setMandateError] = useState('')
  const [runHistory, setRunHistory] = useState<StoredRun[]>(Array.isArray(initialProduct.runs) ? initialProduct.runs.slice(0, 8) : [])
  const runSequence = useRef(0)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mandate: mandateSaved ? activeMandate : undefined, endpoint: agentEndpoint, runs: runHistory }))
  }, [activeMandate, agentEndpoint, mandateSaved, runHistory])

  const evaluate = async () => {
    const sequence = runSequence.current + 1
    runSequence.current = sequence
    if (!mandateSaved) { setActiveTab('policy'); setMandateError('Save a policy before evaluating an agent.'); return }
    if (!agentEndpoint.trim()) { setActiveTab('evaluate'); setError('Enter the public HTTPS base URL for your agent.'); setPhase('error'); return }
    setActiveTab('evaluate'); setError(''); setReport(null); setManifest(null); setPhase('connecting')
    try {
      const connected = await connectExternalAgent(agentEndpoint)
      if (runSequence.current !== sequence) return
      setManifest(connected.manifest); setPhase('running')
      const nextReport = runAgentEvaluation(activeMandate, connected.agent)
      if (runSequence.current !== sequence) return
      const run = { createdAt: connected.evaluatedAt, endpoint: agentEndpoint.trim(), report: nextReport }
      setReport(nextReport); setRunHistory((current) => [run, ...current].slice(0, 8)); setPhase('complete')
    } catch (cause) {
      if (runSequence.current !== sequence) return
      setError(cause instanceof Error ? cause.message : 'Canary could not evaluate this agent.'); setPhase('error')
    }
  }

  const saveMandate = () => {
    const errors = validateMandate(draftMandate)
    if (errors.length) { setMandateError(errors[0]); return }
    setActiveMandate(draftMandate); setMandateSaved(true); setMandateError(''); setActiveTab('evaluate')
  }

  const updateMandate = (key: keyof Mandate, value: string) => {
    if (key === 'allowedProtocols') return
    const parsed = Number(value)
    setDraftMandate((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 })); setMandateError('')
  }
  const toggleProtocol = (protocol: string) => setDraftMandate((current) => ({ ...current, allowedProtocols: current.allowedProtocols.includes(protocol) ? current.allowedProtocols.filter((item) => item !== protocol) : [...current.allowedProtocols, protocol] }))
  const tabButton = (tab: Tab, label: string, index: string) => <button className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab}><span>{index}</span>{label}</button>

  return <div className={`app-shell phase-${phase}`}>
    <header className="topbar">
      <button className="brand" onClick={() => setActiveTab('overview')} aria-label="Canary overview"><span className="brand-signal"><img src="/canary-mark.svg" alt="" /></span><strong>CANARY</strong></button>
      <div className="top-status"><i /> {phaseCopy[phase]}</div><div className="edition">AGENT RISK REVIEW</div>
    </header>
    <nav className="tabs" role="tablist" aria-label="Canary workflows">
      {tabButton('overview', 'Overview', '01')}{tabButton('evaluate', 'Evaluate', '02')}{tabButton('policy', 'Policy', '03')}{tabButton('reports', 'Reports', '04')}
    </nav>

    <main>
      {activeTab === 'overview' && <section className="overview-screen" role="tabpanel">
        <div className="hero-copy"><h1>Know what<br />your agent<br /><em>will do.</em></h1><p>Connect a financial agent endpoint. Canary retrieves its live decisions, checks each one against your policy, and stores a report you can inspect later.</p><button className="hero-cta" onClick={() => setActiveTab('evaluate')}><span>Evaluate an agent</span><ArrowUpRight size={19} /></button></div>
        <div className="product-status-panel"><div className="stage-meta"><span>PRODUCT STATUS</span><span>NON-CUSTODIAL</span></div><div className="setup-list"><button onClick={() => setActiveTab('evaluate')}><span>{agentEndpoint.trim() ? <Check size={17} /> : '01'}</span><div><small>AGENT ENDPOINT</small><strong>{agentEndpoint.trim() ? 'Endpoint saved' : 'Connect your agent'}</strong></div><ArrowUpRight size={17} /></button><button onClick={() => setActiveTab('policy')}><span>{mandateSaved ? <Check size={17} /> : '02'}</span><div><small>RISK POLICY</small><strong>{mandateSaved ? 'Policy active' : 'Set operating limits'}</strong></div><ArrowUpRight size={17} /></button><button onClick={() => setActiveTab('reports')}><span>{runHistory.length ? <Check size={17} /> : '03'}</span><div><small>EVALUATION REPORTS</small><strong>{runHistory.length ? `${runHistory.length} saved locally` : 'No reports yet'}</strong></div><ArrowUpRight size={17} /></button></div><div className="product-boundary"><LockKeyhole size={17} /><p>Canary evaluates agent decisions. It does not connect wallets, hold keys, or execute transactions.</p></div></div>
      </section>}

      {activeTab === 'evaluate' && <section className="detail-screen" role="tabpanel"><div className="screen-heading"><div><span className="kicker">02 / EVALUATE</span><h2>Connect one agent.<br /><em>Check every decision.</em></h2></div><Gauge size={34} /></div><div className="evaluation-workspace">
        <article className="connector-card"><label htmlFor="agent-endpoint">PUBLIC AGENT BASE URL</label><input id="agent-endpoint" type="url" inputMode="url" autoComplete="url" placeholder="https://your-agent.example/api/canary" value={agentEndpoint} onChange={(event) => { setAgentEndpoint(event.target.value); setManifest(null); setReport(null); setPhase('ready'); setError('') }} /><p>Required endpoints: <code>GET /manifest</code> and <code>POST /decide</code>. Public HTTPS endpoints only; do not include credentials.</p>{manifest && <div className="manifest-card"><ShieldCheck size={18} /><div><small>VERIFIED MANIFEST</small><strong>{manifest.name}</strong><span>{manifest.strategy} · {manifest.id}</span></div></div>}{error && <div className="evaluation-error" role="alert"><AlertTriangle size={17} /><span>{error}</span></div>}<button className="console-action" onClick={evaluate} disabled={phase === 'connecting' || phase === 'running'}><span>{phase === 'connecting' ? 'Verifying endpoint' : phase === 'running' ? 'Checking decisions' : report ? 'Evaluate again' : 'Evaluate agent'}</span>{phase === 'connecting' || phase === 'running' ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}</button></article>
        <article className="result-card" aria-live="polite">{!report && <div className="empty-result"><CircleDot size={24} /><small>NO REPORT SELECTED</small><h3>Your evaluation results appear here.</h3><p>Canary requests six decisions from the connected agent and checks allocation, slippage, protocol, and modelled drawdown against your saved policy.</p></div>}{report && <><div className="result-heading"><div><small>REPORT / {report.reportId}</small><h3>{report.agent.name}</h3><span>{report.agent.strategy}</span></div><strong className={report.status === 'compliant' ? 'good' : 'warn'}>{report.status === 'compliant' ? 'COMPLIANT' : 'REVIEW REQUIRED'}</strong></div><div className="metric-row"><div><strong>{formatPct(report.summary.passRate)}</strong><small>policy pass</small></div><div><strong>{report.summary.blocked}</strong><small>blocked</small></div><div><strong>{report.summary.maxModelledDrawdownPct}%</strong><small>modelled max drawdown</small></div><div><strong>{report.summary.p95LatencyMs.toFixed(1)}ms</strong><small>p95 response</small></div></div><div className="decision-table"><div className="decision-head"><span>Scenario</span><span>Protocol</span><span>Allocation</span><span>Slippage</span><span>Result</span></div>{report.results.map((result) => <div className="decision-row" key={result.scenarioId}><span><strong>{result.scenarioLabel}</strong><small>{result.scenarioId}</small></span><span>{result.proposal.protocol}</span><span>{result.proposal.allocationPct}%</span><span>{result.proposal.maxSlippageBps} bps</span><span className={result.allowed ? 'good' : 'warn'}>{result.allowed ? 'PASS' : 'BLOCK'}{!result.allowed && <small>{result.violations.join(' · ')}</small>}</span></div>)}</div></>}</article>
      </div></section>}

      {activeTab === 'policy' && <section className="detail-screen" role="tabpanel"><div className="screen-heading"><div><span className="kicker">03 / POLICY</span><h2>Your limits.<br /><em>Applied consistently.</em></h2></div><LockKeyhole size={34} /></div><div className="mandate-grid"><article className="mandate-form wide"><div className="form-intro"><span>CONFIGURE EVALUATION POLICY</span><p>Each returned decision is checked against these limits. Modelled drawdown is scenario-derived, not live market performance.</p></div><div className="form-grid"><label>Portfolio reference<input type="number" min="1" max="10000000" value={draftMandate.capitalUsd} onChange={(event) => updateMandate('capitalUsd', event.target.value)} /><small>USD</small></label><label>Per-action value<input type="number" min="1" max="10000000" value={draftMandate.liveCapUsd} onChange={(event) => updateMandate('liveCapUsd', event.target.value)} /><small>USD</small></label><label>Max allocation<input type="number" min="1" max="100" value={draftMandate.maxAllocationPct} onChange={(event) => updateMandate('maxAllocationPct', event.target.value)} /><small>%</small></label><label>Max drawdown<input type="number" min="1" max="50" value={draftMandate.maxDrawdownPct} onChange={(event) => updateMandate('maxDrawdownPct', event.target.value)} /><small>%</small></label><label>Max slippage<input type="number" min="1" max="1000" value={draftMandate.maxSlippageBps} onChange={(event) => updateMandate('maxSlippageBps', event.target.value)} /><small>bps</small></label></div><fieldset><legend>Allowed protocols</legend>{['Aave', 'Morpho'].map((protocol) => <label className="check-row" key={protocol}><input type="checkbox" checked={draftMandate.allowedProtocols.includes(protocol)} onChange={() => toggleProtocol(protocol)} /><span>{protocol}</span></label>)}</fieldset>{mandateError && <p className="form-error" role="alert">{mandateError}</p>}<div className="form-footer"><span>{mandateSaved ? 'Policy saved in this browser' : 'Save before evaluation'}</span><button className="console-action" onClick={saveMandate}><span>{mandateSaved ? 'Update policy' : 'Save policy'}</span><Check size={17} /></button></div></article></div></section>}

      {activeTab === 'reports' && <section className="detail-screen" role="tabpanel"><div className="screen-heading"><div><span className="kicker">04 / REPORTS</span><h2>Past evaluations.<br /><em>Ready to inspect.</em></h2></div><Gauge size={34} /></div>{runHistory.length === 0 ? <div className="reports-empty"><CircleDot size={22} /><h3>No reports saved.</h3><p>Run an evaluation to create the first report in this browser.</p><button className="evidence-cta" onClick={() => setActiveTab('evaluate')}>Evaluate an agent <ArrowUpRight size={18} /></button></div> : <div className="run-history"><div className="history-heading"><span>LOCAL REPORT HISTORY</span><small>Stored in this browser</small></div>{runHistory.map((run) => <button key={`${run.createdAt}-${run.report.reportId}`} onClick={() => { setReport(run.report); setAgentEndpoint(run.endpoint); setPhase('complete'); setActiveTab('evaluate') }}><span><strong>{run.report.agent.name}</strong><small>{new Date(run.createdAt).toLocaleString()}</small></span><code>{run.report.reportId}</code><em className={run.report.status === 'compliant' ? 'good' : 'warn'}>{formatPct(run.report.summary.passRate)}</em></button>)}</div>}</section>}
    </main>
    <footer><span>CANARY / EXTERNAL AGENT EVALUATION</span><span>LIVE AGENT DECISIONS · MODELLED SCENARIOS · NON-CUSTODIAL</span></footer>
  </div>
}

export default App
