import { useRef, useState } from 'react'
import { Activity, ArrowUpRight, Ban, Check, CircleDot, Gauge, LoaderCircle, LockKeyhole, Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { mandate } from './data'
import { runCanaryAgent, strategyAgents, validateMandate, type CanaryReport } from './agent-engine'
import type { Mandate } from './domain'

type Phase = 'ready' | 'running' | 'shadowed' | 'promoted' | 'revoked' | 'error'
type Tab = 'overview' | 'trial' | 'mandate' | 'evidence'
const formatUsd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))
const phaseCopy: Record<Phase, string> = { ready: 'Awaiting trial', running: 'Challenging agents', shadowed: 'Candidate selected', promoted: 'Authority live', revoked: 'Threat contained', error: 'Failed closed' }

function Score({ value }: { value: number }) {
  return <div className="score" aria-label={`Trial score ${value} out of 100`}><strong>{value.toFixed(1)}</strong><span><i style={{ width: `${Math.max(0, value)}%` }} /></span></div>
}

function App() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [report, setReport] = useState<CanaryReport | null>(null)
  const [error, setError] = useState('')
  const [draftMandate, setDraftMandate] = useState<Mandate>(mandate)
  const [activeMandate, setActiveMandate] = useState<Mandate>(mandate)
  const [mandateSaved, setMandateSaved] = useState(false)
  const [mandateError, setMandateError] = useState('')
  const runSequence = useRef(0)
  const isEvaluated = report !== null && !['ready', 'running', 'error'].includes(phase)
  const selected = report?.candidates.find((candidate) => candidate.id === report.selectedAgentId)

  const start = async () => {
    const sequence = runSequence.current + 1
    runSequence.current = sequence
    if (!mandateSaved) { setActiveTab('mandate'); setMandateError('Save this mandate before starting a probation run.'); return }
    setActiveTab('trial'); setError(''); setReport(null); setPhase('running')
    try {
      await delay(500)
      const nextReport = runCanaryAgent(activeMandate)
      if (runSequence.current !== sequence) return
      setReport(nextReport); setPhase('shadowed')
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
        <button className="brand" onClick={() => setActiveTab('overview')} aria-label="Canary overview"><span className="brand-signal"><Activity size={19} /></span><strong>CANARY</strong></button>
        <div className="top-status"><i /> {phaseCopy[phase]}</div><div className="edition">ORION / 2026</div>
      </header>
      <nav className="tabs" role="tablist" aria-label="Canary workflows">
        {tabButton('overview', 'Overview', '01')}{tabButton('trial', 'Live trial', '02')}{tabButton('mandate', 'Mandate', '03')}{tabButton('evidence', 'Evidence', '04')}
      </nav>

      <main>
        {activeTab === 'overview' && <section className="overview-screen" role="tabpanel">
          <div className="hero-copy">
            <div className="eyebrow"><span>Autonomous risk governance</span><span>Deterministic / Inspectable</span></div>
            <h1>Authority<br />must be<br /><em>earned.</em></h1>
            <p>Canary puts financial agents through the same hostile trial, grants the safest performer bounded authority, then revokes it the instant behavior drifts.</p>
            <button className="hero-cta" onClick={start}><span>{phase === 'ready' && !mandateSaved ? 'Configure your mandate' : phase === 'ready' ? 'Run the autonomous trial' : 'Run the trial again'}</span><ArrowUpRight size={19} /></button>
          </div>
          <div className="authority-stage" aria-live="polite">
            <div className="stage-meta"><span>AUTHORITY CORE</span><span>STATE / {phase.toUpperCase()}</span></div>
            <div className="core-wrap"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="core-grid" /><div className="core"><span className="core-value">{phase === 'promoted' ? '$1K' : phase === 'revoked' ? 'OFF' : '00'}</span><small>{phase === 'revoked' ? 'revoked' : phase === 'promoted' ? 'live cap' : phase === 'running' ? 'scanning' : 'authority'}</small></div><span className="coordinate c-one">CAP / 1,000</span><span className="coordinate c-two">SLIP / 40 BPS</span><span className="coordinate c-three">MODE / SIM</span></div>
            <div className="stage-bottom"><div><strong>{formatUsd(activeMandate.capitalUsd)}</strong><span>capital protected</span></div><div><strong>{strategyAgents.length}</strong><span>simulation adapters</span></div><div><strong>{report?.safety.unsafeExecuted ?? 0}</strong><span>unsafe executions</span></div></div>
          </div>
          <div className="principle-strip"><span>01 / CHALLENGE</span><i /><span>02 / PROMOTE</span><i /><span>03 / MONITOR</span><i /><span>04 / REVOKE</span></div>
        </section>}

        {activeTab === 'trial' && <section className="trial-screen" role="tabpanel">
          <div className="screen-heading"><div><span className="kicker">02 / PROBATION</span><h2>Three adapters enter.<br /><em>One earns authority.</em></h2></div><button className="reset-button" onClick={reset} disabled={phase === 'ready'}><RotateCcw size={15} /> Reset</button></div>
          <div className="trial-layout">
            <div className="candidate-stack"><div className="source-banner"><span>BUILT-IN SIMULATION ADAPTERS</span><small>These deterministic fixtures are not fetched from Orion or an external agent store.</small></div>{strategyAgents.map((agent, index) => {
              const result = report?.candidates.find((candidate) => candidate.id === agent.id); const isSelected = result?.id === report?.selectedAgentId
              return <article className={`candidate ${result && !result.eligible ? 'failed' : ''} ${isSelected && isEvaluated ? 'selected' : ''}`} key={agent.id}>
                <div className="candidate-index">0{index + 1}</div><div className="candidate-name"><h3>{agent.name}</h3><span>{agent.strategy} · local adapter</span></div>
                <div className="candidate-measure"><small>Policy pass</small><strong>{result ? `${Math.round(result.passRate * 100)}%` : '—'}</strong></div><div className="candidate-measure"><small>Drawdown</small><strong>{result ? `${result.maxDrawdownPct}%` : '—'}</strong></div>
                <div>{result && isEvaluated ? <Score value={result.trialScore} /> : <span className="pending">{phase === 'running' ? <><LoaderCircle className="spin" size={14} /> RUNNING</> : 'QUEUED'}</span>}</div>
                <div className="candidate-state">{!isEvaluated && <span>{phase === 'running' ? 'TESTING' : 'WAITING'}</span>}{isEvaluated && result && !result.eligible && <span className="danger-text">BLOCKED</span>}{isEvaluated && result?.eligible && !isSelected && <span>PASSED</span>}{isSelected && phase === 'shadowed' && <span>SELECTED</span>}{isSelected && phase === 'promoted' && <span>AUTHORIZED</span>}{isSelected && phase === 'revoked' && <span className="danger-text">REVOKED</span>}</div>
              </article>
            })}<div className="intake-note"><span>LIVE CANDIDATE INTAKE</span><p>Connect a registered agent endpoint here once the adapter contract is verified. No external calls are made in this build.</p><button onClick={() => setActiveTab('evidence')}>View current evidence <ArrowUpRight size={14} /></button></div></div>
            <aside className="run-console"><div className="console-top"><span>CANARY / SIMULATION ADAPTERS</span><CircleDot size={15} /></div><div className={`mini-core state-${phase}`}><span>{phase === 'revoked' ? <Ban size={30} /> : phase === 'promoted' ? <ShieldCheck size={30} /> : phase === 'running' ? <LoaderCircle className="spin" size={30} /> : <LockKeyhole size={30} />}</span></div>
              <div className="console-message" role="status">{phase === 'ready' && <><span>{mandateSaved ? 'READY' : 'SETUP REQUIRED'}</span><h3>{mandateSaved ? 'Challenge every candidate.' : 'Define the mandate first.'}</h3><p>{mandateSaved ? 'Six common market conditions. Five hard limits. No manual intervention after launch.' : 'Your capital boundary is not active until you review and save it.'}</p></>}{phase === 'running' && <><span>RUNNING / 06 SCENARIOS</span><h3>Generating and checking decisions.</h3><p>Every proposal is intercepted before it can count as safe.</p></>}{phase === 'shadowed' && selected && <><span>TRIAL COMPLETE</span><h3>{selected.name} ranks first.</h3><p>{selected.trialScore.toFixed(1)} score with a {Math.round(selected.passRate * 100)}% policy pass rate.</p></>}{phase === 'promoted' && <><span>AUTHORITY GRANTED</span><h3>{formatUsd(activeMandate.liveCapUsd)} simulated cap is live.</h3><p>Continuous policy monitoring has started.</p></>}{phase === 'revoked' && <><span>THREAT CONTAINED</span><h3>Authority revoked before execution.</h3><p>{report?.drift.proposal.maxSlippageBps} bps breached the {activeMandate.maxSlippageBps} bps limit. No funds moved.</p></>}{phase === 'error' && <><span>FAILED CLOSED</span><h3>The trial stopped safely.</h3><p>{error}</p></>}</div>
              <button className="console-action" onClick={start} disabled={phase === 'running'}><span>{phase === 'running' ? 'Trial in progress' : phase === 'ready' && !mandateSaved ? 'Configure mandate' : phase === 'ready' ? 'Begin autonomous run' : 'Run again'}</span>{phase === 'running' ? <LoaderCircle className="spin" size={17} /> : <Play size={17} />}</button>
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
          </div>{!report && <button className="evidence-cta" onClick={start}>Generate live evidence <ArrowUpRight size={18} /></button>}
        </section>}
      </main>
      <footer><span>CANARY / AUTONOMOUS RISK GOVERNANCE</span><span>SIMULATION ONLY · NO WALLET · NO REAL FUNDS</span></footer>
    </div>
  )
}
export default App
