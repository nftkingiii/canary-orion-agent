# Canary

Canary is a non-custodial evaluation product for financial agents. An operator connects an external HTTPS agent, defines a risk mandate, and receives an inspectable policy report from live agent decisions against a controlled scenario suite.

## How an operator uses Canary

1. Open **Policy**, configure the portfolio reference, per-action value, allocation, drawdown, slippage, and allowed protocols, then save it.
2. Open **Evaluate** and enter the public HTTPS base URL for your agent.
3. Run the evaluation. Canary requests `<base>/manifest` and six live `<base>/decide` responses through its protected server-side adapter.
4. Inspect each returned decision, its policy result, and the aggregate compliance summary.
5. Open **Reports** to revisit evaluations stored in this browser.

## What runs

1. Validate the operator's policy against five hard limits.
2. Verify the supplied agent's manifest and identity.
3. Request six live decisions from that agent across a controlled scenario suite.
4. Check each proposal's allocation, protocol, slippage, and scenario-modelled drawdown against the policy.
5. Produce a compliant or review-required report with all decisions visible.

Agent requests are live. Scenario outcomes remain modelled rather than live market performance. Canary does not connect a wallet, sign transactions, or move funds; it is an evaluation product, not an execution layer.

External intake is implemented. Canary requires an HTTPS base URL, resolves and rejects private/reserved destinations, forbids credentials, query strings, custom ports and redirects, caps response size, applies timeouts and rate limits, validates manifest/decision schemas, and fails closed before evaluation. The remote agent must expose `GET <base>/manifest` and `POST <base>/decide`; see the contract below. There is no fallback agent, fixture comparison, simulated promotion, or staged revocation in the website.

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

Open `http://127.0.0.1:4173`, save a policy, connect a compatible public agent endpoint, and run an evaluation.

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
- `src/remote-agent.ts`: browser client that requests server-side evaluation and validates every response again before policy evaluation.
- `src/agent-engine.ts`: controlled scenarios, mandate validation, proposal checks, modelled outcome calculations, and single-agent report generation. Historical multi-agent functions remain for CLI regression evidence and are not used by the website.
- `src/agent-engine.test.ts`: autonomous-agent behavioral contracts and repeatability tests.
- `scripts/run-agent.mjs`: standalone CLI and ten-run evaluation entry point.
- `src/App.tsx`: endpoint → policy → evaluation → report product workflow.
- `src/domain.ts`: lower-level policy primitives retained as regression coverage.

## Orion submission position

The supplied Orion submission page does not require an Orion SDK or API. Canary is submitted as the autonomous agent. Orion Store listing follows platform review rather than being a pre-submission integration requirement. See `SOURCES.md` and `PROJECT_STATE.md` for the verified requirements and remaining public-submission work.
