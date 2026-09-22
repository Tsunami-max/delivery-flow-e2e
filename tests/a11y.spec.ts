import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { corpus, field } from './corpus';
import { TARGET } from './target';

test.beforeEach(async ({ page }) => {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await page.locator('#today h1.verdict').waitFor();
});

test('UI-011 every details.more fold is reachable and operable by keyboard', async ({ page }) => {
  const summaries = page.locator('details.more > summary');
  await expect(summaries).toHaveCount(field<number>('UI-011', 'fold_count'));

  const total = await summaries.count();
  for (let i = 0; i < total; i++) {
    const summary = summaries.nth(i);
    await summary.focus();
    const focused = await summary.evaluate((el) => el === document.activeElement);
    expect(focused, `fold ${i} summary must take keyboard focus`).toBe(true);

    if (field<boolean>('UI-011', 'enter_key_toggles_open')) {
      const fold = page.locator('details.more').nth(i);
      const before = await fold.evaluate((el) => (el as HTMLDetailsElement).open);
      await page.keyboard.press('Enter');
      const after = await fold.evaluate((el) => (el as HTMLDetailsElement).open);
      expect(after, `fold ${i} must toggle on Enter`).toBe(!before);
      await page.keyboard.press('Enter'); // restore
    }
  }
});

test('UI-015 a11y smoke: no serious or critical axe violations beyond the recorded baseline', async ({
  page,
}, testInfo) => {
  if (corpus.corpus_version === 'expected-v2') {
    for (const summary of await page.locator('details.more > summary, details.how > summary').all()) {
      await summary.focus();await page.keyboard.press('Enter');
    }
  }
  const results = await new AxeBuilder({ page })
    .withTags(field<string[]>('UI-015', 'tags'))
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  const baseline = field<string[]>('UI-015', 'baselined_serious_violations');
  const fresh = blocking.filter((v) => !baseline.includes(v.id));

  testInfo.annotations.push({
    type: 'axe',
    description:
      `${results.violations.length} violations total; serious/critical: ` +
      `${blocking.map((v) => `${v.id}(${v.impact},${v.nodes.length}n)`).join(', ') || 'none'}; ` +
      `baselined open defects still present: ${blocking
        .filter((v) => baseline.includes(v.id))
        .map((v) => v.id)
        .join(', ') || 'none'}`,
  });

  // The baselined rules are OPEN DEFECTS in the candidate, carried in the corpus
  // and reported in the receipt. They are recorded, not waived. The gate below
  // fails on any serious/critical rule that is not already on that record.
  const summary = fresh.map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nodes)`).join('; ');
  expect(fresh.length, `new serious/critical axe violations: ${summary}`).toBeLessThanOrEqual(
    field<number>('UI-015', 'max_new_serious_or_critical_violations'),
  );
});
