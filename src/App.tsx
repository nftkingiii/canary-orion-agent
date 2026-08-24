import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Ban, Check, CircleDot, Gauge, LoaderCircle, LockKeyhole, Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { mandate } from './data'
import { runCanaryAgent, strategyAgents, validateMandate, type CanaryReport, type StrategyAgent } from './agent-engine'
import { buildCandidateRoster, connectExternalAgent, connectReferenceAgent, type ReferenceAgentManifest } from './remote-agent'
import type { Mandate } from './domain'

type Phase = 'ready' | 'connecting' | 'running' | 'shadowed' | 'promoted' | 'revoked' | 'error'
type Tab = 'overview' | 'trial' | 'mandate' | 'evidence'
const formatUsd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))
const phaseCopy: Record<Phase, string> = { ready: 'Awaiting trial', connecting: 'Verifying agent', running: 'Challenging agents', shadowed: 'Candidate selected', promoted: 'Authority live', revoked: 'Threat contained', error: 'Failed closed' }
const STORAGE_KEY = 'canary-product-v1'
type StoredRun = { createdAt: string; endpoint: string; agentName: string; report: CanaryReport }
type StoredProduct = { mandate?: Mandate; endpoint?: string; runs?: StoredRun[] }

function loadProduct(): StoredProduct {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredProduct } catch { return {} }
}

function Score({ value }: { value: number }) {
  return <div className="score" aria-label={`Trial score ${value} out of 100`}><strong>{value.toFixed(1)}</strong><span><i style={{ width: `${Math.max(0, value)}%` }} /></span></div>
}

