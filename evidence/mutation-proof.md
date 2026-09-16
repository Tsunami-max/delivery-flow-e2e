# Mutation proof — the suite can fail

Purpose: a green suite is only evidence if it is capable of going red for the
defect it claims to guard. This record is pasted from actual run output. No
step below is narrated from intent.

Candidate: `https://s4u-methodology.pages.dev/demo/delivery-flow.html`
Candidate sha256 (fetched once, cached in `mutation/.cache/candidate.html`):
`7da3126db4d732a524378bdf128e910a8a83642f1f32863cb6713cb908f08074`

The harness (`mutation/serve-mutated.mjs`) fetches that page once, applies one
named edit to the cached source, and serves the result on localhost. The suite
is pointed at it through `TARGET_URL`. `scripts/run-mutated.mjs` requires a
non-zero Playwright exit; a green adverse run is reported as a defect in the
suite.

---

## Step 1 — Baseline, live candidate: GREEN

```
$ npm test
  ✓   1 [chromium] › tests/a11y.spec.ts:11:5 › UI-011 every details.more fold is reachable and operable by keyboard (2.2s)
  ✓   2 [chromium] › tests/a11y.spec.ts:33:5 › UI-015 a11y smoke: no serious or critical axe violations beyond the recorded baseline (2.6s)
  ✓   3 [chromium] › tests/dashboard.spec.ts:24:7 › Candidate identity and framing › UI-001 the demo provenance banner is present (497ms)
  ✓   4 [chromium] › tests/dashboard.spec.ts:33:7 › Candidate identity and framing › UI-002 all ten screens render a verdict sentence (768ms)
  ✓   5 [chromium] › tests/dashboard.spec.ts:46:7 › Candidate identity and framing › UI-014 every left-rail link resolves to a screen that exists (624ms)
  ✓   6 [chromium] › tests/dashboard.spec.ts:82:7 › Verdicts state the absence, not a zero › UI-003 Delivery today says none of the landings carries a verdict (438ms)
  ✓   7 [chromium] › tests/dashboard.spec.ts:91:7 › Verdicts state the absence, not a zero › UI-006 Decisions reports 7 mandates with a receipt and 4 refuted (389ms)
  ✓   8 [chromium] › tests/dashboard.spec.ts:108:7 › Readiness blockers are named, not scored › UI-005 Business intent shows exactly six blockers with one open conflict (460ms)
  ✓   9 [chromium] › tests/dashboard.spec.ts:130:7 › Provenance is carried by every figure › UI-007 every dial carries exactly one provenance chip from the vocabulary (484ms)
  ✓  10 [chromium] › tests/dashboard.spec.ts:149:7 › Provenance is carried by every figure › UI-008 every screen carries at least one chart (554ms)
  ✓  11 [chromium] › tests/dashboard.spec.ts:159:7 › Interaction › UI-009 the trace picker switches the heading and the state line (2.0s)
  ✓  12 [chromium] › tests/dashboard.spec.ts:182:7 › Interaction › UI-010 the theme toggle flips data-theme and returns (458ms)
  ✓  13 [chromium] › tests/dashboard.spec.ts:194:7 › Rendering hygiene › UI-012 no rendered text leaks undefined or NaN (362ms)
  ✓  14 [chromium] › tests/not-assessed.spec.ts:16:5 › UI-004 the Rework share dial reads the literal state, never a number (415ms)
  ✓  15 [chromium] › tests/not-assessed.spec.ts:49:5 › UI-013 no not-assessed state badge renders a numeral (360ms)
  -  16 [chromium] › tests/not-assessed.spec.ts:62:5 › UI-016 the board renders with no third-party network access

  1 skipped
  15 passed (13.8s)
```

Playwright exit code: `0`.

---

## Step 2 — Mutation A `rework-zero`: RED

Edit applied to the cached candidate source (one replacement):

```diff
- dial("Rework share", NA, "", NA,  `${T.recent40.no_checks} of 40 recent heads carry no verdict`)
+ dial("Rework share", 0, " %", "observed", `${T.recent40.no_checks} of 40 recent heads carry no verdict`)
```

This is the regression the board exists to prevent: an input that was never
collected re-rendered as an observed zero.

