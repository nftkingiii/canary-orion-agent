import { describe, expect, it } from 'vitest'
import { candidates, mandate } from './data'
import { authorizeProposal, evaluateCandidate, selectPromotion } from './domain'

describe('Canary authority policy', () => {
  it('blocks a high-return agent that breaches the mandate', () => {
    const result = evaluateCandidate(candidates[2], mandate)
    expect(result.eligible).toBe(false)
    expect(result.violations).toEqual([
      'Allocation exceeds mandate',
      'Drawdown limit breached',
      'Slippage cap breached',
      'Protocol is not allowlisted',
    ])
  })

  it('promotes the strongest eligible agent rather than the highest return', () => {
    const result = selectPromotion(candidates.map((candidate) => evaluateCandidate(candidate, mandate)))
    expect(result?.name).toBe('Northstar')
  })

  it('rejects a promoted agent when its new proposal drifts outside policy', () => {
    const promoted = evaluateCandidate(candidates[1], mandate)
    const drifted = { ...promoted, proposal: { ...promoted.proposal, maxSlippageBps: 57 } }
    expect(authorizeProposal(drifted, mandate)).toEqual({ allowed: false, reason: 'Slippage cap breached' })
  })

  it('fails closed when live authority exceeds available capital', () => {
    const promoted = evaluateCandidate(candidates[1], mandate)
    const unsafeMandate = { ...mandate, liveCapUsd: mandate.capitalUsd + 1 }
    expect(authorizeProposal(promoted, unsafeMandate).allowed).toBe(false)
  })
})
