# Canary proof matrix

| Requirement | Implementation | Evidence | Status |
| --- | --- | --- | --- |
| Autonomous agent | One command runs validation, trials, selection, promotion, monitoring and revocation | `npm run agent:run` JSON report | Verified locally, 2026-08-17 |
| Behavioral safety | Every candidate proposal is checked before it may count as allowed | Nine tests plus ten-run evaluation | Verified locally, 2026-08-17 |
| Adverse state | 57 bps monitored proposal breaches a 40 bps mandate | Report `cnr_749197ea`, UI revocation and tests | Verified locally, 2026-08-17 |
| Repeatability | Ten complete runs must produce one report identity and winner | `npm run agent:evaluate` | Verified: 10/10 stable |
| Agent reliability | Six common scenarios, 19 decisions per run | Machine-readable report and candidate breakdown | Deterministic simulation only |
| Candidate provenance | Built-in strategy adapters are labeled as local simulation fixtures | `src/agent-engine.ts`, UI source banner, README limitation | Verified locally, 2026-08-18 |
| Reference-agent adapter | Same-deployment HTTP manifest and six schema-validated decision requests; unavailable/malformed responses stop probation | Live `/healthz`, manifest, valid decision, 400 rejection, browser Harbor probation/revocation, `npm run adapter:smoke` | Verified publicly, 2026-08-24 |
| Product UI | Configure mandate, save policy, run probation, inspect evidence, and observe revocation | Browser reproduction: mandate save, invalid-input rejection, autonomous run, report, no console errors | Verified locally, 2026-08-18 |
| Orion SDK/API | Not stated in supplied submission requirements | `site info.pdf` captured 2026-08-17 | Not applicable unless later rules require it |
| Real financial action | No wallet or signer exists; all authority is simulated | `realFundsMoved: false` | Not implemented; not claimed |
| Deployment | Public UI plus reference-agent API | `https://agent-canary.up.railway.app`, bundle `index-DCCkUIlU.js`, live API read-back | Verified publicly, 2026-08-24 |
| Source | Public repository | https://github.com/nftkingiii/canary-orion-agent, commit `cf3f4f9` | Verified publicly, 2026-08-24 |
| Required social links | Website, X, GitHub, and Discord or Telegram | Submission fields | Missing |
| Registration and ignition | Registered submitting wallet and approximately $10 ETH fee | Final form/wallet confirmation | User action required |
| Submission | Deadline September 2, 2026 at 23:59 UTC | Final form snapshot | Missing |