function App() {
  const [initialProduct] = useState(loadProduct)
  const [phase, setPhase] = useState<Phase>('ready')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [report, setReport] = useState<CanaryReport | null>(null)
  const [error, setError] = useState('')
  const [draftMandate, setDraftMandate] = useState<Mandate>(initialProduct.mandate ?? mandate)
  const [activeMandate, setActiveMandate] = useState<Mandate>(initialProduct.mandate ?? mandate)
  const [mandateSaved, setMandateSaved] = useState(Boolean(initialProduct.mandate))
  const [mandateError, setMandateError] = useState('')
  const [referenceManifest, setReferenceManifest] = useState<ReferenceAgentManifest | null>(null)
  const [trialAgents, setTrialAgents] = useState<StrategyAgent[]>(strategyAgents)
  const [agentEndpoint, setAgentEndpoint] = useState(initialProduct.endpoint ?? '')
  const [runHistory, setRunHistory] = useState<StoredRun[]>(Array.isArray(initialProduct.runs) ? initialProduct.runs.slice(0, 8) : [])
  const runSequence = useRef(0)
  const isEvaluated = report !== null && !['ready', 'running', 'error'].includes(phase)
  const selected = report?.candidates.find((candidate) => candidate.id === report.selectedAgentId)
  const externalPreview: StrategyAgent = { id: 'external-pending', name: 'External agent', strategy: 'Awaiting verified manifest', decide: () => { throw new Error('External agent is not connected') } }
  const displayedAgents = !referenceManifest && agentEndpoint.trim() ? [externalPreview, ...strategyAgents] : buildCandidateRoster(referenceManifest, trialAgents, strategyAgents)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ mandate: mandateSaved ? activeMandate : undefined, endpoint: agentEndpoint, runs: runHistory }))
  }, [activeMandate, agentEndpoint, mandateSaved, runHistory])

  const start = async () => {
    const sequence = runSequence.current + 1
    runSequence.current = sequence
    if (!mandateSaved) { setActiveTab('mandate'); setMandateError('Save this mandate before starting a probation run.'); return }
    setActiveTab('trial'); setError(''); setReport(null); setPhase('connecting')
    try {
      const external = Boolean(agentEndpoint.trim())
      const connected = external ? await connectExternalAgent(agentEndpoint) : await connectReferenceAgent()
      if (runSequence.current !== sequence) return
      const candidates = [connected.agent, ...strategyAgents]
      setReferenceManifest(connected.manifest); setTrialAgents(candidates); setPhase('running')
      await delay(500)
      const nextReport = runCanaryAgent(activeMandate, undefined, candidates)
      if (runSequence.current !== sequence) return
      const createdAt = 'evaluatedAt' in connected && typeof connected.evaluatedAt === 'string' ? connected.evaluatedAt : new Date().toISOString()
      setReport(nextReport); setRunHistory((current) => [{ createdAt, endpoint: external ? agentEndpoint.trim() : 'Canary reference agent', agentName: connected.manifest.name, report: nextReport }, ...current].slice(0, 8)); setPhase('shadowed')
      await delay(900)
      if (runSequence.current !== sequence) return
      setPhase('promoted')
      await delay(1100)
      if (runSequence.current !== sequence) return
      setPhase('revoked')
    } catch (cause) {
      if (runSequence.current !== sequence) return
      setError(cause instanceof Error ? cause.message : 'Canary could not complete the trial'); setPhase('error')
    }
  }

  const reset = () => { runSequence.current += 1; setReport(null); setError(''); setPhase('ready') }
  const saveMandate = () => {
    const errors = validateMandate(draftMandate)
    if (errors.length) { setMandateError(errors[0]); return }
    setActiveMandate(draftMandate); setMandateSaved(true); setMandateError(''); setActiveTab('trial')
  }
  const updateMandate = (key: keyof Mandate, value: string) => {
    if (key === 'allowedProtocols') return
    const parsed = Number(value)
    setDraftMandate((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }))
    setMandateError('')
  }
  const toggleProtocol = (protocol: string) => setDraftMandate((current) => ({ ...current, allowedProtocols: current.allowedProtocols.includes(protocol) ? current.allowedProtocols.filter((item) => item !== protocol) : [...current.allowedProtocols, protocol] }))
  const tabButton = (tab: Tab, label: string, index: string) => <button className={activeTab === tab ? 'tab active' : 'tab'} onClick={() => setActiveTab(tab)} role="tab" aria-selected={activeTab === tab}><span>{index}</span>{label}</button>

  return (
    <div className={`app-shell phase-${phase}`}>
      <header className="topbar">
        <button className="brand" onClick={() => setActiveTab('overview')} aria-label="Canary overview"><span className="brand-signal"><img src="/canary-mark.svg" alt="" /></span><strong>CANARY</strong></button>
        <div className="top-status"><i /> {phaseCopy[phase]}</div><div className="edition">ORION / 2026</div>
      </header>
      <nav className="tabs" role="tablist" aria-label="Canary workflows">
        {tabButton('overview', 'Overview', '01')}{tabButton('trial', 'Live trial', '02')}{tabButton('mandate', 'Mandate', '03')}{tabButton('evidence', 'Evidence', '04')}
      </nav>

      <main>
        {activeTab === 'overview' && <section className="overview-screen" role="tabpanel">
          <div className="hero-copy">
            <div className="eyebrow"><span>Autonomous agent evaluation</span><span>External / Inspectable</span></div>
            <h1>Authority<br />must be<br /><em>earned.</em></h1>
            <p>Connect an external financial agent. Canary verifies its contract, challenges every decision against your mandate, and preserves an inspectable evaluation record.</p>
            <button className="hero-cta" onClick={start}><span>{phase === 'ready' && !mandateSaved ? 'Configure your mandate' : phase === 'ready' ? 'Run the autonomous trial' : 'Run the trial again'}</span><ArrowUpRight size={19} /></button>
          </div>
          <div className="authority-stage" aria-live="polite">
            <div className="stage-meta"><span>EVALUATION CORE</span><span>STATE / {phase.toUpperCase()}</span></div>
            <div className="core-wrap"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="core-grid" /><div className="core"><span className="core-value">{phase === 'promoted' ? '$1K' : phase === 'revoked' ? 'OFF' : '00'}</span><small>{phase === 'revoked' ? 'revoked' : phase === 'promoted' ? 'live cap' : phase === 'running' ? 'scanning' : 'authority'}</small></div><span className="coordinate c-one">CAP / 1,000</span><span className="coordinate c-two">SLIP / 40 BPS</span><span className="coordinate c-three">MODE / SIM</span></div>
            <div className="stage-bottom"><div><strong>{formatUsd(activeMandate.capitalUsd)}</strong><span>capital protected</span></div><div><strong>{displayedAgents.length}</strong><span>{referenceManifest ? 'candidates checked' : 'candidate pool'}</span></div><div><strong>{report?.safety.unsafeExecuted ?? 0}</strong><span>unsafe executions</span></div></div>
          </div>
          <div className="principle-strip"><span>01 / CHALLENGE</span><i /><span>02 / PROMOTE</span><i /><span>03 / MONITOR</span><i /><span>04 / REVOKE</span></div>
        </section>}

        {activeTab === 'trial' && <section className="trial-screen" role="tabpanel">
          <div className="screen-heading"><div><span className="kicker">02 / PROBATION</span><h2>One endpoint. Three fixtures.<br /><em>One earns authority.</em></h2></div><button className="reset-button" onClick={reset} disabled={phase === 'ready'}><RotateCcw size={15} /> Reset</button></div>
          <div className="trial-layout">
            <div className="candidate-stack"><div className="source-banner"><span>{referenceManifest ? 'AGENT CONTRACT VERIFIED' : agentEndpoint.trim() ? 'EXTERNAL AGENT READY TO VERIFY' : 'REFERENCE AGENT READY TO VERIFY'}</span><small>{referenceManifest ? `${referenceManifest.name} answered six bounded requests. Its live endpoint competed against three clearly labeled baseline fixtures.` : agentEndpoint.trim() ? 'Canary will verify the remote manifest and six live decisions before scoring anything.' : 'Enter your own endpoint below, or run Harbor as the built-in reference implementation.'}</small></div>{displayedAgents.map((agent, index) => {
              const result = report?.candidates.find((candidate) => candidate.id === agent.id); const isSelected = result?.id === report?.selectedAgentId; const isReference = index === 0
              const pendingLabel = phase === 'connecting' && isReference ? 'VERIFYING' : phase === 'running' ? 'RUNNING' : 'QUEUED'
              const stateLabel = phase === 'connecting' && isReference ? 'HANDSHAKE' : phase === 'running' ? 'TESTING' : isReference && !referenceManifest ? 'UNVERIFIED' : 'WAITING'
              return <article className={`candidate ${isReference ? 'reference' : ''} ${result && !result.eligible ? 'failed' : ''} ${isSelected && isEvaluated ? 'selected' : ''}`} key={agent.id}>
                <div className="candidate-index">{String(index + 1).padStart(2, '0')}</div><div className="candidate-name"><h3>{agent.name}</h3><span>{agent.strategy} · {index === 0 ? agentEndpoint.trim() ? 'external HTTPS agent' : 'network reference API' : 'local baseline fixture'}</span></div>
                <div className="candidate-measure"><small>Policy pass</small><strong>{result ? `${Math.round(result.passRate * 100)}%` : '—'}</strong></div><div className="candidate-measure"><small>Drawdown</small><strong>{result ? `${result.maxDrawdownPct}%` : '—'}</strong></div>
                <div>{result && isEvaluated ? <Score value={result.trialScore} /> : <span className="pending">{['connecting', 'running'].includes(phase) && <LoaderCircle className="spin" size={14} />}{pendingLabel}</span>}</div>
                <div className="candidate-state">{!isEvaluated && <span>{stateLabel}</span>}{isEvaluated && result && !result.eligible && <span className="danger-text">BLOCKED</span>}{isEvaluated && result?.eligible && !isSelected && <span>PASSED</span>}{isSelected && phase === 'shadowed' && <span>SELECTED</span>}{isSelected && phase === 'promoted' && <span>AUTHORIZED</span>}{isSelected && phase === 'revoked' && <span className="danger-text">REVOKED</span>}</div>
              </article>
            })}<div className="agent-intake"><label htmlFor="agent-endpoint">AGENT BASE URL <span>OPTIONAL</span></label><div><input id="agent-endpoint" type="url" inputMode="url" placeholder="https://your-agent.example/api/canary" value={agentEndpoint} onChange={(event) => { setAgentEndpoint(event.target.value); setReferenceManifest(null); setTrialAgents(strategyAgents); setReport(null); setPhase('ready'); setError('') }} /><button type="button" onClick={() => setAgentEndpoint('')}>Use Harbor</button></div><p>Canary calls <code>/manifest</code> and <code>/decide</code>. HTTPS only; credentials, redirects, private networks, custom ports, and oversized responses are rejected.</p></div></div>
            <aside className="run-console"><div className="console-top"><span>CANARY / BOUNDED ADAPTER</span><CircleDot size={15} /></div><div className={`mini-core state-${phase}`}><span>{phase === 'revoked' ? <Ban size={30} /> : phase === 'promoted' ? <ShieldCheck size={30} /> : ['running', 'connecting'].includes(phase) ? <LoaderCircle className="spin" size={30} /> : <LockKeyhole size={30} />}</span></div>
              <div className="console-message" role="status">{phase === 'ready' && <><span>{mandateSaved ? 'READY' : 'SETUP REQUIRED'}</span><h3>{mandateSaved ? agentEndpoint.trim() ? 'Evaluate your external agent.' : 'Run the reference agent.' : 'Define the mandate first.'}</h3><p>{mandateSaved ? 'Canary verifies a manifest, requests six live decisions, then checks every proposal against your mandate.' : 'Your evaluation boundary is not active until you review and save it.'}</p></>}{phase === 'connecting' && <><span>HANDSHAKE / {agentEndpoint.trim() ? 'EXTERNAL HTTPS' : 'SAME ORIGIN'}</span><h3>Verifying manifest and contract.</h3><p>No probation begins unless every bounded response validates.</p></>}{phase === 'running' && <><span>RUNNING / 06 SCENARIOS</span><h3>Checking live agent decisions.</h3><p>Every proposal is intercepted before it can count as safe.</p></>}{phase === 'shadowed' && selected && <><span>TRIAL COMPLETE</span><h3>{selected.name} ranks first.</h3><p>{selected.trialScore.toFixed(1)} score with a {Math.round(selected.passRate * 100)}% policy pass rate.</p></>}{phase === 'promoted' && <><span>SIMULATED AUTHORITY</span><h3>{formatUsd(activeMandate.liveCapUsd)} evaluation cap applied.</h3><p>The connected agent remains non-custodial and cannot move funds through Canary.</p></>}{phase === 'revoked' && <><span>THREAT CONTAINED</span><h3>Proposed authority revoked.</h3><p>{report?.drift.proposal.maxSlippageBps} bps breached the {activeMandate.maxSlippageBps} bps limit. The report was preserved locally.</p></>}{phase === 'error' && <><span>FAILED CLOSED</span><h3>The trial stopped safely.</h3><p>{error}</p></>}</div>
              <button className="console-action" onClick={start} disabled={['running', 'connecting'].includes(phase)}><span>{['running', 'connecting'].includes(phase) ? 'Trial in progress' : phase === 'ready' && !mandateSaved ? 'Configure mandate' : phase === 'ready' ? 'Begin autonomous run' : 'Run again'}</span>{['running', 'connecting'].includes(phase) ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}</button>
            </aside>
          </div>
        </section>}

        {activeTab === 'mandate' && <section className="detail-screen" role="tabpanel">
          <div className="screen-heading"><div><span className="kicker">03 / MANDATE</span><h2>Hard limits.<br /><em>No exceptions.</em></h2></div><LockKeyhole size={34} /></div>
          <div className="mandate-grid"><article className="mandate-form wide"><div className="form-intro"><span>CONFIGURE YOUR POLICY</span><p>These limits become the authority boundary for every candidate proposal. Canary validates them before any trial starts.</p></div><div className="form-grid"><label>Capital under watch<input type="number" min="1" max="10000000" value={draftMandate.capitalUsd} onChange={(event) => updateMandate('capitalUsd', event.target.value)} /><small>USD</small></label><label>Live authority cap<input type="number" min="1" max="10000000" value={draftMandate.liveCapUsd} onChange={(event) => updateMandate('liveCapUsd', event.target.value)} /><small>USD</small></label><label>Max allocation<input type="number" min="1" max="100" value={draftMandate.maxAllocationPct} onChange={(event) => updateMandate('maxAllocationPct', event.target.value)} /><small>%</small></label><label>Max drawdown<input type="number" min="1" max="50" value={draftMandate.maxDrawdownPct} onChange={(event) => updateMandate('maxDrawdownPct', event.target.value)} /><small>%</small></label><label>Max slippage<input type="number" min="1" max="1000" value={draftMandate.maxSlippageBps} onChange={(event) => updateMandate('maxSlippageBps', event.target.value)} /><small>bps</small></label></div><fieldset><legend>Allowed venues</legend>{['Aave', 'Morpho'].map((protocol) => <label className="check-row" key={protocol}><input type="checkbox" checked={draftMandate.allowedProtocols.includes(protocol)} onChange={() => toggleProtocol(protocol)} /><span>{protocol}</span></label>)}</fieldset>{mandateError && <p className="form-error" role="alert">{mandateError}</p>}<div className="form-footer"><span>{mandateSaved ? 'Saved for this browser session' : 'Session-only configuration · no wallet connected'}</span><button className="console-action" onClick={saveMandate}><span>{mandateSaved ? 'Update mandate' : 'Save mandate'}</span><Check size={17} /></button></div></article></div>
        </section>}

        {activeTab === 'evidence' && <section className="detail-screen" role="tabpanel">
          <div className="screen-heading"><div><span className="kicker">04 / EVIDENCE</span><h2>Every decision<br /><em>leaves a trace.</em></h2></div><Gauge size={34} /></div>
          <div className="evidence-layout"><div className="evidence-summary"><span>REPORT ID</span><code>{report?.reportId ?? 'RUN TRIAL TO GENERATE'}</code><div><strong>{report?.safety.decisions ?? 19}</strong><small>policy decisions</small></div><div><strong>{report?.safety.blocked ?? 0}</strong><small>blocked decisions</small></div><div><strong>{report ? `${Math.round(report.safety.enforcementPassRate * 100)}%` : '—'}</strong><small>enforcement pass</small></div></div>
            <ol className="evidence-rail">{(report?.events ?? [{ step: 'mandate', detail: 'Five hard limits queued' }, { step: 'shadow', detail: 'Six common scenarios queued' }, { step: 'promotion', detail: 'No authority granted' }, { step: 'monitor', detail: 'Monitoring not started' }, { step: 'revocation', detail: 'No revocation required' }]).map((event, index) => { const complete = Boolean(report); const danger = complete && index > 2; return <li className={danger ? 'danger' : complete ? 'complete' : ''} key={event.step}><span>{complete ? danger ? <Ban size={15} /> : <Check size={15} /> : `0${index + 1}`}</span><div><small>{event.step.toUpperCase()}</small><strong>{event.detail}</strong></div></li> })}</ol>
          </div>{!report && <button className="evidence-cta" onClick={start}>Generate live evidence <ArrowUpRight size={18} /></button>}{runHistory.length > 0 && <div className="run-history"><div className="history-heading"><span>LOCAL RUN HISTORY</span><small>Stored in this browser</small></div>{runHistory.map((run) => <button key={`${run.createdAt}-${run.report.reportId}`} onClick={() => { setReport(run.report); setPhase('revoked') }}><span><strong>{run.agentName}</strong><small>{new Date(run.createdAt).toLocaleString()}</small></span><code>{run.report.reportId}</code><em>{run.report.candidates.find((candidate) => candidate.id === run.report.selectedAgentId)?.trialScore.toFixed(1) ?? '—'}</em></button>)}</div>}
        </section>}
      </main>
      <footer><span>CANARY / EXTERNAL AGENT EVALUATION</span><span>LIVE AGENT INPUT · SIMULATED MARKET · NON-CUSTODIAL</span></footer>
    </div>
  )
}
export default App
