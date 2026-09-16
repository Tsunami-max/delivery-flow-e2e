# delivery-flow-e2e

A governed Playwright + TypeScript suite validating the S4U delivery-flow
dashboard demo (`https://s4u-methodology.pages.dev/demo/delivery-flow.html`)
against an expected-result corpus that was pinned before the tests were written.

## Governance model

**Who pins expectations.** A human owner authors `expectations/expected-v1.json`
first, from the published Appendix P specification. Every number in the suite is
read out of that file by case id; a spec carries no expected value of its own, so
it cannot quietly agree with whatever the page renders. Corpus changes are logged
in `amendments` with a reason — two already are, both raised by the first run.

**Who reviews generated tests.** The specs were drafted by an AI agent from a
human brief and are pending human review. The corpus field `reviewer` reads
`"pending"`, and the receipt repeats that in plain words: until a named reviewer
signs the corpus, these outcomes are self-checked, not independently validated.

**What the receipt does.** `evidence/receipt.json` binds candidate identity (URL
plus sha256 of the fetched HTML), profile and corpus versions, the execution
environment, and one outcome per pinned case — `passed`, `failed`,
`cannot-assess` or `inapplicable`. It also carries the two open accessibility
defects found in the candidate, so a green run never reads as a clean page.

**What the receipt does not claim.** Structural validity is not semantic
approval. It does not certify that any figure on the board is correct, that the
underlying data is fit for a decision, that surfaces other than the UI were
touched, or that the candidate is approved for release.

**Discipline.** `retries: 0` — a flaky result stays a result. No skip without a
reason string; the one unassessable case (UI-016, offline rendering) is recorded
as `cannot-assess`, never dropped. Traces are retained on failure.
`evidence/mutation-proof.md` shows the suite going red against two mutated copies
and green again afterwards, from real output.

**How AI was used.** Tests drafted by an AI agent under a human brief;
expectations authored first and separately; every run pasted, not narrated.

## Commands

```
npm test          # baseline run against the published candidate
npm run test:mutated   # adverse run; requires a RED result
npm run receipt        # regenerate evidence/receipt.json from evidence/results.json
npm run typecheck
```

`node scripts/run-mutated.mjs --mutation=drop-chip --port=8788` runs the second
mutation. `TARGET_URL` overrides the candidate for any run.

## Layout

| Path | What it holds |
|---|---|
| `expectations/expected-v1.json` | pinned expected results, amendments, open defects |
| `tests/corpus.ts` | typed loader; fails if a spec references an unpinned field |
| `tests/dashboard.spec.ts` | structure, provenance, verdicts, interaction, hygiene |
| `tests/not-assessed.spec.ts` | the not-assessed-is-not-zero cases, and the cannot-assess case |
| `tests/a11y.spec.ts` | keyboard operability of folds, axe smoke against a recorded baseline |
| `mutation/serve-mutated.mjs` | fetches the candidate once, serves a named mutation locally |
| `scripts/run-mutated.mjs` | adverse driver; exits non-zero if the suite stays green |
| `scripts/receipt.mjs` | builds the receipt from the Playwright JSON report |
| `evidence/` | `results.json`, `results-mutated.json`, `receipt.json`, `mutation-proof.md` |

## Known open defects in the candidate

| id | rule | impact | nodes | status |
|---|---|---|---|---|
| A11Y-001 | color-contrast | serious | 34 | open, baselined, not waived |
| A11Y-002 | summary-name | serious | 22 | open, baselined, not waived |

UI-015 gates on *new* serious violations. The two above are carried in every
receipt so that they cannot be lost behind a green run.
