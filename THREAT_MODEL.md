# Canary threat model

## Assets and trust boundaries

- **Mandate:** user-supplied capital and risk limits cross into deterministic validation.
- **Candidate adapters:** strategy output is untrusted and must never authorize itself.
- **Scenario observations:** current fixtures are deterministic simulation inputs, not live market truth.
- **Promotion decision:** only eligible, policy-compliant results may receive simulated authority.
- **Execution boundary:** the current build has no wallet or transaction signer; `realFundsMoved` is always false.

## Abuse cases and controls

| Abuse case | Current control | Future live requirement |
| --- | --- | --- |
| Invalid or extreme mandate | Numeric ranges, protocol count and string lengths fail closed | Validate again server-side and in the enforcing contract/account |
| Candidate reports attractive returns while breaching limits | Eligibility is calculated from every proposal before scoring | Independently retrieve signed actions and market reference data |
| Candidate changes behavior after promotion | Held-out drift proposal triggers revoke-before-execution | Expiring capabilities and continuous live monitoring |
| Candidate tries an unlisted protocol | Protocol allowlist blocks the decision | Typed call allowlists and destination-contract verification |
| Replay or duplicated authority | No live signing exists | Nonces, expiry, idempotency and replay protection |
| Client tampers with the simulation | Decision report is reproducible through the CLI and tests | Signed mandate plus server/contract enforcement |
| Resource exhaustion | Suite and candidate counts are bounded to 3-100 and 2-20 | Request size limits, timeouts and rate limiting |
| Model or adapter output becomes executable code | Strategies return typed data; no `eval`, shell or HTML execution | Parse external output into a strict schema before policy evaluation |

Canary must fail closed if mandate validation, candidate availability, scenario coverage or the drift challenge cannot be verified.
