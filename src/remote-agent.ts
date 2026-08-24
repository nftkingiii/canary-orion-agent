import type { Proposal } from './domain'
import { scenarios, type MarketScenario, type StrategyAgent } from './agent-engine'

export type ReferenceAgentManifest = { id: string; name: string; strategy: string; adapter: 'http-reference/v1' | 'canary-agent/v1'; provenance: string; capabilities: string[] }
const REQUEST_TIMEOUT_MS = 3_000

export const referenceAgentPreview: StrategyAgent = {
  id: 'harbor-reference',
  name: 'Harbor',
  strategy: 'Risk-aware yield routing',
  decide: () => { throw new Error('Harbor must complete its HTTP handshake before evaluation') },
}

export const buildCandidateRoster = (manifest: ReferenceAgentManifest | null, connectedAgents: StrategyAgent[], fixtures: StrategyAgent[]) => manifest ? connectedAgents : [referenceAgentPreview, ...fixtures]

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isNumberInRange = (value: unknown, minimum: number, maximum: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum

function parseManifest(value: unknown): ReferenceAgentManifest {
  if (!isObject(value) || typeof value.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(value.id) || typeof value.name !== 'string' || value.name.length > 80 || typeof value.strategy !== 'string' || value.strategy.length > 120 || !['http-reference/v1', 'canary-agent/v1'].includes(String(value.adapter)) || typeof value.provenance !== 'string' || !Array.isArray(value.capabilities) || !value.capabilities.includes('decide')) throw new Error('Agent manifest was rejected')
  return { id: value.id, name: value.name, strategy: value.strategy, adapter: value.adapter as ReferenceAgentManifest['adapter'], provenance: value.provenance, capabilities: value.capabilities.filter((item): item is string => typeof item === 'string') }
}

function parseProposal(value: unknown): Proposal {
  if (!isObject(value) || !isNumberInRange(value.allocationPct, 0, 100) || !isNumberInRange(value.expectedYieldPct, 0, 100) || !isNumberInRange(value.maxSlippageBps, 0, 1_000) || typeof value.protocol !== 'string' || !['Aave', 'Morpho'].includes(value.protocol)) throw new Error('Reference agent decision was rejected')
  return { allocationPct: value.allocationPct, expectedYieldPct: value.expectedYieldPct, maxSlippageBps: value.maxSlippageBps, protocol: value.protocol }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(path, { ...init, credentials: 'same-origin', signal: controller.signal })
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: unknown } | null
      throw new Error(typeof body?.error === 'string' ? body.error : 'Agent is unavailable')
    }
    return await response.json()
  } catch (cause) { throw new Error(cause instanceof Error ? cause.message : 'Agent is unavailable; no probation run started.', { cause }) } finally { window.clearTimeout(timeout) }
}

export async function connectReferenceAgent(): Promise<{ manifest: ReferenceAgentManifest; agent: StrategyAgent }> {
  const manifest = parseManifest(await request('/api/agents/reference/manifest'))
  const decisions = await Promise.all(scenarios.map(async (scenario) => {
    const response = await request('/api/agents/reference/decide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) })
    if (!isObject(response) || response.agentId !== manifest.id) throw new Error('Reference agent decision was rejected')
    return [scenario.id, parseProposal(response.proposal)] as const
  }))
  const proposalByScenario = new Map(decisions)
  return { manifest, agent: { id: manifest.id, name: manifest.name, strategy: manifest.strategy, decide: (scenario: MarketScenario) => {
    const proposal = proposalByScenario.get(scenario.id)
    if (!proposal) throw new Error('Reference agent did not provide a decision for this scenario')
    return proposal
  } } }
}

export async function connectExternalAgent(endpoint: string): Promise<{ manifest: ReferenceAgentManifest; agent: StrategyAgent; evaluatedAt: string }> {
  const value = await request('/api/agents/external/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: endpoint.trim() }) })
  if (!isObject(value) || !Array.isArray(value.decisions) || typeof value.evaluatedAt !== 'string') throw new Error('External evaluation response was rejected')
  const manifest = parseManifest(value.manifest)
  const decisionRows = value.decisions.map((decision) => {
    if (!isObject(decision) || typeof decision.scenarioId !== 'string') throw new Error('External agent decision was rejected')
    return [decision.scenarioId, parseProposal(decision.proposal)] as const
  })
  if (decisionRows.length !== scenarios.length || new Set(decisionRows.map(([id]) => id)).size !== scenarios.length) throw new Error('External agent did not answer the complete trial suite')
  const proposalByScenario = new Map(decisionRows)
  return { manifest, evaluatedAt: value.evaluatedAt, agent: { id: manifest.id, name: manifest.name, strategy: manifest.strategy, decide: (scenario: MarketScenario) => {
    const proposal = proposalByScenario.get(scenario.id)
    if (!proposal) throw new Error('External agent did not provide a decision for this scenario')
    return proposal
  } } }
}
