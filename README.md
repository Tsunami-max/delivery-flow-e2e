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
`cannot-assess` or `inapplicable`. It also carries the accessibility defect history and each recorded status. The two initial
serious defects were subsequently fixed; historical receipts retain their original observations.

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
mutation and `--mutation=fail-share-zero --port=8789` the third. `TARGET_URL` overrides the
candidate for any run. Delete `mutation/.cache/candidate.html` after the candidate changes;
the harness caches it on purpose so that one run compares like with like.

## Layout

| Path | What it holds |
|---|---|
| `expectations/expected-v1.json` | pinned expected results, amendments, open defects |
| `tests/corpus.ts` | typed loader; fails if a spec references an unpinned field |
| `tests/dashboard.spec.ts` | structure, provenance, verdicts, interaction, hygiene |
| `tests/not-assessed.spec.ts` | the not-assessed-is-not-zero cases, and the cannot-assess case |
| `tests/dora.spec.ts` | the five DORA-analogue dials, their not-assessed states, the mapping fold, cost per accepted change |
| `tests/a11y.spec.ts` | keyboard operability of folds, axe smoke against a recorded baseline |
| `mutation/serve-mutated.mjs` | fetches the candidate once, serves a named mutation locally |
| `scripts/run-mutated.mjs` | adverse driver; exits non-zero if the suite stays green |
| `scripts/receipt.mjs` | builds the receipt from the Playwright JSON report |
| `evidence/` | `results.json`, `results-mutated.json`, `receipt.json`, `mutation-proof.md`, `dora-red-first-2026-09-17.txt` |

## Known open defects in the candidate

| id | rule | impact | nodes | status |
|---|---|---|---|---|
| A11Y-001 | color-contrast | serious | 34 | open, baselined, not waived |
| A11Y-002 | summary-name | serious | 22 | open, baselined, not waived |

UI-015 gates on *new* serious violations. The two above are carried in every
receipt so that they cannot be lost behind a green run.


## Prospective flow-profile v2

The v1 corpus remains byte-identical. Select v2 explicitly; it adds first-assessment,
declared-authorship and WIP cases authored before the flow adapter was implemented.
The author is Codex under the owner's mandate; independent corpus review is still pending.

Serve the reviewed methodology `website/static/demo` directory locally, then run:

```sh
EXPECTED_CORPUS=expected-v2 TARGET_URL=http://127.0.0.1:8874/delivery-flow.html \
  PLAYWRIGHT_CHANNEL=chrome PLAYWRIGHT_JSON_OUTPUT_NAME=evidence/results-v2.json npm test
EXPECTED_CORPUS=expected-v2 TARGET_URL=http://127.0.0.1:8874/delivery-flow.html \
  PLAYWRIGHT_JSON_OUTPUT_NAME=evidence/results-v2.json RECEIPT_OUT=receipt-v2.json npm run receipt
npm run typecheck
npm run test:receipts
CANDIDATE_DIR=/absolute/path/to/reviewed/website/static/demo PLAYWRIGHT_CHANNEL=chrome npm run test:flow-mutated
```

Omit `PLAYWRIGHT_CHANNEL` to use the installed bundled Chromium. Chrome uses a disposable
profile, not a user's browser session. The mutation command serves only three explicit assets
from scratch buffers, removes the first-attempt selection in the helper, and requires UI-022
to fail on its 50% expectation. It never edits the candidate checkout. Re-run the unmodified
candidate afterward. The original mutation harness and its historical receipts remain separate.

The v2 local run reports 28 passes and one cannot-assess case: UI-016's existing network
independence expectation remains unassessed. Expanded-fold keyboard and axe checks include the
new content; this does not certify general accessibility. Missing tests and ambiguous duplicate
observations stay cannot-assess. Localhost alone is not evidence of a mutation.

New cases attach response-byte digests for the HTML and helpers they actually received,
including explicitly injected synthetic-model variants. Receipts retain those witnesses and
hash suite source files. Their separate post-run HTML fetch is not proof of executed bytes;
older cases have no response attachment. Receipts record local candidate verification, not
hosted deployment, data fitness, identity authentication or release approval. Historical v1
receipts and expected values are preserved.

The `ci:gates` PR label explicitly requests hosted typecheck and receipt-regression checks on
that PR head. It does not fetch a private methodology checkout or claim UI coverage. Candidate
browser runs and mutation evidence remain separate. Reapply the label after a head change.