```
$ npm run test:mutated
mutation      : rework-zero
describe      : the Rework share dial is re-rendered as an observed 0 % instead of the not-assessed state
sha256 origin : 7da3126db4d732a524378bdf128e910a8a83642f1f32863cb6713cb908f08074
sha256 served : 1e24f98f5d4dbe3cb85652bc1d01a8819a005a36ff408c502e9e9093d30edc39
serving       : http://127.0.0.1:8787/

  ✓   1 [chromium] › tests/a11y.spec.ts:11:5 › UI-011 every details.more fold is reachable and operable by keyboard (1.3s)
  ✓   2 [chromium] › tests/a11y.spec.ts:33:5 › UI-015 a11y smoke: no serious or critical axe violations beyond the recorded baseline (1.6s)
  ✓   3 [chromium] › tests/dashboard.spec.ts:24:7 › Candidate identity and framing › UI-001 the demo provenance banner is present (344ms)
  ✓   4 [chromium] › tests/dashboard.spec.ts:33:7 › Candidate identity and framing › UI-002 all ten screens render a verdict sentence (642ms)
  ✓   5 [chromium] › tests/dashboard.spec.ts:46:7 › Candidate identity and framing › UI-014 every left-rail link resolves to a screen that exists (642ms)
  ✓   6 [chromium] › tests/dashboard.spec.ts:82:7 › Verdicts state the absence, not a zero › UI-003 Delivery today says none of the landings carries a verdict (393ms)
  ✓   7 [chromium] › tests/dashboard.spec.ts:91:7 › Verdicts state the absence, not a zero › UI-006 Decisions reports 7 mandates with a receipt and 4 refuted (355ms)
  ✓   8 [chromium] › tests/dashboard.spec.ts:108:7 › Readiness blockers are named, not scored › UI-005 Business intent shows exactly six blockers with one open conflict (516ms)
  ✓   9 [chromium] › tests/dashboard.spec.ts:130:7 › Provenance is carried by every figure › UI-007 every dial carries exactly one provenance chip from the vocabulary (412ms)
  ✓  10 [chromium] › tests/dashboard.spec.ts:149:7 › Provenance is carried by every figure › UI-008 every screen carries at least one chart (458ms)
  ✓  11 [chromium] › tests/dashboard.spec.ts:159:7 › Interaction › UI-009 the trace picker switches the heading and the state line (1.9s)
  ✓  12 [chromium] › tests/dashboard.spec.ts:182:7 › Interaction › UI-010 the theme toggle flips data-theme and returns (462ms)
  ✓  13 [chromium] › tests/dashboard.spec.ts:194:7 › Rendering hygiene › UI-012 no rendered text leaks undefined or NaN (475ms)
  ✘  14 [chromium] › tests/not-assessed.spec.ts:16:5 › UI-004 the Rework share dial reads the literal state, never a number (10.4s)
  ✓  15 [chromium] › tests/not-assessed.spec.ts:49:5 › UI-013 no not-assessed state badge renders a numeral (486ms)
  -  16 [chromium] › tests/not-assessed.spec.ts:62:5 › UI-016 the board renders with no third-party network access

  1 failed
  1 skipped
  14 passed (22.3s)

adverse run: mutation="rework-zero" playwright exit=1
adverse oracle satisfied: the suite detected the mutation.
```

Failure detail, verbatim:

```
  1) [chromium] › tests/not-assessed.spec.ts:16:5 › UI-004 the Rework share dial reads the literal state, never a number 

    Error: a not-assessed input must render as its state, not as a figure

    expect(locator).toHaveText(expected) failed

    Locator:  getByRole('group', { name: /^Rework share:/ }).locator('.v')
    Expected: "not assessed"
    Received: "0 %"
    Timeout:  10000ms

    Call log:
      - a not-assessed input must render as its state, not as a figure getByRole('group', { name: /^Rework share:/ }).locator('.v') with timeout 10000ms
      - waiting for getByRole('group', { name: /^Rework share:/ }).locator('.v')
        24 × locator resolved to <div class="v ">…</div>
           - unexpected value "0 %"


      22 |
      23 |   // 1. The value is the pinned state word.
    > 24 |   await expect(value, 'a not-assessed input must render as its state, not as a figure').toHaveText(expectedText);
         |                                                                                         ^
      25 |
      26 |   // 2. It is marked as a not-assessed value, not styled as a measurement.
      27 |   if (field<boolean>('UI-004', 'value_has_na_class')) {
        at /Users/soft4u/Development/delivery-flow-e2e/tests/not-assessed.spec.ts:24:89
```

