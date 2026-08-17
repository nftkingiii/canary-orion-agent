import { runCanaryAgent } from '../src/agent-engine.ts'
import { mandate } from '../src/data.ts'

const requestedRuns = Number.parseInt(process.argv[process.argv.indexOf('--runs') + 1] ?? '1', 10)
const runs = Number.isFinite(requestedRuns) ? Math.min(100, Math.max(1, requestedRuns)) : 1
const started = performance.now()
const reports = Array.from({ length: runs }, () => runCanaryAgent(mandate))
const durationMs = Math.round((performance.now() - started) * 1000) / 1000
const stableReports = new Set(reports.map((report) => report.reportId)).size === 1
const enforcementPassRate = reports.reduce((sum, report) => sum + report.safety.enforcementPassRate, 0) / reports.length

console.log(JSON.stringify({
  evaluation: {
    runs,
    stableReports,
    enforcementPassRate,
    unsafeExecutions: reports.reduce((sum, report) => sum + report.safety.unsafeExecuted, 0),
    selectedAgent: reports[0].selectedAgentName,
    durationMs,
  },
  report: reports[0],
}, null, 2))

if (!stableReports || enforcementPassRate !== 1) process.exitCode = 1
