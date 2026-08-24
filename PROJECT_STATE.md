# Canary project state

Updated: 2026-08-24

## Goal

Build a standalone autonomous risk-governance agent for the Orion Agents Builder Hackathon. Canary tests competing financial strategies under one mandate, grants simulated bounded authority to the safest eligible performer, and revokes it before an unsafe action executes.

## Current milestone

Operator workflow and a bounded reference-agent adapter are implemented locally. Production deployment verification and submission preparation remain outstanding.

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
- The HTTP adapter accepts only bounded JSON scenarios, rejects malformed or oversized input, rate limits decision calls, emits restrictive response headers, and has a local health/manifest/valid-and-invalid-decision smoke test.
- Northstar wins the illustrative preservation mandate because lower drawdown and perfect policy compliance outweigh higher-return candidates.
- `npm run check` passes: lint, nine tests, ten deterministic evaluation runs, TypeScript and production build.
- Ten evaluation runs produce the same report identity and selected strategy, with a 100% enforcement pass rate and zero unsafe executions.
- `npm audit` reports zero known vulnerabilities; all 227 installed packages have verified registry signatures and 90 have verified attestations.
- Browser QA exercised the redesigned tabbed interface and autonomous run through revocation, confirmed report `cnr_749197ea`, found no console warnings/errors, and confirmed no page-level overflow at 390 x 844.
- Browser QA exercised mandate setup, invalid-input rejection, saved policy, probation, and automatic revocation; the current configuration is session-only and still simulation-backed.
- Public repository: https://github.com/nftkingiii/canary-orion-agent
- Railway deployment: https://agent-canary.up.railway.app
- A repository scan found no common secret patterns outside generated dependencies/build output.

## Current gaps

- X and Discord/Telegram project links are not prepared yet.
- Wallet registration, ignition fee payment, and final submission require the user's wallet and approval.
- No live data feed, wallet flow, contract, or transaction exists; these are not claimed and are not shown as requirements in the supplied rules.
- Third-party candidate intake remains an unimplemented integration boundary; the UI labels it as such. The only networked candidate is Harbor, served by Canary itself.
- Railway is serving the reference-adapter revision: public `/healthz`, manifest, a valid decision, and malformed-decision rejection were read back on 2026-08-24. Browser QA completed Harbor’s manifest handshake, six decisions, comparison with the three local fixtures, promotion, and revocation without console errors.

## Next actions

1. Create the X and Discord/Telegram project presence and prepare submission copy/media.
2. Register the submitting wallet, complete the ignition fee, and submit before the deadline.
3. Add a third-party or Orion-compatible candidate endpoint only if a verified contract becomes available; retain the same schema validation and fail-closed behavior.
4. Add live data or a scoped testnet enforcement path only if it improves the demo and can be verified honestly; it is not currently treated as mandatory.
