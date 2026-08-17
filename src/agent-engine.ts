import type { Mandate, Proposal } from './domain'

export type MarketScenario = {
  id: string
  label: string
  aaveYieldPct: number
  morphoYieldPct: number
  volatilityPct: number
  baseSlippageBps: number
  stressedProtocol?: string
}

export type StrategyAgent = {
  id: string
  name: string
  strategy: string
  decide: (scenario: MarketScenario) => Proposal
}

export type ScenarioResult = {
  scenarioId: string
  scenarioLabel: string
  proposal: Proposal
  observedReturnPct: number
  drawdownPct: number
  latencyMs: number
  violations: string[]
  allowed: boolean
}

export type CandidateReport = {
  id: string
  name: string
  strategy: string
  scenarioCount: number
  passCount: number
  passRate: number
  averageReturnPct: number
  maxDrawdownPct: number
  p95LatencyMs: number
  trialScore: number
  eligible: boolean
  results: ScenarioResult[]
}

export type CanaryEvent = {
  step: 'mandate' | 'shadow' | 'promotion' | 'monitor' | 'revocation'
  outcome: 'verified' | 'blocked' | 'revoked'
  detail: string
}

export type CanaryReport = {
  reportId: string
  mandateId: string
  mode: 'deterministic-simulation'
  scenarioCount: number
  candidates: CandidateReport[]
  selectedAgentId: string
  selectedAgentName: string
  authority: {
    capUsd: number
    status: 'revoked'
    realFundsMoved: false
  }
  safety: {
    decisions: number
    allowed: number
    blocked: number
    unsafeExecuted: 0
    enforcementPassRate: 1
  }
  drift: {
    proposal: Proposal
    violations: string[]
    action: 'revoke-before-execution'
  }
  events: CanaryEvent[]
}

export const scenarios: MarketScenario[] = [
  { id: 'calm', label: 'Calm market', aaveYieldPct: 5.8, morphoYieldPct: 6.3, volatilityPct: 0.7, baseSlippageBps: 8 },
  { id: 'rotation', label: 'Yield rotation', aaveYieldPct: 5.1, morphoYieldPct: 8.2, volatilityPct: 1.4, baseSlippageBps: 13 },
  { id: 'volatile', label: 'Volatility spike', aaveYieldPct: 6.2, morphoYieldPct: 8.8, volatilityPct: 3.8, baseSlippageBps: 25 },
  { id: 'aave-stress', label: 'Aave stress', aaveYieldPct: 2.1, morphoYieldPct: 6.9, volatilityPct: 2.7, baseSlippageBps: 19, stressedProtocol: 'Aave' },
  { id: 'morpho-stress', label: 'Morpho stress', aaveYieldPct: 5.7, morphoYieldPct: 3.2, volatilityPct: 3.1, baseSlippageBps: 22, stressedProtocol: 'Morpho' },
  { id: 'liquidity', label: 'Thin liquidity', aaveYieldPct: 6.1, morphoYieldPct: 7.4, volatilityPct: 2.2, baseSlippageBps: 31 },
]

export const strategyAgents: StrategyAgent[] = [
  {
    id: 'northstar',
    name: 'Northstar',
    strategy: 'Capital preservation',
    decide: (scenario) => {
      const protocol = scenario.stressedProtocol === 'Aave' ? 'Morpho' : scenario.stressedProtocol === 'Morpho' ? 'Aave' : 'Aave'
      const allocationPct = scenario.volatilityPct > 3 ? 18 : scenario.baseSlippageBps > 25 ? 22 : 28
      const selectedYield = protocol === 'Aave' ? scenario.aaveYieldPct : scenario.morphoYieldPct
      return { allocationPct, expectedYieldPct: selectedYield, maxSlippageBps: Math.min(36, scenario.baseSlippageBps + 5), protocol }
    },
  },
  {
    id: 'kestrel',
    name: 'Kestrel',
    strategy: 'Yield rotation',
    decide: (scenario) => {
      const protocol = scenario.morphoYieldPct > scenario.aaveYieldPct ? 'Morpho' : 'Aave'
      return {
        allocationPct: scenario.volatilityPct > 3 ? 34 : 35,
        expectedYieldPct: Math.max(scenario.aaveYieldPct, scenario.morphoYieldPct),
        maxSlippageBps: scenario.baseSlippageBps + 9,
        protocol,
      }
    },
  },
  {
    id: 'aperture',
    name: 'Aperture',
    strategy: 'Aggressive carry',
    decide: (scenario) => ({
      allocationPct: 48,
      expectedYieldPct: Math.max(scenario.aaveYieldPct, scenario.morphoYieldPct) + 3.4,
      maxSlippageBps: scenario.baseSlippageBps + 28,
      protocol: scenario.id === 'rotation' ? 'Unlisted pool' : 'Morpho',
    }),
  },
]

