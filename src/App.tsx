import { useRef, useState } from 'react'
import { Activity, Ban, Check, CircleDollarSign, Gauge, LoaderCircle, LockKeyhole, Play, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { mandate } from './data'
import { runCanaryAgent, strategyAgents, type CanaryReport } from './agent-engine'

type Phase = 'ready' | 'running' | 'shadowed' | 'promoted' | 'revoked' | 'error'
const formatUsd = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const delay = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function Score({ value }: { value: number }) {
  return <div className="score" aria-label={`Trial score ${value} out of 100`}><span>{value.toFixed(1)}</span><div><i style={{ width: `${Math.max(0, value)}%` }} /></div></div>
}

function App() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [report, setReport] = useState<CanaryReport | null>(null)
  const [error, setError] = useState('')
  const runSequence = useRef(0)
  const isEvaluated = report !== null && !['ready', 'running', 'error'].includes(phase)
  const isAuthorized = phase === 'promoted'
  const isRevoked = phase === 'revoked'
  const selected = report?.candidates.find((candidate) => candidate.id === report.selectedAgentId)

  const start = async () => {
    const sequence = runSequence.current + 1
    runSequence.current = sequence
    setError('')
    setReport(null)
    setPhase('running')
    try {
      await delay(350)
      const nextReport = runCanaryAgent(mandate)
      if (runSequence.current !== sequence) return
      setReport(nextReport)
      setPhase('shadowed')
      await delay(800)
      if (runSequence.current !== sequence) return
      setPhase('promoted')
      await delay(900)
      if (runSequence.current !== sequence) return
      setPhase('revoked')
    } catch (cause) {
      if (runSequence.current !== sequence) return
      setError(cause instanceof Error ? cause.message : 'Canary could not complete the trial')
      setPhase('error')
    }
  }

  const reset = () => {
    runSequence.current += 1
    setReport(null)
    setError('')
    setPhase('ready')
  }

  const phaseLabel = phase === 'ready' ? 'Ready' : phase === 'running' ? 'Running suite' : phase === 'shadowed' ? 'Trial complete' : phase === 'promoted' ? 'Monitoring' : phase === 'revoked' ? 'Contained' : 'Run failed'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Canary home"><span className="brand-mark"><Activity size={18} /></span><span>Canary</span></a>
        <nav aria-label="Product navigation"><a className="active" href="#trial">Agent run</a><a href="#mandate">Mandate</a><a href="#evidence">Evidence</a></nav>
        <div className={`mode ${phase === 'running' ? 'running' : ''}`}><span /> {phaseLabel}</div>
      </header>

      <main id="top">
        <section className="hero">
          <div><h1>Authority must be earned.</h1><p>Canary autonomously challenges financial agents, promotes the safest performer under a capped mandate, and revokes authority before unsafe execution.</p></div>
          <div className={`authority-card ${isRevoked ? 'danger' : isAuthorized ? 'success' : ''}`} aria-live="polite">
            <div className="authority-icon">{phase === 'running' ? <LoaderCircle className="spin" size={22} /> : isRevoked ? <Ban size={22} /> : isAuthorized ? <ShieldCheck size={22} /> : <LockKeyhole size={22} />}</div>
            <div><span>Simulated authority</span><strong>{isRevoked ? 'Revoked' : isAuthorized ? formatUsd(mandate.liveCapUsd) : formatUsd(0)}</strong></div>
            <small>{isRevoked ? '57 bps drift contained' : isAuthorized ? 'Capped · monitoring active' : phase === 'running' ? 'Evaluating candidates' : 'No authority granted'}</small>
          </div>
        </section>

        <section className="metric-row" aria-label="Agent run overview">
          <article><span>Capital protected</span><strong>{formatUsd(mandate.capitalUsd)}</strong><small>Simulation · no funds moved</small></article>
          <article><span>Candidate strategies</span><strong>{strategyAgents.length}</strong><small>Executable adapters</small></article>
          <article><span>Held-out scenarios</span><strong>{report?.scenarioCount ?? 6}</strong><small>Same conditions for every candidate</small></article>
          <article><span>Unsafe executions</span><strong>{report?.safety.unsafeExecuted ?? 0}</strong><small>{report ? `${report.safety.blocked} decisions blocked` : 'Fail-closed policy'}</small></article>
        </section>

        <div className="workspace">
          <section className="panel trial-panel" id="trial">
            <div className="panel-heading"><div><span className="section-label">Autonomous run</span><h2>One mandate. One common trial.</h2></div><button className="text-button" onClick={reset} disabled={phase === 'ready'}><RotateCcw size={15} /> Reset</button></div>
            <div className="agent-table" role="table" aria-label="Candidate agent results">
              <div className="agent-row table-head" role="row"><span>Agent</span><span>Trial coverage</span><span>Observed</span><span>Trial score</span><span>Status</span></div>
              {strategyAgents.map((agent) => {
                const result = report?.candidates.find((candidate) => candidate.id === agent.id)
                const isSelected = result?.id === report?.selectedAgentId
                return (
                  <div className={`agent-row ${result && !result.eligible ? 'failed' : ''} ${isSelected && isEvaluated ? 'selected' : ''}`} role="row" key={agent.id}>
                    <div className="agent-name"><span className="agent-avatar">{agent.name.slice(0, 1)}</span><div><strong>{agent.name}</strong><small>{agent.strategy}</small></div></div>
                    <div><strong>{result ? `${result.passCount} / ${result.scenarioCount} safe` : '6 scenarios'}</strong><small>{result ? `${Math.round(result.passRate * 100)}% policy pass rate` : 'Awaiting autonomous run'}</small></div>
                    <div><strong>{result ? `${result.averageReturnPct >= 0 ? '+' : ''}${result.averageReturnPct}% avg` : 'Pending'}</strong><small>{result ? `${result.maxDrawdownPct}% max drawdown` : 'No observation'}</small></div>
                    <div>{result && isEvaluated ? <Score value={result.trialScore} /> : phase === 'running' ? <span className="running-copy"><LoaderCircle className="spin" size={13} /> Running</span> : <span className="muted">Pending</span>}</div>
                    <div>
                      {!isEvaluated && <span className="status neutral">{phase === 'running' ? 'Testing' : 'Queued'}</span>}
                      {isEvaluated && result && !result.eligible && <span className="status blocked">Blocked</span>}
                      {isEvaluated && result?.eligible && !isSelected && <span className="status passed">Passed</span>}
                      {isEvaluated && isSelected && phase === 'shadowed' && <span className="status leading">Selected</span>}
                      {isSelected && isAuthorized && <span className="status authorized">Authorized</span>}
                      {isSelected && isRevoked && <span className="status blocked">Revoked</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            {phase === 'ready' && <div className="action-strip"><div><Play size={20} /><span><strong>Start Canary</strong><small>Canary will complete the trial, promotion, monitoring challenge, and safety response without further input.</small></span></div><button className="primary" onClick={start}>Run autonomous agent <Play size={15} /></button></div>}
            {phase === 'running' && <div className="action-strip active-run" role="status"><div><LoaderCircle className="spin" size={20} /><span><strong>Executing the scenario suite</strong><small>Candidate decisions are being generated and checked against the same five hard limits.</small></span></div><button className="secondary" onClick={reset}>Cancel run</button></div>}
            {phase === 'shadowed' && selected && <div className="action-strip recommendation" role="status"><div><Check size={20} /><span><strong>{selected.name} earned first authority</strong><small>{Math.round(selected.passRate * 100)}% policy pass rate across {selected.scenarioCount} scenarios. Canary is granting a simulated {formatUsd(mandate.liveCapUsd)} cap.</small></span></div><span className="auto-step">Continuing automatically</span></div>}
            {phase === 'promoted' && <div className="action-strip warning" role="status"><div><TriangleAlert size={20} /><span><strong>Monitoring detected behavior drift</strong><small>A new {report?.drift.proposal.maxSlippageBps} bps proposal is being checked against the {mandate.maxSlippageBps} bps mandate.</small></span></div><span className="auto-step">Policy decision pending</span></div>}
            {phase === 'revoked' && <div className="action-strip stopped" role="status"><div><Ban size={20} /><span><strong>Authority revoked before execution</strong><small>{report?.drift.violations.join(', ')}. All {formatUsd(mandate.capitalUsd)} remained in simulation.</small></span></div><button className="secondary" onClick={start}>Run again</button></div>}
            {phase === 'error' && <div className="action-strip stopped" role="alert"><div><TriangleAlert size={20} /><span><strong>Canary failed closed</strong><small>{error}</small></span></div><button className="secondary" onClick={start}>Retry</button></div>}
          </section>

          <aside className="side-stack">
            <section className="panel mandate-panel" id="mandate">
              <div className="panel-heading compact"><div><span className="section-label">Active mandate</span><h2>Treasury preservation</h2></div><LockKeyhole size={18} /></div>
              <dl><div><dt>Simulated capital cap</dt><dd>{formatUsd(mandate.liveCapUsd)}</dd></div><div><dt>Max allocation</dt><dd>{mandate.maxAllocationPct}%</dd></div><div><dt>Max drawdown</dt><dd>{mandate.maxDrawdownPct}%</dd></div><div><dt>Max slippage</dt><dd>{mandate.maxSlippageBps} bps</dd></div><div><dt>Allowed protocols</dt><dd>Aave, Morpho</dd></div></dl>
              <p className="helper">This build executes deterministic simulations only. It cannot sign transactions or move funds.</p>
            </section>

            <section className="panel evidence-panel" id="evidence">
              <div className="panel-heading compact"><div><span className="section-label">Decision report</span><h2>Inspectable agent work</h2></div><Gauge size={18} /></div>
              <ol className="timeline">
                {(report?.events ?? [
                  { step: 'mandate', outcome: 'verified', detail: 'Waiting for autonomous run' },
                  { step: 'shadow', outcome: 'verified', detail: 'Six common scenarios queued' },
                  { step: 'promotion', outcome: 'verified', detail: 'No authority granted' },
                  { step: 'monitor', outcome: 'blocked', detail: 'Monitoring not started' },
                  { step: 'revocation', outcome: 'revoked', detail: 'No revocation required' },
                ]).map((event, index) => {
                  const completed = Boolean(report) && (phase === 'revoked' || index < (phase === 'shadowed' ? 2 : phase === 'promoted' ? 4 : 0))
                  const isBlocked = completed && ['blocked', 'revoked'].includes(event.outcome)
                  return <li className={isBlocked ? 'blocked-step' : completed ? 'done' : ''} key={event.step}><span>{completed ? isBlocked ? <Ban size={12} /> : <Check size={12} /> : index + 1}</span><div><strong>{event.step[0].toUpperCase() + event.step.slice(1)}</strong><small>{completed ? event.detail : index === 0 ? event.detail : 'Pending'}</small></div></li>
                })}
              </ol>
              {report && <div className="report-id"><span>Report</span><code>{report.reportId}</code></div>}
            </section>
          </aside>
        </div>

        <section className="explanation"><div><CircleDollarSign size={20} /><span><strong>Executable candidates.</strong><small>Each strategy generates proposals from the same market scenarios.</small></span></div><div><Activity size={20} /><span><strong>Measured agent behavior.</strong><small>Pass rate, drawdown, returns, latency, and blocked decisions are recorded.</small></span></div><div><ShieldCheck size={20} /><span><strong>Deterministic containment.</strong><small>Policy code—not model output—controls promotion and revocation.</small></span></div></section>
      </main>
      <footer><span>Canary autonomous risk-governance agent</span><span>Deterministic simulation · no wallet connection · no real funds</span></footer>
    </div>
  )
}

export default App
