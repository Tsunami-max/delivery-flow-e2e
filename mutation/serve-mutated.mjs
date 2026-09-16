#!/usr/bin/env node
/**
 * Adverse oracle harness.
 *
 * Fetches the candidate page once, caches it verbatim, applies ONE named
 * mutation to the cached copy, and serves it on localhost. The suite is then
 * pointed at the mutated copy. If the suite still passes, the suite is not
 * evidence.
 *
 *   node mutation/serve-mutated.mjs --mutation=rework-zero --port=8787
 *   node mutation/serve-mutated.mjs --mutation=none          (baseline: served unmodified)
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(HERE, '.cache');
const CACHE = resolve(CACHE_DIR, 'candidate.html');
const CANDIDATE_URL = 'https://s4u-methodology.pages.dev/demo/delivery-flow.html';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);
const port = Number(args.port ?? 8787);
const name = args.mutation ?? 'rework-zero';

/** Each mutation is a single, named, reversible edit to the candidate source. */
const MUTATIONS = {
  none: {
    describe: 'no edit; the cached candidate is served verbatim (baseline control)',
    apply: (html) => html,
  },
  'rework-zero': {
    describe:
      'the Rework share dial is re-rendered as an observed 0 % instead of the not-assessed state',
    from: 'dial("Rework share", NA, "", NA,',
    to: 'dial("Rework share", 0, " %", "observed",',
    apply(html) {
      if (!html.includes(this.from)) throw new Error(`mutation anchor not found: ${this.from}`);
      return html.replace(this.from, this.to);
    },
  },
  'drop-chip': {
    describe: 'the provenance chip is removed from every dial',
    from: '<div class="k"><span>${esc(label)}</span>${chip(prov)}</div>',
    to: '<div class="k"><span>${esc(label)}</span></div>',
    apply(html) {
      if (!html.includes(this.from)) throw new Error(`mutation anchor not found: ${this.from}`);
      return html.replace(this.from, this.to);
    },
  },
};

const mutation = MUTATIONS[name];
if (!mutation) {
  console.error(`unknown mutation "${name}". known: ${Object.keys(MUTATIONS).join(', ')}`);
  process.exit(2);
}

async function candidate() {
  if (existsSync(CACHE) && !args.refresh) return readFileSync(CACHE, 'utf8');
  const res = await fetch(CANDIDATE_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`candidate fetch failed: HTTP ${res.status}`);
  const html = await res.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE, html);
  return html;
}

const original = await candidate();
const mutated = mutation.apply(original);
const sha = (s) => createHash('sha256').update(s).digest('hex');

if (name !== 'none' && mutated === original) {
  console.error('mutation produced no change; refusing to serve a false adverse run');
  process.exit(3);
}

const server = createServer((req, res) => {
  if ((req.url ?? '/').startsWith('/__meta')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        candidate_url: CANDIDATE_URL,
        mutation: name,
        describe: mutation.describe,
        sha256_original: sha(original),
        sha256_served: sha(mutated),
      }),
    );
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(mutated);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`mutation      : ${name}`);
  console.log(`describe      : ${mutation.describe}`);
  console.log(`sha256 origin : ${sha(original)}`);
  console.log(`sha256 served : ${sha(mutated)}`);
  console.log(`serving       : http://127.0.0.1:${port}/`);
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