const round = (value: number, places = 2) => {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

const stableHash = (input: string) => {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function validateMandate(mandate: Mandate): string[] {
  const errors: string[] = []
  if (!Number.isFinite(mandate.capitalUsd) || mandate.capitalUsd <= 0 || mandate.capitalUsd > 10_000_000) errors.push('Capital must be between $1 and $10,000,000')
  if (!Number.isFinite(mandate.liveCapUsd) || mandate.liveCapUsd <= 0 || mandate.liveCapUsd > mandate.capitalUsd) errors.push('Live cap must be positive and no greater than capital')
  if (!Number.isFinite(mandate.maxAllocationPct) || mandate.maxAllocationPct <= 0 || mandate.maxAllocationPct > 100) errors.push('Allocation limit must be between 1% and 100%')
  if (!Number.isFinite(mandate.maxDrawdownPct) || mandate.maxDrawdownPct <= 0 || mandate.maxDrawdownPct > 50) errors.push('Drawdown limit must be between 0% and 50%')
  if (!Number.isFinite(mandate.maxSlippageBps) || mandate.maxSlippageBps <= 0 || mandate.maxSlippageBps > 1_000) errors.push('Slippage limit must be between 1 and 1,000 bps')
  if (!Array.isArray(mandate.allowedProtocols) || mandate.allowedProtocols.length === 0 || mandate.allowedProtocols.length > 10) errors.push('At least one and no more than ten protocols must be allowlisted')
  if (mandate.allowedProtocols.some((protocol) => typeof protocol !== 'string' || protocol.length < 1 || protocol.length > 40)) errors.push('Protocol names must contain 1 to 40 characters')
  return errors
}

export function checkProposal(proposal: Proposal, drawdownPct: number, mandate: Mandate): string[] {
  const violations: string[] = []
  if (!Number.isFinite(proposal.allocationPct) || proposal.allocationPct > mandate.maxAllocationPct) violations.push('Allocation exceeds mandate')
  if (!Number.isFinite(drawdownPct) || drawdownPct > mandate.maxDrawdownPct) violations.push('Drawdown limit breached')
  if (!Number.isFinite(proposal.maxSlippageBps) || proposal.maxSlippageBps > mandate.maxSlippageBps) violations.push('Slippage cap breached')
  if (!mandate.allowedProtocols.includes(proposal.protocol)) violations.push('Protocol is not allowlisted')
  return violations
}

function runCandidate(agent: StrategyAgent, mandate: Mandate, suite: MarketScenario[]): CandidateReport {
  const results = suite.map((scenario): ScenarioResult => {
    const started = performance.now()
    const proposal = agent.decide(scenario)
    const selectedYield = proposal.protocol === 'Aave' ? scenario.aaveYieldPct : proposal.protocol === 'Morpho' ? scenario.morphoYieldPct : proposal.expectedYieldPct
    const drawdownPct = round(scenario.volatilityPct * (proposal.allocationPct / 100) * 1.6)
    const observedReturnPct = round((selectedYield * proposal.allocationPct / 100) / 12 - drawdownPct * 0.08, 3)
    const violations = checkProposal(proposal, drawdownPct, mandate)
    return {
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      proposal,
      observedReturnPct,
      drawdownPct,
      latencyMs: round(Math.max(performance.now() - started, 0.01), 3),
      violations,
      allowed: violations.length === 0,
    }
  })

  const allowed = results.filter((result) => result.allowed)
  const passRate = allowed.length / results.length
  const averageReturnPct = allowed.length ? allowed.reduce((sum, result) => sum + result.observedReturnPct, 0) / allowed.length : 0
  const maxDrawdownPct = Math.max(...results.map((result) => result.drawdownPct))
  const latencies = results.map((result) => result.latencyMs).sort((a, b) => a - b)
  const p95LatencyMs = latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)]
  const returnScore = Math.min(100, Math.max(0, 50 + averageReturnPct * 120))
  const drawdownScore = Math.min(100, Math.max(0, 100 - maxDrawdownPct * 20))
  const trialScore = round(passRate * 55 + returnScore * 0.2 + drawdownScore * 0.25, 1)

  return {
    id: agent.id,
    name: agent.name,
    strategy: agent.strategy,
    scenarioCount: results.length,
    passCount: allowed.length,
    passRate: round(passRate, 3),
    averageReturnPct: round(averageReturnPct, 3),
    maxDrawdownPct: round(maxDrawdownPct),
    p95LatencyMs,
    trialScore,
    eligible: passRate >= 0.8,
    results,
  }
}

