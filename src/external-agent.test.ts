import { describe, expect, it } from 'vitest'
import { parseExternalManifest, parseExternalProposal, validateAgentEndpoint } from '../external-agent.mjs'

const publicResolver = async () => [{ address: '93.184.216.34', family: 4 }]

describe('external agent trust boundary', () => {
  it('accepts a public HTTPS base URL', async () => {
    await expect(validateAgentEndpoint('https://agent.example/api/canary', publicResolver)).resolves.toMatchObject({ hostname: 'agent.example', pathname: '/api/canary' })
  })

  it.each(['http://agent.example', 'https://user:secret@agent.example', 'https://agent.example:8443', 'https://agent.example/path?token=secret'])(
    'rejects unsafe endpoint %s', async (endpoint) => {
      await expect(validateAgentEndpoint(endpoint, publicResolver)).rejects.toThrow()
    },
  )

  it('rejects endpoints that resolve to private networks', async () => {
    const privateResolver = async () => [{ address: '127.0.0.1', family: 4 }]
    await expect(validateAgentEndpoint('https://agent.example', privateResolver)).rejects.toThrow('private or reserved')
  })

  it('validates the public agent contract', () => {
    expect(parseExternalManifest({ id: 'test-agent', name: 'Test', strategy: 'Safe routing', adapter: 'canary-agent/v1', capabilities: ['decide'] }, 'https://agent.example')).toMatchObject({ id: 'test-agent' })
    expect(parseExternalProposal({ allocationPct: 20, expectedYieldPct: 6, maxSlippageBps: 12, protocol: 'Aave' })).toMatchObject({ protocol: 'Aave' })
    expect(() => parseExternalProposal({ allocationPct: 200, expectedYieldPct: 6, maxSlippageBps: 12, protocol: 'Aave' })).toThrow('schema validation')
  })

  it('accepts the deployed reference adapter for backwards compatibility', () => {
    expect(parseExternalManifest({ id: 'harbor-reference', name: 'Harbor', strategy: 'Safe routing', adapter: 'http-reference/v1', capabilities: ['decide'] }, 'https://agent.example')).toMatchObject({ adapter: 'http-reference/v1' })
  })
})
