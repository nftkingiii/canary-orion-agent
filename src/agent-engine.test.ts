import { describe, expect, it } from 'vitest'
import { mandate } from './data'
import { runAgentEvaluation, runCanaryAgent, scenarios, strategyAgents, validateMandate } from './agent-engine'

describe('Canary autonomous agent', () => {
  it('runs the complete suite and promotes the safest eligible candidate', () => {
    const report = runCanaryAgent(mandate)
    expect(report.scenarioCount).toBe(6)
    expect(report.selectedAgentName).toBe('Northstar')
    expect(report.candidates.find((candidate) => candidate.name === 'Northstar')?.passRate).toBe(1)
  })

  it('never executes a proposal that violates the mandate', () => {
    const report = runCanaryAgent(mandate)
    expect(report.safety.unsafeExecuted).toBe(0)
    expect(report.safety.enforcementPassRate).toBe(1)
    expect(report.candidates.flatMap((candidate) => candidate.results).filter((result) => !result.allowed).length).toBe(report.safety.blocked - 1)
  })

  it('revokes the winner when its monitored behavior drifts', () => {
    const report = runCanaryAgent(mandate)
    expect(report.drift.violations).toContain('Slippage cap breached')
    expect(report.drift.action).toBe('revoke-before-execution')
    expect(report.authority.status).toBe('revoked')
  })

  it('is deterministic across repeated runs', () => {
    const reports = Array.from({ length: 10 }, () => runCanaryAgent(mandate))
    expect(new Set(reports.map((report) => report.reportId)).size).toBe(1)
    expect(new Set(reports.map((report) => report.selectedAgentId)).size).toBe(1)
  })

  it('fails closed on invalid mandates and undersized suites', () => {
    expect(validateMandate({ ...mandate, liveCapUsd: mandate.capitalUsd + 1 })).toContain('Live cap must be positive and no greater than capital')
    expect(() => runCanaryAgent(mandate, scenarios.slice(0, 2))).toThrow('Scenario suite must contain between 3 and 100 cases')
  })

  it('evaluates one connected agent without fabricated promotion or revocation', () => {
    const report = runAgentEvaluation(mandate, strategyAgents[0])
    expect(report.mode).toBe('external-agent-evaluation')
    expect(report.agent.name).toBe('Northstar')
    expect(report.summary.decisions).toBe(6)
    expect(report.summary.passRate).toBe(1)
    expect(report).not.toHaveProperty('authority')
    expect(report).not.toHaveProperty('drift')
  })
})
