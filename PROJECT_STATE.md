# Canary project state

Updated: 2026-08-24

## Goal

Build a usable non-custodial financial-agent evaluation product for the Orion Agents Builder Hackathon. Canary accepts an external agent endpoint, tests its live decisions under one mandate, compares it with labeled baselines, and preserves an inspectable report while keeping financial execution out of scope.

## Current milestone

External HTTPS intake, browser-persisted policies/reports, and the product-only website are deployed and publicly verified.

## Confirmed

- Product name: Canary.
- Core loop: mandate → competing shadow trial → capped promotion → continuous enforcement/revocation.
- Operator loop: configure mandate → validate and save → run probation → inspect evidence → observe promotion and revocation.
- The supplied Orion requirements do not state that an Orion SDK or API integration is required. Agent Store listing follows review; it is not a pre-submission integration requirement.
- The submission requires registration from the submitting wallet, a website, X profile, GitHub, Discord or Telegram, and the form's agent/category/chain/economics details.
- A demo link is optional but strongly recommended. Submission includes an approximately $10 ETH ignition fee.
- Deadline: September 2, 2026 at 23:59 UTC.
- Canary deliberately does not move real funds or claim live market data in this milestone.
- Agent proposals and external data are untrusted; deterministic policy code controls authorization.
- The three visible candidates (Northstar, Kestrel, Aperture) are local deterministic simulation adapters, not external Orion agents or Agent Store listings.
- Harbor is a real same-deployment HTTP reference-agent adapter: Canary verifies its manifest, requests six bounded scenario decisions, validates every response, and adds it to the probation suite. It is not an independent third-party agent, Orion API integration, or Agent Store listing.
- Operators can now provide a public HTTPS base URL implementing `GET /manifest` and `POST /decide`. Canary's server verifies the destination, fetches six live decisions, validates identity and schemas, and returns them to the policy engine.
- A local browser run used the public Railway Harbor endpoint as a genuinely remote input, generated report `cnr_38a3f091`, persisted it across reloads, and produced no browser warnings/errors.
- A clean public browser run on the deployed release submitted the public Harbor base URL through the external intake, completed six remote decisions, generated `cnr_38a3f091`, and retained the report in local run history after reload with no browser warnings/errors.
- External intake rejects non-HTTPS URLs, embedded credentials, query strings, fragments, custom ports, redirects, private/reserved resolved addresses, oversized responses, incomplete scenario coverage, invalid schemas, and manifest/decision identity mismatches.
- Mandates, endpoint preference, and up to eight reports persist in browser storage. No credentials, wallet data, or server-side user records are stored.
- The new website requires a user-supplied endpoint and evaluates only that agent. It removes Harbor fallback, local fixture comparison, winner selection, simulated authority, staged drift, and forced revocation from the product workflow.
- The resulting report contains six live agent decisions, per-decision policy outcomes, aggregate pass/blocked counts, response latency, and explicitly labelled scenario-modelled drawdown.
- Clean production browser verification on revision `97003b37c2bad948190e7f242381658f3188e4f1` completed the required endpoint → policy → six decisions → report flow, generated `cnr_5ab58552`, retained it after reload, found no demo language, and found no browser warnings/errors.
- The HTTP adapter accepts only bounded JSON scenarios, rejects malformed or oversized input, rate limits decision calls, emits restrictive response headers, and has a local health/manifest/valid-and-invalid-decision smoke test.
- Northstar wins the fixture-only CLI evaluation. In the live four-candidate workflow, Harbor narrowly wins after its HTTP handshake and six validated decisions.
- Public clean-browser verification shows Harbor in Live trial before probation as an `UNVERIFIED` reference agent, then transitioning through handshake, testing, evaluation, and revocation states.
- A high-contrast Canary bird/signal SVG is publicly served as both the favicon and the in-product brand mark; the verified release bundle is `index-BW5uIfNs.js`.
- Unit suite passes with 19 tests, including a regression proving the website report model has no authority or drift fields. TypeScript/Vite build and lint pass; a complete fresh `npm run check` remains required immediately before release.
- Ten evaluation runs produce the same report identity and selected strategy, with a 100% enforcement pass rate and zero unsafe executions.
- `npm audit` reports zero known vulnerabilities; all 227 installed packages have verified registry signatures and 90 have verified attestations.
- Browser QA exercised the redesigned tabbed interface and autonomous run through revocation, confirmed report `cnr_749197ea`, found no console warnings/errors, and confirmed no page-level overflow at 390 x 844.
- Browser QA exercised mandate setup, invalid-input rejection, saved policy, probation, and automatic revocation; the current configuration is session-only and still simulation-backed.
- Public repository: https://github.com/nftkingiii/canary-orion-agent
- Railway deployment: https://agent-canary.up.railway.app
- Deployed product-only revision: `97003b37c2bad948190e7f242381658f3188e4f1`; `/healthz` reports the same revision and `externalAgentIntake: true`.
- A repository scan found no common secret patterns outside generated dependencies/build output.

## Current gaps

- X and Discord/Telegram project links are not prepared yet.
- Wallet registration, ignition fee payment, and final submission require the user's wallet and approval.
- No live data feed, wallet flow, contract, or transaction exists; these are not claimed and are not shown as requirements in the supplied rules.
- The evaluation scenarios and outcome model remain deterministic; there is no independent live market-performance proof.
- Public external agents must be unauthenticated because Canary intentionally rejects credentials in URLs and does not yet provide encrypted server-side credential storage.
- DNS validation precedes `fetch`; the current Node implementation still has a DNS-rebinding time-of-check/time-of-use residual documented in `THREAT_MODEL.md`.

## Next actions

1. Create the X and Discord/Telegram project presence and prepare submission copy/media.
2. Register the submitting wallet, complete the ignition fee, and submit before the deadline.
3. Recruit one independent agent developer to implement the documented adapter and preserve the first third-party report as product evidence.
4. Add live data or a scoped testnet enforcement path only if it improves the product and can be verified honestly; it is not currently treated as mandatory.