Exactly one case changed state: **UI-004**. The other fifteen held. The
mutation was killed by the case that is pinned to it, not by collateral noise.

---

## Step 3 — Mutation B `drop-chip`: RED

Edit applied (provenance chip removed from the dial template):

```diff
- <div class="k"><span>${esc(label)}</span>${chip(prov)}</div>
+ <div class="k"><span>${esc(label)}</span></div>
```

```
$ node scripts/run-mutated.mjs --mutation=drop-chip --port=8788
mutation      : drop-chip
describe      : the provenance chip is removed from every dial
sha256 origin : 7da3126db4d732a524378bdf128e910a8a83642f1f32863cb6713cb908f08074
sha256 served : df21d1f98c73f224cf7b2f3b91ca607f1e163d231743e0399ac67ec604391915

  ✓   1 [chromium] › tests/a11y.spec.ts:11:5 › UI-011 every details.more fold is reachable and operable by keyboard (1.4s)
  ✓   2 [chromium] › tests/a11y.spec.ts:33:5 › UI-015 a11y smoke: no serious or critical axe violations beyond the recorded baseline (1.7s)
  ✓   3 [chromium] › tests/dashboard.spec.ts:24:7 › Candidate identity and framing › UI-001 the demo provenance banner is present (333ms)
  ✓   4 [chromium] › tests/dashboard.spec.ts:33:7 › Candidate identity and framing › UI-002 all ten screens render a verdict sentence (601ms)
  ✓   5 [chromium] › tests/dashboard.spec.ts:46:7 › Candidate identity and framing › UI-014 every left-rail link resolves to a screen that exists (492ms)
  ✓   6 [chromium] › tests/dashboard.spec.ts:82:7 › Verdicts state the absence, not a zero › UI-003 Delivery today says none of the landings carries a verdict (328ms)
  ✓   7 [chromium] › tests/dashboard.spec.ts:91:7 › Verdicts state the absence, not a zero › UI-006 Decisions reports 7 mandates with a receipt and 4 refuted (290ms)
  ✓   8 [chromium] › tests/dashboard.spec.ts:108:7 › Readiness blockers are named, not scored › UI-005 Business intent shows exactly six blockers with one open conflict (382ms)
  ✘   9 [chromium] › tests/dashboard.spec.ts:130:7 › Provenance is carried by every figure › UI-007 every dial carries exactly one provenance chip from the vocabulary (353ms)
  ✓  10 [chromium] › tests/dashboard.spec.ts:149:7 › Provenance is carried by every figure › UI-008 every screen carries at least one chart (368ms)
  ✓  11 [chromium] › tests/dashboard.spec.ts:159:7 › Interaction › UI-009 the trace picker switches the heading and the state line (1.9s)
  ✓  12 [chromium] › tests/dashboard.spec.ts:182:7 › Interaction › UI-010 the theme toggle flips data-theme and returns (498ms)
  ✓  13 [chromium] › tests/dashboard.spec.ts:194:7 › Rendering hygiene › UI-012 no rendered text leaks undefined or NaN (311ms)
  ✘  14 [chromium] › tests/not-assessed.spec.ts:16:5 › UI-004 the Rework share dial reads the literal state, never a number (10.3s)
  ✓  15 [chromium] › tests/not-assessed.spec.ts:49:5 › UI-013 no not-assessed state badge renders a numeral (320ms)
  -  16 [chromium] › tests/not-assessed.spec.ts:62:5 › UI-016 the board renders with no third-party network access

  2 failed
  1 skipped
  13 passed (21.4s)

adverse run: mutation="drop-chip" playwright exit=1
adverse oracle satisfied: the suite detected the mutation.
```

