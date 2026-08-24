import { createCanaryServer } from '../server.mjs'

const server = createCanaryServer()
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const { port } = server.address()
const baseUrl = `http://127.0.0.1:${port}`

try {
  const health = await fetch(`${baseUrl}/healthz`)
  if (!health.ok || (await health.json()).status !== 'ok') throw new Error('Health endpoint failed')
  const manifestResponse = await fetch(`${baseUrl}/api/agents/reference/manifest`)
  const manifest = await manifestResponse.json()
  if (!manifestResponse.ok || manifest.id !== 'harbor-reference') throw new Error('Manifest endpoint failed')
  const decision = await fetch(`${baseUrl}/api/agents/reference/decide`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: { id: 'calm', label: 'Calm market', aaveYieldPct: 5.8, morphoYieldPct: 6.3, volatilityPct: 0.7, baseSlippageBps: 8 } }),
  })
  const result = await decision.json()
  if (!decision.ok || result.agentId !== manifest.id || result.proposal.protocol !== 'Aave') throw new Error('Decision endpoint failed')
  const rejected = await fetch(`${baseUrl}/api/agents/reference/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: { id: '../escape' } }) })
  if (rejected.status !== 400) throw new Error('Invalid payload was accepted')
  console.log('Adapter HTTP smoke test passed')
} finally {
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}
