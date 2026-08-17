export type AgentStatus = 'candidate' | 'shadowed' | 'authorized' | 'revoked'

export type Proposal = {
  allocationPct: number
  expectedYieldPct: number
  maxSlippageBps: number
  protocol: string
}

export type Candidate = {
  id: string
  name: string
  storeScore: number
  strategy: string
  observedReturnPct: number
  drawdownPct: number
  policyPassRate: number
  proposal: Proposal
}

export type Mandate = {
  capitalUsd: number
  liveCapUsd: number
  maxAllocationPct: number
  maxDrawdownPct: number
  maxSlippageBps: number
  allowedProtocols: string[]
}

export type Evaluation = Candidate & {
  trialScore: number
  violations: string[]
  eligible: boolean
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export function evaluateCandidate(candidate: Candidate, mandate: Mandate): Evaluation {
  const violations: string[] = []
  if (candidate.proposal.allocationPct > mandate.maxAllocationPct) violations.push('Allocation exceeds mandate')
  if (candidate.drawdownPct > mandate.maxDrawdownPct) violations.push('Drawdown limit breached')
  if (candidate.proposal.maxSlippageBps > mandate.maxSlippageBps) violations.push('Slippage cap breached')
  if (!mandate.allowedProtocols.includes(candidate.proposal.protocol)) violations.push('Protocol is not allowlisted')

  const returnScore = clamp(50 + candidate.observedReturnPct * 12)
  const drawdownScore = clamp(100 - candidate.drawdownPct * 10)
  const score = returnScore * 0.3 + drawdownScore * 0.25 + candidate.policyPassRate * 0.3 + candidate.storeScore * 0.15

  return {
    ...candidate,
    trialScore: Math.round((score - violations.length * 25) * 10) / 10,
    violations,
    eligible: violations.length === 0,
  }
}

export function selectPromotion(evaluations: Evaluation[]): Evaluation | null {
  return evaluations
    .filter((candidate) => candidate.eligible)
    .sort((a, b) => b.trialScore - a.trialScore)[0] ?? null
}

export function authorizeProposal(evaluation: Evaluation, mandate: Mandate): { allowed: boolean; reason: string } {
  const checked = evaluateCandidate(evaluation, mandate)
  if (!checked.eligible) return { allowed: false, reason: checked.violations[0] }
  if (mandate.liveCapUsd > mandate.capitalUsd) return { allowed: false, reason: 'Live cap exceeds available capital' }
  return { allowed: true, reason: `Authorized up to $${mandate.liveCapUsd.toLocaleString('en-US')}` }
}
