# Canary threat model

## Assets and trust boundaries

- **Mandate:** user-supplied capital and risk limits cross into deterministic validation.
- **Candidate adapters:** strategy output is untrusted and must never authorize itself.
- **External endpoint:** an operator-supplied URL crosses into a server-side network request and is an SSRF, denial-of-service, and schema-confusion boundary.
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
| Resource exhaustion | Suite/candidate counts, request/response bodies, request duration and per-client frequency are bounded | Distributed rate limiting and workload isolation at larger scale |
| Model or adapter output becomes executable code | Strategies return typed data; no `eval`, shell or HTML execution | Parse external output into a strict schema before policy evaluation |
| Endpoint targets internal infrastructure | HTTPS-only URLs, DNS resolution checks, private/reserved IP rejection, no credentials/custom ports/query strings, and redirects disabled | Pin validated DNS results at the connection layer to eliminate DNS-rebinding TOCTOU risk |
| Remote agent spoofs another identity | Every decision `agentId` must match the validated manifest | Signed manifests and rotating service identities |

Canary must fail closed if mandate validation, candidate availability, scenario coverage or the drift challenge cannot be verified.
