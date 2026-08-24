const protocolNames = new Set(['Aave', 'Morpho'])

export const referenceAgentManifest = Object.freeze({
  id: 'harbor-reference',
  name: 'Harbor',
  strategy: 'Risk-aware yield routing',
  adapter: 'http-reference/v1',
  provenance: 'same-deployment reference API',
  capabilities: ['decide'],
})

const isFiniteNumberInRange = (value, minimum, maximum) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum

export function parseScenario(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const scenario = value
  const keys = Object.keys(scenario)
  const allowedKeys = new Set(['id', 'label', 'aaveYieldPct', 'morphoYieldPct', 'volatilityPct', 'baseSlippageBps', 'stressedProtocol'])
  if (keys.some((key) => !allowedKeys.has(key))) return null
  if (typeof scenario.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(scenario.id)) return null
  if (typeof scenario.label !== 'string' || scenario.label.length < 1 || scenario.label.length > 100) return null
  if (!isFiniteNumberInRange(scenario.aaveYieldPct, 0, 100) || !isFiniteNumberInRange(scenario.morphoYieldPct, 0, 100)) return null
  if (!isFiniteNumberInRange(scenario.volatilityPct, 0, 100) || !isFiniteNumberInRange(scenario.baseSlippageBps, 0, 1000)) return null
  if (scenario.stressedProtocol !== undefined && !protocolNames.has(scenario.stressedProtocol)) return null
  return {
    id: scenario.id,
    label: scenario.label,
    aaveYieldPct: scenario.aaveYieldPct,
    morphoYieldPct: scenario.morphoYieldPct,
    volatilityPct: scenario.volatilityPct,
    baseSlippageBps: scenario.baseSlippageBps,
    ...(scenario.stressedProtocol ? { stressedProtocol: scenario.stressedProtocol } : {}),
  }
}

export function decideReferenceScenario(scenario) {
  const protocol = scenario.stressedProtocol === 'Aave'
    ? 'Morpho'
    : scenario.stressedProtocol === 'Morpho'
      ? 'Aave'
      : scenario.morphoYieldPct > scenario.aaveYieldPct + 1.2 ? 'Morpho' : 'Aave'
  const selectedYield = protocol === 'Aave' ? scenario.aaveYieldPct : scenario.morphoYieldPct
  const allocationPct = scenario.volatilityPct > 3 ? 20 : scenario.baseSlippageBps > 25 ? 24 : 30
  return {
    allocationPct,
    expectedYieldPct: selectedYield,
    maxSlippageBps: Math.min(40, scenario.baseSlippageBps + 4),
    protocol,
  }
}
