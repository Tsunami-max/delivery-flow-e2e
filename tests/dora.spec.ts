import { test, expect } from '@playwright/test';
import { field } from './corpus';
import { TARGET } from './target';

/**
 * The board's delivery figures are analogues of DORA's five software delivery
 * metrics. These cases pin the mapping, and pin that an uncollected stability
 * figure stays a state word instead of reading as a perfect score.
 */

test.beforeEach(async ({ page }) => {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await page.locator('#today h1.verdict').waitFor();
});

test('UI-017 Delivery today shows exactly five delivery dials, one per DORA metric', async ({ page }) => {
  const dials = page.locator('#today').locator('.dial');
  await expect(dials).toHaveCount(field<number>('UI-017', 'dial_count_on_today'));
  for (const label of field<string[]>('UI-017', 'dial_labels')) {
    const dial = page.locator('#today').getByRole('group', { name: new RegExp(`^${label}:`) });
    await expect(dial, `the "${label}" dial must be on the Delivery today screen`).toHaveCount(1);
  }
});

test('UI-018 Change fail share and Time to fix read the literal state with a reason', async ({ page }) => {
  const expectedText = field<string>('UI-018', 'value_text');
  for (const label of field<string[]>('UI-018', 'labels')) {
    const dial = page.locator('#today').getByRole('group', { name: new RegExp(`^${label}:`) });
    await expect(dial, `the "${label}" dial must exist`).toHaveCount(1);
    const value = dial.locator('.v');
    await expect(value, `${label} must render as its state, not as a figure`).toHaveText(expectedText);
    if (field<boolean>('UI-018', 'value_has_na_class')) await expect(value).toHaveClass(/\bna\b/);
    await expect(dial.locator('.chip')).toHaveText(field<string>('UI-018', 'provenance_chip'));

    const rendered = ((await value.textContent()) ?? '').trim();
    for (const forbidden of field<string[]>('UI-018', 'forbidden_value_texts')) {
      expect(rendered, `${label} must not render as "${forbidden}"`).not.toBe(forbidden);
    }
    expect(/^[\d.,\s%h-]+$/.test(rendered), `${label} rendered "${rendered}", which is numeric`).toBe(false);

    const reason = ((await dial.locator('.m').textContent()) ?? '').trim();
    expect(reason.length, `${label} must say why it could not be assessed`).toBeGreaterThanOrEqual(
      field<number>('UI-018', 'reason_min_length'),
    );
    expect((await dial.getAttribute('aria-label')) ?? '').toContain(expectedText);
  }
});

test('UI-019 the DORA mapping sits behind a fold and names all five metrics as analogues', async ({ page }) => {
  const openLabel = field<string>('UI-019', 'fold_open_label');
  const fold = page
    .locator('#today')
    .locator('details.more')
    .filter({ has: page.locator(`summary[aria-label="${openLabel}"]`) });
  await expect(fold, 'the mapping fold must exist on Delivery today').toHaveCount(1);
  await expect(fold, 'the mapping is detail, so it starts closed').not.toHaveAttribute('open', '');

  await fold.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(fold).toHaveAttribute('open', '');

  await expect(fold.locator('tbody tr')).toHaveCount(field<number>('UI-019', 'row_count'));
  const text = await fold.innerText();
  for (const metric of field<string[]>('UI-019', 'dora_metrics')) {
    expect(text, `the mapping must name DORA's "${metric}"`).toContain(metric);
  }
  expect(text.toLowerCase()).toContain(field<string>('UI-019', 'must_contain_word'));
  for (const forbidden of field<string[]>('UI-019', 'must_not_contain')) {
    expect(text, `the mapping must not claim "${forbidden}"`).not.toContain(forbidden);
  }
});

test('UI-020 the Cost screen names cost per accepted change and leaves it not assessed', async ({ page }) => {
  const label = field<string>('UI-020', 'label');
  const dial = page.locator('#cost').getByRole('group', { name: new RegExp(`^${label}:`) });
  await expect(dial).toHaveCount(1);
  await expect(dial.locator('.v')).toHaveText(field<string>('UI-020', 'value_text'));
  const meta = ((await dial.locator('.m').textContent()) ?? '').toLowerCase();
  expect(meta).toContain(field<string>('UI-020', 'meta_must_contain'));
});
