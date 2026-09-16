#!/usr/bin/env node
/**
 * Builds evidence/receipt.json from a completed run.
 *
 * A receipt binds candidate identity, profile and corpus versions, the
 * execution environment, and one outcome per pinned expectation. It records
 * what was observed. It does not approve anything.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS = resolve(ROOT, 'evidence', 'results.json');
const CORPUS = resolve(ROOT, 'expectations', 'expected-v1.json');
const OUT = resolve(ROOT, 'evidence', process.env.RECEIPT_OUT ?? 'receipt.json');

const STATEMENT =
  'Structural validity is not semantic approval. This receipt records what the ' +
  'listed structural checks observed against one candidate at one moment. It does ' +
  'not certify that the figures on the board are correct, that the underlying ' +
  'delivery data is fit for a decision, or that this candidate is approved for ' +
  'release. Business meaning and release authority remain with named humans.';

if (!existsSync(RESULTS)) {
  console.error(`no run to receipt: ${RESULTS} is missing. Run the suite first.`);
  process.exit(2);
}

const corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));
const results = JSON.parse(readFileSync(RESULTS, 'utf8'));
const candidateUrl =
  process.env.TARGET_URL ?? 'https://s4u-methodology.pages.dev/demo/delivery-flow.html';

/** Flatten the Playwright JSON report into { id -> observation }. */
function flatten(suites, acc = []) {
  for (const s of suites ?? []) {
    for (const spec of s.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const last = t.results?.[t.results.length - 1] ?? {};
        acc.push({
          title: spec.title,
          file: s.file ?? s.title,
          status: t.status,
          resultStatus: last.status,
          durationMs: last.duration ?? 0,
          annotations: t.annotations ?? [],
          errors: (last.errors ?? []).map((e) => (e.message ?? '').split('\n').slice(0, 6).join('\n')),
        });
      }
    }
    flatten(s.suites, acc);
  }
  return acc;
}

const observations = flatten(results.suites);

function outcomeFor(caseId) {
  const obs = observations.filter((o) => o.title.startsWith(caseId));
  if (obs.length === 0) {
    return {
      outcome: 'inapplicable',
      detail: 'no test in this run is bound to this expectation id',
    };
  }
  const o = obs[0];
  const cannotAssess = o.annotations.find((a) => a.type === 'cannot-assess');
  if (cannotAssess) {
    return { outcome: 'cannot-assess', detail: cannotAssess.description, observation: o };
  }
  if (o.resultStatus === 'skipped' || o.status === 'skipped') {
    const skip = o.annotations.find((a) => a.type === 'skip');
    return {
      outcome: 'cannot-assess',
      detail: skip?.description ?? 'the test did not execute; no reason was recorded',
      observation: o,
    };
  }
  if (o.status === 'expected' && o.resultStatus === 'passed') {
    return { outcome: 'passed', detail: null, observation: o };
  }
  return {
    outcome: 'failed',
    detail: o.errors[0] ?? `status=${o.status}/${o.resultStatus}`,
    observation: o,
  };
}

const res = await fetch(candidateUrl, { redirect: 'follow' });
const html = await res.text();
const sha256 = createHash('sha256').update(html).digest('hex');

const browser = await chromium.launch();
const browserVersion = browser.version();
await browser.close();

const pwVersion = JSON.parse(
  readFileSync(resolve(ROOT, 'node_modules', '@playwright', 'test', 'package.json'), 'utf8'),
).version;

let gitCommit = null;
try {
  gitCommit = execSync('git rev-parse HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  gitCommit = null;
}

const cases = corpus.cases.map((c) => {
  const r = outcomeFor(c.id);
  return {
    id: c.id,
    surface: c.surface,
    kind: c.kind,
    title: c.title,
    outcome: r.outcome,
    detail: r.detail,
    duration_ms: r.observation?.durationMs ?? null,
    bound_test: r.observation?.title ?? null,
  };
});

const tally = cases.reduce((a, c) => ((a[c.outcome] = (a[c.outcome] ?? 0) + 1), a), {});
const unbound = observations
  .filter((o) => !corpus.cases.some((c) => o.title.startsWith(c.id)))
  .map((o) => ({ title: o.title, status: o.status }));

const receipt = {
  statement: STATEMENT,
  receipt_version: 'ui-receipt-1',
  generated_at: new Date().toISOString(),
  candidate: {
    url: candidateUrl,
    resolved_url: res.url,
    http_status: res.status,
    sha256_html: sha256,
    bytes: Buffer.byteLength(html),
    note:
      candidateUrl.includes('127.0.0.1') || candidateUrl.includes('localhost')
        ? 'This run was executed against a locally served, deliberately mutated copy of the candidate (adverse oracle run). It is not a validation of the published page.'
        : 'Published candidate fetched over the network at receipt time; the page may change between runs.',
  },
  profile_version: corpus.profile_version,
  corpus: {
    version: corpus.corpus_version,
    author: corpus.author,
    reviewer: corpus.reviewer,
    reviewer_note:
      corpus.reviewer === 'pending'
        ? 'The expected-result corpus has NOT been independently reviewed. Until a named reviewer signs it, these outcomes are self-checked, not independently validated.'
        : null,
    case_count: corpus.cases.length,
  },
  environment: {
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    playwright_test: pwVersion,
    browser: browserVersion,
    browser_channel: 'chromium (bundled)',
    retries_configured: 0,
    workers: 1,
    git_commit: gitCommit,
  },
  run: {
    started_at: results.stats?.startTime ?? null,
    duration_ms: results.stats?.duration ?? null,
    reporter_expected: results.stats?.expected ?? null,
    reporter_unexpected: results.stats?.unexpected ?? null,
    reporter_skipped: results.stats?.skipped ?? null,
    reporter_flaky: results.stats?.flaky ?? null,
  },
  tally: {
    passed: tally.passed ?? 0,
    failed: tally.failed ?? 0,
    'cannot-assess': tally['cannot-assess'] ?? 0,
    inapplicable: tally.inapplicable ?? 0,
  },
  cases,
  unbound_tests: unbound,
  open_defects_in_candidate: corpus.open_defects ?? [],
  corpus_amendments: corpus.amendments ?? [],
  not_claimed: [
    'semantic correctness of any figure on the board',
    'fitness of the underlying delivery data for any decision',
    'coverage of surfaces other than the UI',
    'release readiness or approval of the candidate',
  ],
};

writeFileSync(OUT, JSON.stringify(receipt, null, 2) + '\n');
console.log(`receipt: ${OUT}`);
console.log(
  `candidate ${candidateUrl}\n  sha256 ${sha256}\n  ` +
    Object.entries(receipt.tally)
      .map(([k, v]) => `${k}=${v}`)
      .join(' · '),
);
