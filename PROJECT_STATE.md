# Canary project state

Updated: 2026-08-18

## Goal

Build a standalone autonomous risk-governance agent for the Orion Agents Builder Hackathon. Canary tests competing financial strategies under one mandate, grants simulated bounded authority to the safest eligible performer, and revokes it before an unsafe action executes.

## Current milestone

Operator workflow MVP implemented, redesigned, published, and deployed. Submission preparation remains outstanding.

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
- Live candidate intake remains an unimplemented integration boundary; the UI labels it as such and makes no external endpoint calls.
- The Content Security Policy is present in the static HTML; production response headers still depend on the eventual host.

## Next actions

1. Redeploy the redesigned `main` revision and verify the public workflow and assets.
2. Create the X and Discord/Telegram project presence and prepare submission copy/media.
3. Register the submitting wallet, complete the ignition fee, and submit before the deadline.
4. Add live data or a scoped testnet enforcement path only if it improves the demo and can be verified honestly; it is not currently treated as mandatory.
