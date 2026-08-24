import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decideReferenceScenario, parseScenario, referenceAgentManifest } from './reference-agent.mjs'
import { evaluateExternalAgent } from './external-agent.mjs'

const MAX_BODY_BYTES = 8 * 1024
const WINDOW_MS = 60_000
const MAX_DECISIONS_PER_WINDOW = 60
const revision = process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'local'
const externalIntakeEnabled = process.env.ENABLE_EXTERNAL_AGENT_INTAKE !== 'false'
const evaluationScenarios = [
  { id: 'calm', label: 'Calm market', aaveYieldPct: 5.8, morphoYieldPct: 6.3, volatilityPct: 0.7, baseSlippageBps: 8 },
  { id: 'rotation', label: 'Yield rotation', aaveYieldPct: 5.1, morphoYieldPct: 8.2, volatilityPct: 1.4, baseSlippageBps: 13 },
  { id: 'volatile', label: 'Volatility spike', aaveYieldPct: 6.2, morphoYieldPct: 8.8, volatilityPct: 3.8, baseSlippageBps: 25 },
  { id: 'aave-stress', label: 'Aave stress', aaveYieldPct: 2.1, morphoYieldPct: 6.9, volatilityPct: 2.7, baseSlippageBps: 19, stressedProtocol: 'Aave' },
  { id: 'morpho-stress', label: 'Morpho stress', aaveYieldPct: 5.7, morphoYieldPct: 3.2, volatilityPct: 3.1, baseSlippageBps: 22, stressedProtocol: 'Morpho' },
  { id: 'liquidity', label: 'Thin liquidity', aaveYieldPct: 6.1, morphoYieldPct: 7.4, volatilityPct: 2.2, baseSlippageBps: 31 },
]
const mimeTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' }
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

function sendJson(response, status, payload) {
  response.writeHead(status, { ...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(payload))
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) { reject(new Error('too_large')); request.destroy(); return }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { reject(new Error('invalid_json')) }
    })
    request.on('error', () => reject(new Error('invalid_request')))
  })
}

function clientKey(request) { return request.socket.remoteAddress ?? 'unknown' }

export function createCanaryServer({ staticRoot = resolve('dist') } = {}) {
  const resolvedStaticRoot = resolve(staticRoot)
  const requestWindows = new Map()

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost')
      if (url.pathname === '/healthz' && request.method === 'GET') return sendJson(response, 200, { status: 'ok', revision, features: { externalAgentIntake: externalIntakeEnabled } })
      if (url.pathname === '/api/agents/reference/manifest' && request.method === 'GET') return sendJson(response, 200, referenceAgentManifest)
      if (url.pathname === '/api/agents/reference/decide' && request.method === 'POST') {
        if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) return sendJson(response, 415, { error: 'JSON content required' })
        const now = Date.now(); const key = clientKey(request); const window = requestWindows.get(key)
        const activeWindow = window && now - window.startedAt < WINDOW_MS ? window : { startedAt: now, count: 0 }
        activeWindow.count += 1; requestWindows.set(key, activeWindow)
        if (activeWindow.count > MAX_DECISIONS_PER_WINDOW) return sendJson(response, 429, { error: 'Decision request limit reached' })
        let body
        try { body = await readJson(request) } catch (error) { return sendJson(response, error instanceof Error && error.message === 'too_large' ? 413 : 400, { error: 'Invalid decision request' }) }
        const scenario = parseScenario(body?.scenario)
        if (!scenario || Object.keys(body).length !== 1) return sendJson(response, 400, { error: 'Invalid decision request' })
        return sendJson(response, 200, { agentId: referenceAgentManifest.id, proposal: decideReferenceScenario(scenario) })
      }
      if (url.pathname === '/api/agents/external/evaluate' && request.method === 'POST') {
        if (!externalIntakeEnabled) return sendJson(response, 503, { error: 'External agent intake is temporarily unavailable' })
        if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) return sendJson(response, 415, { error: 'JSON content required' })
        const now = Date.now(); const key = `evaluation:${clientKey(request)}`; const window = requestWindows.get(key)
        const activeWindow = window && now - window.startedAt < WINDOW_MS ? window : { startedAt: now, count: 0 }
        activeWindow.count += 1; requestWindows.set(key, activeWindow)
        if (activeWindow.count > 6) return sendJson(response, 429, { error: 'Evaluation request limit reached' })
        let body
        try { body = await readJson(request) } catch (error) { return sendJson(response, error instanceof Error && error.message === 'too_large' ? 413 : 400, { error: 'Invalid evaluation request' }) }
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || typeof body.endpoint !== 'string') return sendJson(response, 400, { error: 'Invalid evaluation request' })
        const startedAt = Date.now()
        try {
          const result = await evaluateExternalAgent(body.endpoint, evaluationScenarios)
          console.log(JSON.stringify({ event: 'external_evaluation', status: 'ok', agentId: result.manifest.id, durationMs: Date.now() - startedAt }))
          return sendJson(response, 200, result)
        } catch (error) {
          console.warn(JSON.stringify({ event: 'external_evaluation', status: 'rejected', reason: error instanceof Error ? error.message : 'Agent evaluation failed', durationMs: Date.now() - startedAt }))
          return sendJson(response, 422, { error: error instanceof Error ? error.message : 'Agent evaluation failed' })
        }
      }
      if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { error: 'Not found' })
      if (request.method !== 'GET' && request.method !== 'HEAD') return sendJson(response, 405, { error: 'Method not allowed' })
      const requestPath = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
      const filePath = resolve(resolvedStaticRoot, `.${requestPath}`)
      const relativePath = relative(resolvedStaticRoot, filePath)
      const safePath = relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
      const candidate = safePath && existsSync(filePath) ? filePath : resolve(resolvedStaticRoot, 'index.html')
      const candidateRelativePath = relative(resolvedStaticRoot, candidate)
      if ((candidateRelativePath.startsWith('..') || isAbsolute(candidateRelativePath)) || !(await stat(candidate)).isFile()) return sendJson(response, 404, { error: 'Not found' })
      response.writeHead(200, { ...securityHeaders, 'Content-Type': mimeTypes[extname(candidate)] ?? 'application/octet-stream', 'Cache-Control': candidate.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' })
      if (request.method === 'HEAD') return response.end()
      createReadStream(candidate).pipe(response)
    } catch {
      if (!response.headersSent) sendJson(response, 500, { error: 'Service unavailable' })
      else response.destroy()
    }
  })
}

const launchedFromCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (launchedFromCli) {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10)
  createCanaryServer().listen(Number.isFinite(port) ? port : 3000, '0.0.0.0', () => console.log(`Canary listening on ${Number.isFinite(port) ? port : 3000}`))
}