Two cases went red: **UI-007** (every dial carries exactly one provenance chip)
and **UI-004** (which also asserts the Rework dial's chip). Expected: removing
the chip template affects both pinned assertions.

---

## Step 4 — Restored, live candidate: GREEN

Nothing was changed in the suite between step 2/3 and step 4; only the target
was pointed back at the published candidate.

```
$ npm test
  ✓   1 [chromium] › tests/a11y.spec.ts:11:5 › UI-011 every details.more fold is reachable and operable by keyboard (1.6s)
  ✓   2 [chromium] › tests/a11y.spec.ts:33:5 › UI-015 a11y smoke: no serious or critical axe violations beyond the recorded baseline (1.8s)
  ✓   3 [chromium] › tests/dashboard.spec.ts:24:7 › Candidate identity and framing › UI-001 the demo provenance banner is present (427ms)
  ✓   4 [chromium] › tests/dashboard.spec.ts:33:7 › Candidate identity and framing › UI-002 all ten screens render a verdict sentence (682ms)
  ✓   5 [chromium] › tests/dashboard.spec.ts:46:7 › Candidate identity and framing › UI-014 every left-rail link resolves to a screen that exists (568ms)
  ✓   6 [chromium] › tests/dashboard.spec.ts:82:7 › Verdicts state the absence, not a zero › UI-003 Delivery today says none of the landings carries a verdict (382ms)
  ✓   7 [chromium] › tests/dashboard.spec.ts:91:7 › Verdicts state the absence, not a zero › UI-006 Decisions reports 7 mandates with a receipt and 4 refuted (458ms)
  ✓   8 [chromium] › tests/dashboard.spec.ts:108:7 › Readiness blockers are named, not scored › UI-005 Business intent shows exactly six blockers with one open conflict (418ms)
  ✓   9 [chromium] › tests/dashboard.spec.ts:130:7 › Provenance is carried by every figure › UI-007 every dial carries exactly one provenance chip from the vocabulary (444ms)
  ✓  10 [chromium] › tests/dashboard.spec.ts:149:7 › Provenance is carried by every figure › UI-008 every screen carries at least one chart (432ms)
  ✓  11 [chromium] › tests/dashboard.spec.ts:159:7 › Interaction › UI-009 the trace picker switches the heading and the state line (2.1s)
  ✓  12 [chromium] › tests/dashboard.spec.ts:182:7 › Interaction › UI-010 the theme toggle flips data-theme and returns (675ms)
  ✓  13 [chromium] › tests/dashboard.spec.ts:194:7 › Rendering hygiene › UI-012 no rendered text leaks undefined or NaN (472ms)
  ✓  14 [chromium] › tests/not-assessed.spec.ts:16:5 › UI-004 the Rework share dial reads the literal state, never a number (453ms)
  ✓  15 [chromium] › tests/not-assessed.spec.ts:49:5 › UI-013 no not-assessed state badge renders a numeral (385ms)
  -  16 [chromium] › tests/not-assessed.spec.ts:62:5 › UI-016 the board renders with no third-party network access

  1 skipped
  15 passed (12.6s)
```

Playwright exit code: `0`.

---

## What this proves and does not prove

Proves: the suite distinguishes a not-assessed state from a zero, and a
present provenance chip from an absent one, on this candidate, in this browser.

Does not prove: that the suite would catch any other regression; that the
figures on the board are correct; that the mutations are representative of real
defects. Two mutations were run. That is the extent of the evidence.


## Re-run after the candidate's accessibility fixes — 2026-09-16 evening

Candidate `da439f75…7691196` (post-fix). Baseline: 15 passed, 1 cannot-assess. Mutation
`rework-zero`: **1 failed (UI-004), 14 passed, 1 skipped, exit 1** — only the guarding case flipped.
Restored: green. Real console output in `evidence/figures/run-green.txt` and `run-mutated.txt`;
rendered as `card-green.png` / `card-mutated.png`.

Incident worth keeping: an earlier run reported two failures on the mutated copy. The second was
not the mutation — a server from a previous session was still holding port 8787 and serving a
pre-fix copy of the page, and the new server silently failed to bind. The harness now refuses to
run when the port is already in use, and the mutation server fetches the candidate uncached.
A test that runs against the wrong candidate is worse than no test; the receipt binds the digest
for exactly this reason.
