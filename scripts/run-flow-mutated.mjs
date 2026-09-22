#!/usr/bin/env node
// Serve only three explicit demo assets; mutate a scratch buffer, never the source checkout.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
if(!process.env.CANDIDATE_DIR)throw new Error('Set CANDIDATE_DIR to the reviewed demo asset directory');
const names=['delivery-flow.html','flow-profile.js','work-policy.js'];
const assets=Object.fromEntries(names.map(name=>[name,readFileSync(resolve(process.env.CANDIDATE_DIR,name))]));
const original=assets['flow-profile.js'].toString();
const boundary='if(r.attempt===1)initial.set(r.item_id,r);';
if(original.split(boundary).length!==2)throw new Error('Expected one initial-attempt boundary; inspect adapter before mutating');
assets['flow-profile.js']=Buffer.from(original.replace(boundary,'initial.set(r.item_id,r);'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const server=createServer((req,res)=>{
  const name=new URL(req.url,'http://127.0.0.1').pathname.slice(1);
  if(!names.includes(name)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html':'text/javascript'});res.end(assets[name]);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const target=`http://127.0.0.1:${server.address().port}/delivery-flow.html`;
try {
  const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','tests/flow-v2.spec.ts','--grep','UI-022'],{
    stdio:'inherit',env:{...process.env,EXPECTED_CORPUS:'expected-v2',TARGET_URL:target,CANDIDATE_KIND:'mutation',
      PLAYWRIGHT_JSON_OUTPUT_NAME:'evidence/results-v2-mutated.json'}});
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
  const report=JSON.parse(readFileSync('evidence/results-v2-mutated.json','utf8'));
  const observations=[];
  function walk(suites){for(const suite of suites??[]){for(const spec of suite.specs??[])observations.push(...(spec.tests??[]).map(t=>({title:spec.title,...t})));walk(suite.suites);}}
  walk(report.suites);
  const observed=observations.length===1&&observations[0].title.startsWith('UI-022 ')
    &&observations[0].results?.at(-1)?.status==='failed'
    &&observations[0].results.at(-1).errors?.some(e=>e.message?.includes('50%'));
  const witness={mutation:'erase initial-attempt selection',target,original_sha256:hash(Buffer.from(original)),
    mutant_sha256:hash(assets['flow-profile.js']),expected_test:'UI-022',exit_code:code,detected:code===1&&observed,
    note:'Only this intentional mutant and assertion were exercised. This does not establish universal oracle strength.'};
  writeFileSync('evidence/mutation-v2.json',JSON.stringify(witness,null,2)+'\n');
  if(!witness.detected)throw new Error('Mutation was not detected by the expected assertion');
} finally {await new Promise(resolve=>server.close(resolve));}
