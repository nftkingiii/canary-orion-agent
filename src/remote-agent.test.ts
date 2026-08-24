import { describe, expect, it } from 'vitest'
import { strategyAgents } from './agent-engine'
import { buildCandidateRoster } from './remote-agent'

describe('Canary candidate provenance', () => {
  it('includes Harbor before the reference-agent handshake begins', () => {
    const roster = buildCandidateRoster(null, strategyAgents, strategyAgents)
    expect(roster.map((agent) => agent.id)).toEqual(['harbor-reference', 'northstar', 'kestrel', 'aperture'])
  })
})
