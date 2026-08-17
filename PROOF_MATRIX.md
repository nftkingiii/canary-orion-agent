# Canary proof matrix

| Requirement | Implementation | Evidence | Status |
| --- | --- | --- | --- |
| Autonomous agent | One command runs validation, trials, selection, promotion, monitoring and revocation | `npm run agent:run` JSON report | Verified locally, 2026-08-17 |
| Behavioral safety | Every candidate proposal is checked before it may count as allowed | Nine tests plus ten-run evaluation | Verified locally, 2026-08-17 |
| Adverse state | 57 bps monitored proposal breaches a 40 bps mandate | Report `cnr_749197ea`, UI revocation and tests | Verified locally, 2026-08-17 |
| Repeatability | Ten complete runs must produce one report identity and winner | `npm run agent:evaluate` | Verified: 10/10 stable |
| Agent reliability | Six common scenarios, 19 decisions per run | Machine-readable report and candidate breakdown | Deterministic simulation only |
| Product UI | One-click observer flow with loading, selection, promotion and revocation | Browser run at desktop and 390 x 844; no console errors or page overflow | Verified locally, 2026-08-17 |
| Orion SDK/API | Not stated in supplied submission requirements | `site info.pdf` captured 2026-08-17 | Not applicable unless later rules require it |
| Real financial action | No wallet or signer exists; all authority is simulated | `realFundsMoved: false` | Not implemented; not claimed |
| Deployment | Public frontend | Live URL and served revision | Missing |
| Source | Public repository | GitHub URL and commit | Missing |
| Required social links | Website, X, GitHub, and Discord or Telegram | Submission fields | Missing |
| Registration and ignition | Registered submitting wallet and approximately $10 ETH fee | Final form/wallet confirmation | User action required |
| Submission | Deadline September 2, 2026 at 23:59 UTC | Final form snapshot | Missing |
