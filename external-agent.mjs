import { lookup } from 'node:dns/promises'

const REQUEST_TIMEOUT_MS = 4_000
const MAX_RESPONSE_BYTES = 16 * 1024

function isPrivateIpv4(address) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 0) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19))
}

function isPrivateIp(address) {
  const normalized = address.toLowerCase().split('%')[0]
  if (normalized.includes('.')) return isPrivateIpv4(normalized.replace(/^::ffff:/, ''))
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff')
}

export async function validateAgentEndpoint(raw, resolver = lookup) {
  if (typeof raw !== 'string' || raw.length < 10 || raw.length > 300) throw new Error('Enter a valid HTTPS agent URL')
  let url
  try { url = new URL(raw) } catch { throw new Error('Enter a valid HTTPS agent URL') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.port && url.port !== '443')) throw new Error('Agent URL must use HTTPS without credentials, query parameters, fragments, or custom ports')
  const addresses = await resolver(url.hostname, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error('Agent URL resolves to a private or reserved network')
  url.pathname = url.pathname.replace(/\/+$/, '')
  return url
}

async function readBoundedJson(response) {
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > MAX_RESPONSE_BYTES) throw new Error('Agent response exceeded 16 KB')
  if (!response.body) throw new Error('Agent returned an empty response')
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('Agent response exceeded 16 KB') }
    chunks.push(value)
  }
  try {
    const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8')
    return JSON.parse(body)
  } catch { throw new Error('Agent returned invalid JSON') }
}

async function fetchJson(url, init, fetcher) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetcher(url, { ...init, redirect: 'error', signal: controller.signal, headers: { ...init?.headers, Accept: 'application/json', 'User-Agent': 'Canary-Agent-Evaluator/1.0' } })
    if (!response.ok) throw new Error(`Agent returned HTTP ${response.status}`)
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.startsWith('application/json')) throw new Error('Agent must return application/json')
    return await readBoundedJson(response)
  } finally { clearTimeout(timeout) }
}

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

export function parseExternalManifest(value, endpoint) {
  if (!isObject(value) || typeof value.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(value.id) || typeof value.name !== 'string' || value.name.length < 1 || value.name.length > 80 || typeof value.strategy !== 'string' || value.strategy.length < 1 || value.strategy.length > 120 || !['canary-agent/v1', 'http-reference/v1'].includes(value.adapter) || !Array.isArray(value.capabilities) || !value.capabilities.includes('decide')) throw new Error('Agent manifest does not satisfy a supported Canary adapter')
  return { id: value.id, name: value.name, strategy: value.strategy, adapter: value.adapter, provenance: endpoint, capabilities: value.capabilities.filter((item) => typeof item === 'string').slice(0, 10) }
}

export function parseExternalProposal(value) {
  if (!isObject(value) || !inRange(value.allocationPct, 0, 100) || !inRange(value.expectedYieldPct, 0, 100) || !inRange(value.maxSlippageBps, 0, 1_000) || typeof value.protocol !== 'string' || value.protocol.length < 1 || value.protocol.length > 40) throw new Error('Agent decision failed schema validation')
  return { allocationPct: value.allocationPct, expectedYieldPct: value.expectedYieldPct, maxSlippageBps: value.maxSlippageBps, protocol: value.protocol }
}

export async function evaluateExternalAgent(rawEndpoint, scenarios, { resolver = lookup, fetcher = fetch } = {}) {
  const endpoint = await validateAgentEndpoint(rawEndpoint, resolver)
  const base = endpoint.toString().replace(/\/$/, '')
  const manifest = parseExternalManifest(await fetchJson(`${base}/manifest`, undefined, fetcher), base)
  const startedAt = Date.now()
  const decisions = await Promise.all(scenarios.map(async (scenario) => {
    const started = performance.now()
    const response = await fetchJson(`${base}/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario }) }, fetcher)
    if (!isObject(response) || response.agentId !== manifest.id) throw new Error('Agent decision identity did not match its manifest')
    return { scenarioId: scenario.id, proposal: parseExternalProposal(response.proposal), latencyMs: Math.max(0.01, Math.round((performance.now() - started) * 1000) / 1000) }
  }))
  return { manifest, decisions, evaluatedAt: new Date(startedAt).toISOString() }
}
