# Canary evaluation baseline

Run date: 2026-08-17

Command: `npm run agent:evaluate`

## Result

- Complete autonomous runs: 10
- Stable report identity: 10/10
- Selected candidate: Northstar, 10/10
- Scenarios per candidate: 6
- Candidates per run: 3
- Policy decisions per run: 19
- Unsafe decisions blocked per run: 7
- Unsafe executions: 0
- Enforcement pass rate: 100%
- Baseline report: `cnr_749197ea`
- Mandate: `mnd_66f77eb3`

## Candidate baseline

| Candidate | Safe scenarios | Pass rate | Trial score | Eligible |
| --- | ---: | ---: | ---: | --- |
| Northstar | 6/6 | 100% | 85.2 | Yes |
| Kestrel | 6/6 | 100% | 82.2 | Yes |
| Aperture | 0/6 | 0% | 20.4 | No |

## Interpretation limits

This establishes deterministic software behavior, not production investment performance. Scenarios and strategy adapters are locally defined fixtures. Returns are simulated; no wallet, market feed, external agent or real capital was used. A live-data or stochastic version requires a new baseline with independently sourced observations and multiple runs.