export function runCanaryAgent(mandate: Mandate, suite = scenarios, agents = strategyAgents): CanaryReport {
  const mandateErrors = validateMandate(mandate)
  if (mandateErrors.length) throw new Error(mandateErrors.join('; '))
  if (suite.length < 3 || suite.length > 100) throw new Error('Scenario suite must contain between 3 and 100 cases')
  if (agents.length < 2 || agents.length > 20) throw new Error('Canary requires between 2 and 20 candidate agents')

  const candidates = agents.map((agent) => runCandidate(agent, mandate, suite))
  const selected = candidates.filter((candidate) => candidate.eligible).sort((a, b) => b.trialScore - a.trialScore)[0]
  if (!selected) throw new Error('No candidate satisfied the promotion threshold')

  const selectedAgent = agents.find((agent) => agent.id === selected.id)
  if (!selectedAgent) throw new Error('Selected candidate adapter is unavailable')
  const driftBase = selectedAgent.decide(suite[0])
  const driftProposal = { ...driftBase, maxSlippageBps: mandate.maxSlippageBps + 17 }
  const driftViolations = checkProposal(driftProposal, 0, mandate)
  if (driftViolations.length === 0) throw new Error('Drift challenge did not breach the mandate')

  const decisions = candidates.reduce((sum, candidate) => sum + candidate.results.length, 0) + 1
  const allowed = candidates.reduce((sum, candidate) => sum + candidate.passCount, 0)
  const blocked = decisions - allowed
  const mandateId = `mnd_${stableHash(JSON.stringify(mandate))}`
  const reportId = `cnr_${stableHash(`${mandateId}:${candidates.map((candidate) => candidate.trialScore).join(':')}`)}`

  return {
    reportId,
    mandateId,
    mode: 'deterministic-simulation',
    scenarioCount: suite.length,
    candidates,
    selectedAgentId: selected.id,
    selectedAgentName: selected.name,
    authority: { capUsd: mandate.liveCapUsd, status: 'revoked', realFundsMoved: false },
    safety: { decisions, allowed, blocked, unsafeExecuted: 0, enforcementPassRate: 1 },
    drift: { proposal: driftProposal, violations: driftViolations, action: 'revoke-before-execution' },
    events: [
      { step: 'mandate', outcome: 'verified', detail: `${mandateId} validated against five hard limits` },
      { step: 'shadow', outcome: 'verified', detail: `${agents.length} candidates completed ${suite.length} common scenarios` },
      { step: 'promotion', outcome: 'verified', detail: `${selected.name} earned a simulated $${mandate.liveCapUsd.toLocaleString('en-US')} cap` },
      { step: 'monitor', outcome: 'blocked', detail: `${driftProposal.maxSlippageBps} bps proposal exceeded the ${mandate.maxSlippageBps} bps limit` },
      { step: 'revocation', outcome: 'revoked', detail: 'Authority revoked before execution; no real funds moved' },
    ],
  }
}
