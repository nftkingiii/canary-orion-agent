# Canary

Canary is a non-custodial evaluation product for financial agents. An operator connects an external HTTPS agent, defines a risk mandate, and receives an inspectable policy report from live agent decisions against a controlled scenario suite.

## How an operator uses Canary

1. Open the product and review the default treasury policy.
2. Configure capital, authority cap, allocation, drawdown, slippage, and allowed venues in the **Mandate** tab.
3. Save the mandate. Invalid or unsafe limits are rejected before a run starts.
4. In **Live trial**, enter an agent base URL or leave it empty to use Harbor, the bundled reference agent.
5. Start probation. Canary requests `<base>/manifest` and `<base>/decide` through its protected server-side adapter.
6. Review the candidate comparison, policy pass rates, score, drawdown, and authority state.
7. Open **Evidence** to inspect the report and browser-persisted run history.

## What runs

1. Validate a treasury mandate against five hard limits.
2. Verify a bounded HTTP manifest and decision contract with an operator-supplied external agent or the same-deployment Harbor reference, then execute it alongside three local baseline fixtures across six common market scenarios.
3. Measure policy pass rate, simulated return, drawdown and decision latency.
4. Select the highest-scoring candidate that clears the 80% eligibility threshold.
5. Grant a simulated $1,000 authority cap.
6. Monitor a held-out 57 bps drift proposal.
7. Revoke authority before execution when it breaches the 40 bps limit.

Agent requests are live when an external endpoint is supplied. The evaluation environment remains deterministic: Canary does not connect a wallet, sign transactions, use live market observations, or move funds. Those limits are shown in the UI and machine-readable report.

External intake is implemented. Canary accepts an HTTPS base URL, resolves and rejects private/reserved destinations, forbids credentials, query strings, custom ports and redirects, caps response size, applies timeouts and rate limits, validates manifest/decision schemas, and fails closed before evaluation. The remote agent must expose `GET <base>/manifest` and `POST <base>/decide`; see the contract below. Harbor remains a same-deployment reference implementation. Northstar, Kestrel, and Aperture are clearly labeled deterministic baselines.

## Agent adapter contract

`GET <base>/manifest`:

```json
{"id":"my-agent","name":"My Agent","strategy":"Risk-aware routing","adapter":"canary-agent/v1","capabilities":["decide"]}
```

`POST <base>/decide` receives `{ "scenario": { ... } }` and returns:

```json
{"agentId":"my-agent","proposal":{"allocationPct":20,"expectedYieldPct":6.1,"maxSlippageBps":15,"protocol":"Aave"}}
```

Do not put API keys or credentials in the URL. Canary currently supports public agent endpoints only.

## Run the product

```powershell
npm install --ignore-scripts
npm run dev
```

Open `http://127.0.0.1:4173`, configure and save the mandate, then start probation. The trial, promotion, monitoring challenge and revocation continue automatically after launch.

## Run the agent directly

```powershell
npm run agent:run
npm run agent:evaluate
npm run adapter:smoke
```

`agent:run` emits the complete JSON decision report. `agent:evaluate` repeats the run ten times and fails if report identity changes, an unsafe action executes, or enforcement falls below 100%.

## Verify

```powershell
npm run check
npm audit --audit-level=high
npm audit signatures
```

## Architecture

- `server.mjs`, `external-agent.mjs`, and `reference-agent.mjs`: protected external intake, same-deployment reference API, static production serving, rate limits, bounded JSON parsing, SSRF controls, and response security headers.
- `src/remote-agent.ts`: browser client that requests server-side evaluation and validates every result again before it becomes a candidate adapter.
- `src/agent-engine.ts`: fixture adapters, held-out scenarios, mandate validation, scoring, promotion and revocation.
- `src/agent-engine.test.ts`: autonomous-agent behavioral contracts and repeatability tests.
- `scripts/run-agent.mjs`: standalone CLI and ten-run evaluation entry point.
- `src/App.tsx`: operator workflow UI using the same engine as the CLI and tests.
- `src/domain.ts`: lower-level policy primitives retained as regression coverage.

## Orion submission position

The supplied Orion submission page does not require an Orion SDK or API. Canary is submitted as the autonomous agent. Orion Store listing follows platform review rather than being a pre-submission integration requirement. See `SOURCES.md` and `PROJECT_STATE.md` for the verified requirements and remaining public-submission work.
