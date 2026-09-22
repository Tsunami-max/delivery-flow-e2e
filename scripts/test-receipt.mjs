import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const target='data:text/html,<p>synthetic receipt fixture</p>';
function run(observations,metadata={candidate_url:target,corpus:'expected-v2'}) {
  const dir=mkdtempSync(join(tmpdir(),'s4u-receipt-'));
  try {
    const results=join(dir,'results.json'),out=join(dir,'receipt.json');
    writeFileSync(results,JSON.stringify({config:{metadata},suites:[{specs:observations}],stats:{}}));
    const result=spawnSync(process.execPath,['scripts/receipt.mjs'],{encoding:'utf8',env:{...process.env,
      EXPECTED_CORPUS:'expected-v2',TARGET_URL:target,PLAYWRIGHT_JSON_OUTPUT_NAME:results,RECEIPT_OUT:out},timeout:15000});
    return {status:result.status,stderr:result.stderr,receipt:result.status===0?JSON.parse(readFileSync(out,'utf8')):null};
  } finally {rmSync(dir,{recursive:true,force:true});}
}
const passed={title:'UI-022 synthetic initial-failure case',tests:[{status:'expected',results:[{status:'passed',attachments:[]}]}]};
test('partial runs never report missing expectations inapplicable or passed',()=>{
  const {status,receipt}=run([passed]);assert.equal(status,0);assert.equal(receipt.tally.passed,1);
  assert.equal(receipt.tally['cannot-assess'],28);assert.equal(receipt.tally.inapplicable,0);
  assert.equal(receipt.candidate.kind,'candidate');assert.match(receipt.candidate.note,/post-run fetch/);
});
test('duplicate observations do not let a first pass hide a later failure',()=>{
  const {receipt}=run([passed,{...passed,tests:[{status:'unexpected',results:[{status:'failed'}]}]}]);
  assert.equal(receipt.cases.find(c=>c.id==='UI-022').outcome,'cannot-assess');
});
test('corpus and target must agree with run metadata',()=>{
  const r=run([passed],{candidate_url:target,corpus:'expected-v1'});assert.notEqual(r.status,0);assert.match(r.stderr,/metadata/);
});
