#!/usr/bin/env node
/**
 * Adverse run: start the mutation server, point the suite at it, and REQUIRE
 * a failure. A green adverse run means the suite cannot detect the regression,
 * which is itself a defect in the suite — so this script exits non-zero then.
 */
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=');
    return [k, v];
  }),
);
const mutation = args.mutation ?? 'rework-zero';
const port = Number(args.port ?? 8787);
const expectRed = args.expect !== 'green';

const server = spawn(
  process.execPath,
  [resolve(ROOT, 'mutation', 'serve-mutated.mjs'), `--mutation=${mutation}`, `--port=${port}`],
  { cwd: ROOT, stdio: 'inherit' },
);

const ready = await (async () => {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/__meta`);
      if (r.ok) return await r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
})();

if (!ready) {
  server.kill();
  console.error('mutation server did not come up');
  process.exit(2);
}

const code = await new Promise((done) => {
  const t = spawn('npx', ['playwright', 'test', ...(args.grep ? ['--grep', args.grep] : [])], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      TARGET_URL: `http://127.0.0.1:${port}/`,
      PLAYWRIGHT_JSON_OUTPUT_NAME: 'evidence/results-mutated.json',
    },
  });
  t.on('exit', done);
});

server.kill();

console.log(`\nadverse run: mutation="${mutation}" playwright exit=${code}`);
if (expectRed && code === 0) {
  console.error(
    'ADVERSE RUN FAILED ITS OWN PURPOSE: the suite stayed green against a mutated candidate.',
  );
  process.exit(1);
}
if (expectRed) console.log('adverse oracle satisfied: the suite detected the mutation.');
process.exit(0);
