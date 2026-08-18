# Canary

Canary is an autonomous risk-governance agent. It makes financial agents earn bounded authority by running them through a common scenario suite, rejecting mandate violations, promoting the strongest eligible strategy, and revoking authority when monitored behavior drifts.

## How an operator uses Canary

1. Open the product and review the default treasury policy.
2. Configure capital, authority cap, allocation, drawdown, slippage, and allowed venues in the **Mandate** tab.
3. Save the mandate. Invalid or unsafe limits are rejected before a run starts.
4. Start probation from **Overview** or **Live trial**.
5. Review the candidate comparison, policy pass rates, score, drawdown, and authority state.
6. Open **Evidence** to inspect the mandate, shadow trial, promotion, monitoring, and revocation trace.

## What runs

1. Validate a treasury mandate against five hard limits.
2. Execute three independent strategy adapters across six common market scenarios.
3. Measure policy pass rate, simulated return, drawdown and decision latency.
4. Select the highest-scoring candidate that clears the 80% eligibility threshold.
5. Grant a simulated $1,000 authority cap.
6. Monitor a held-out 57 bps drift proposal.
7. Revoke authority before execution when it breaches the 40 bps limit.

The current build is a deterministic simulation. It does not connect a wallet, sign transactions, use real market observations, or move funds. Those limits are shown in the UI and machine-readable report.

The three visible candidates are built-in simulation adapters defined in `src/agent-engine.ts`; they are not fetched from Orion or an external Agent Store. Live candidate intake is an explicit future integration boundary, not a claim made by this build.

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
```

`agent:run` emits the complete JSON decision report. `agent:evaluate` repeats the run ten times and fails if report identity changes, an unsafe action executes, or enforcement falls below 100%.

## Verify

```powershell
npm run check
npm audit --audit-level=high
npm audit signatures
```

## Architecture

- `src/agent-engine.ts`: strategy adapters, held-out scenarios, mandate validation, scoring, promotion and revocation.
- `src/agent-engine.test.ts`: autonomous-agent behavioral contracts and repeatability tests.
- `scripts/run-agent.mjs`: standalone CLI and ten-run evaluation entry point.
- `src/App.tsx`: operator workflow UI using the same engine as the CLI and tests.
- `src/domain.ts`: lower-level policy primitives retained as regression coverage.

## Orion submission position

The supplied Orion submission page does not require an Orion SDK or API. Canary is submitted as the autonomous agent. Orion Store listing follows platform review rather than being a pre-submission integration requirement. See `SOURCES.md` and `PROJECT_STATE.md` for the verified requirements and remaining public-submission work.
