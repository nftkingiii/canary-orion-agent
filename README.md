# Canary

Canary is an autonomous risk-governance agent. It makes financial agents earn bounded authority by running them through a common scenario suite, rejecting mandate violations, promoting the strongest eligible strategy, and revoking authority when monitored behavior drifts.

## What runs

1. Validate a treasury mandate against five hard limits.
2. Execute three independent strategy adapters across six common market scenarios.
3. Measure policy pass rate, simulated return, drawdown and decision latency.
4. Select the highest-scoring candidate that clears the 80% eligibility threshold.
5. Grant a simulated $1,000 authority cap.
6. Monitor a held-out 57 bps drift proposal.
7. Revoke authority before execution when it breaches the 40 bps limit.

The current build is a deterministic simulation. It does not connect a wallet, sign transactions, use real market observations, or move funds. Those limits are shown in the UI and machine-readable report.

## Run the product

```powershell
npm install --ignore-scripts
npm run dev
```

Open `http://127.0.0.1:4173`, then select **Run autonomous agent**. No further interaction is needed for the trial, promotion, monitoring challenge or revocation.

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
- `src/App.tsx`: one-click observer UI using the same engine as the CLI and tests.
- `src/domain.ts`: lower-level policy primitives retained as regression coverage.

## Orion submission position

The supplied Orion submission page does not require an Orion SDK or API. Canary is submitted as the autonomous agent. Orion Store listing follows platform review rather than being a pre-submission integration requirement. See `SOURCES.md` and `PROJECT_STATE.md` for the verified requirements and remaining public-submission work.
