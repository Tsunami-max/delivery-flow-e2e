import {test, expect, Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import {corpus, field} from './corpus';
import {TARGET} from './target';
const inputs = JSON.parse(readFileSync(resolve(__dirname, '../expectations/flow-inputs-v2.json'), 'utf8'));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// Change only the explicit synthetic data before the actual page scripts render it.
async function load(page: Page, change?: (model: any) => void) {
  await page.unroute(TARGET);
  if (change) await page.route(TARGET, async route => {
    const response = await route.fetch();
    const html = await response.text();
    const match = html.match(/window.MODEL\s*=\s*(\{.*\});/);
    expect(match, 'candidate must expose its committed synthetic model').not.toBeNull();
    const model = JSON.parse(match![1]);
    change(model);
    const body = html.replace(match![1], JSON.stringify(model).replace(/</g, '\\u003c'));
    await route.fulfill({response, body});
  });
  const responses: Promise<any>[]=[];
  const observe=(response:any)=>{
    if(response.url()===TARGET || /\/(flow-profile|work-policy)\.js(?:\?|$)/.test(response.url()))
      responses.push(response.body().then((body:Buffer)=>({url:response.url(),status:response.status(),sha256:createHash('sha256').update(body).digest('hex'),bytes:body.length})));
  };
  page.on('response',observe);
  await page.goto(TARGET, {waitUntil:'domcontentloaded'});
  await page.locator('#today h1.verdict').waitFor();
  page.off('response',observe);
  await test.info().attach('candidate-assets', {body:JSON.stringify({browser:page.context().browser()?.version(),assets:await Promise.all(responses)}),contentType:'application/json'});
}
function positive(model: any) {
  model.flow_profile = clone(inputs.profile);
  model.flow_windows = {today:clone(inputs.window), stages:clone(inputs.window)};
  model.flow_evidence = {delivery:clone(inputs.delivery), stages:[clone(inputs.first_pass)]};
}
async function openToday(page: Page) {
  const summary=page.locator('#today summary[data-open="Show all landings"]');
  await summary.focus();await page.keyboard.press('Enter');
}

if (corpus.corpus_version === 'expected-v2') {
  test('UI-021 default first-pass fields keep absent initial evidence unassessed',async({page})=>{
    await load(page);
    await expect(page.locator('#time .first-pass')).toHaveCount(field<number>('UI-021','stage_count'));
    for(const cell of await page.locator('#time .first-pass').all()) {
      await expect(cell).toContainText(field<string>('UI-021','value_text'));
      await expect(cell).toContainText(field<string>('UI-021','must_contain'));
    }
    await expect(page.locator('#time')).toContainText(field<string>('UI-021','profile_version'));
    await load(page,m=>{delete m.flow_profile;delete m.flow_windows;delete m.flow_evidence;
      for(const stage of m.time.stages)delete stage.id;
    });
    await expect(page.locator('#time .first-pass')).toHaveCount(field<number>('UI-021','stage_count'));
    for(const cell of await page.locator('#time .first-pass').all())await expect(cell).toContainText(field<string>('UI-021','value_text'));
  });
  test('UI-022 an initial failure remains failed after a corrected later attempt',async({page})=>{
    await load(page,positive);
    const cell=page.locator(`#time .first-pass[data-stage-id="${field<string>('UI-022','stage_id')}"]`);
    for(const text of field<string[]>('UI-022','must_contain'))await expect(cell).toContainText(text);
  });
  test('UI-023 missing criteria and invalid first-pass denominators stay unassessed',async({page})=>{
    for(const variant of field<string[]>('UI-023','invalid_variants')) {
      await load(page,m=>{positive(m);const e=m.flow_evidence.stages[0];
        if(variant==='empty-inventory'){e.eligible_items=[];e.records=[];}
        if(variant==='wrong-criterion')e.criterion_revision='other';
        if(variant==='wrong-profile')e.profile_revision='other';
        if(variant==='below-minimum')m.flow_profile.minimum_sample=3;
        if(variant==='duplicate-attempt')e.records.push(clone(e.records[0]));
      });
      const cell=page.locator('#time .first-pass[data-stage-id="ci"]');
      await expect(cell).toContainText(field<string>('UI-023','value_text'));
      await expect(cell).not.toContainText(field<string>('UI-023','forbidden_value'));
    }
  });
  test('UI-024 missing authorship inputs retain four unassessed class rows and five analogues',async({page})=>{
    await load(page);await openToday(page);
    const table=page.locator('.authorship-breakdown');
    for(const name of field<string[]>('UI-024','classes'))await expect(table.locator(`[data-authorship-class="${name}"]`)).toHaveCount(1);
    for(const name of field<string[]>('UI-024','metrics'))await expect(table).toContainText(name);
    await expect(table.locator('td[data-metric]')).toHaveCount(field<number>('UI-024','missing_cells'));
    for(const cell of await table.locator('td[data-metric]').all())await expect(cell).toContainText(field<string>('UI-024','value_text'));
  });
  test('UI-025 actual authorship grouping computes the five analogues with separate samples',async({page})=>{
    await load(page,positive);await openToday(page);
    const table=page.locator('.authorship-breakdown');
    await expect(table).toContainText(`Population ${field<number>('UI-025','population')}`);
    for(const name of ['human','agent']) {
      const expected=field<Record<string,any>>('UI-025',name);
      const row=table.locator(`[data-authorship-class="${name}"]`);
      await expect(row.locator('[data-provenance]')).toContainText(expected.provenance);
      const mapping: Record<string,string>={lead_time:'lead_hours',frequency:'landings_per_day',change_fail:'change_fail_percent',time_to_fix:'fix_hours',rework:'rework_percent'};
      for(const [metric,key] of Object.entries(mapping)) {
        const cell=row.locator(`[data-metric="${metric}"]`);
        if(expected[key]===null)await expect(cell).toContainText('not assessed');
        else await expect(cell.locator('.metric-value')).toHaveText(new RegExp(`^${expected[key]}(?:\\s|%)`));
      }
    }
    const human=table.locator('[data-authorship-class="human"] [data-metric="rework"]');
    const h=field<Record<string,number>>('UI-025','human');
    await expect(human).toContainText(`sample ${h.rework_sample}`);await expect(human).toContainText(`unknown ${h.rework_unknown}`);
    await expect(table.locator('[data-authorship-class="unknown"] [data-assigned]')).toHaveText(String(field<number>('UI-025','unknown_count')));
    const accessibility=await new AxeBuilder({page}).include('.authorship-breakdown').analyze();
    expect(accessibility.violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
  });
  test('UI-026 conflicting class declarations remain visible as unknown',async({page})=>{
    await load(page,m=>{positive(m);m.flow_evidence.delivery.records.find((r:any)=>r.id===field<string>('UI-026','conflict_item')).authorship.push({authorship_class:'agent',source:'platform-bot'});});
    await openToday(page);const table=page.locator('.authorship-breakdown');
    await expect(table).toContainText(`Population ${field<number>('UI-026','population')}`);
    await expect(table.locator('[data-authorship-class="unknown"] [data-assigned]')).toHaveText(String(field<number>('UI-026','unknown_count')));
    await expect(table.locator('[data-authorship-class="human"] [data-assigned]')).toHaveText(String(field<number>('UI-026','human_count')));
  });
  test('UI-027 incomplete or mismatched populations cannot produce class rates',async({page})=>{
    for(const variant of field<string[]>('UI-027','variants')) {
      await load(page,m=>{positive(m);const d=m.flow_evidence.delivery;
        if(variant==='incomplete')d.complete=false;
        if(variant==='wrong-profile')d.profile_revision='other';
        if(variant==='wrong-window')d.window_id='other';
        if(variant==='duplicate-item')d.records.push(clone(d.records[0]));
        if(variant==='outside-window')d.records[0].landed_at=inputs.window.to;
      });await openToday(page);
      const cells=page.locator('.authorship-breakdown td[data-metric]');
      await expect(cells).toHaveCount(field<number>('UI-027','missing_cells'));
      for(const cell of await cells.all())await expect(cell).toContainText(field<string>('UI-027','value_text'));
    }
  });
  test('UI-028 supplied labels are escaped and provenance does not claim authentication',async({page})=>{
    await load(page,m=>{positive(m);m.flow_profile.stages.find((s:any)=>s.id==='ci').label=field<string>('UI-028','injected_label');});
    const cell=page.locator('#time .first-pass[data-stage-id="ci"]');
    await expect(cell.locator('img')).toHaveCount(field<number>('UI-028','image_count'));
    await expect(cell).toContainText(field<string>('UI-028','injected_label'));
    for(const text of field<string[]>('UI-028','must_contain'))await expect(cell).toContainText(text);
  });
  test('UI-029 WIP proposal remains non-authorizing and names selected batch coverage',async({page})=>{
    await load(page);await openToday(page);const panel=page.locator('.work-policy');
    for(const text of field<string[]>('UI-029','must_contain'))await expect(panel).toContainText(text);
    await expect(panel).toContainText(`${field<number>('UI-029','count')} / limit ${field<number>('UI-029','limit')}`);
  });
}
