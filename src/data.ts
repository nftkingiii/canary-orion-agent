import type { Candidate, Mandate } from './domain'

export const mandate: Mandate = {
  capitalUsd: 25_000,
  liveCapUsd: 1_000,
  maxAllocationPct: 35,
  maxDrawdownPct: 3,
  maxSlippageBps: 40,
  allowedProtocols: ['Aave', 'Morpho'],
}

export const candidates: Candidate[] = [
  {
    id: 'ori-a17',
    name: 'Northstar',
    storeScore: 82,
    strategy: 'Capital preservation',
    observedReturnPct: 1.8,
    drawdownPct: 0.9,
    policyPassRate: 100,
    proposal: { allocationPct: 28, expectedYieldPct: 6.4, maxSlippageBps: 18, protocol: 'Aave' },
  },
  {
    id: 'ori-b04',
    name: 'Kestrel',
    storeScore: 91,
    strategy: 'Yield rotation',
    observedReturnPct: 2.5,
    drawdownPct: 2.6,
    policyPassRate: 96,
    proposal: { allocationPct: 32, expectedYieldPct: 8.1, maxSlippageBps: 32, protocol: 'Morpho' },
  },
  {
    id: 'ori-c22',
    name: 'Aperture',
    storeScore: 88,
    strategy: 'Aggressive carry',
    observedReturnPct: 3.9,
    drawdownPct: 4.2,
    policyPassRate: 84,
    proposal: { allocationPct: 48, expectedYieldPct: 12.7, maxSlippageBps: 65, protocol: 'Unlisted pool' },
  },
]
