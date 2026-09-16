import { test, expect } from '@playwright/test';
import { expectation, field } from './corpus';
import { TARGET } from './target';

/**
 * The load-bearing discipline of this board: an input that was never collected
 * renders as a state word, never as zero. These are the cases the mutation
 * harness is built to invert — if they cannot fail, they are not evidence.
 */

test.beforeEach(async ({ page }) => {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await page.locator('#today h1.verdict').waitFor();
});

test('UI-004 the Rework share dial reads the literal state, never a number', async ({ page }) => {
  const dial = page.getByRole('group', { name: /^Rework share:/ });
  await expect(dial, 'the Rework share dial must be on the Delivery today screen').toHaveCount(1);

  const value = dial.locator('.v');
  const expectedText = field<string>('UI-004', 'value_text');

  // 1. The value is the pinned state word.
  await expect(value, 'a not-assessed input must render as its state, not as a figure').toHaveText(expectedText);

  // 2. It is marked as a not-assessed value, not styled as a measurement.
  if (field<boolean>('UI-004', 'value_has_na_class')) {
    await expect(value).toHaveClass(/\bna\b/);
  }

  // 3. Its provenance chip says the same thing.
  await expect(dial.locator('.chip')).toHaveText(field<string>('UI-004', 'provenance_chip'));

  // 4. Explicit negative oracle: none of the zero-shaped renderings is acceptable.
  const rendered = ((await value.textContent()) ?? '').trim();
  for (const forbidden of field<string[]>('UI-004', 'forbidden_value_texts')) {
    expect(rendered, `Rework share must not render as "${forbidden}"`).not.toBe(forbidden);
  }
  expect(
    /^[\d.,\s%-]+$/.test(rendered),
    `Rework share rendered "${rendered}", which is numeric; missing telemetry must not become a measurement`,
  ).toBe(false);

  // 5. The dial's accessible name must not announce a number either.
  const ariaLabel = (await dial.getAttribute('aria-label')) ?? '';
  expect(ariaLabel, 'the accessible name must carry the not-assessed state').toContain(expectedText);
});

test('UI-013 no not-assessed state badge renders a numeral', async ({ page }) => {
  const badges = page.locator('.state.na');
  await expect(badges).toHaveCount(field<number>('UI-013', 'badge_count'));

  const allowed = field<string[]>('UI-013', 'allowed_texts');
  const texts = await badges.evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
  const unexpected = [...new Set(texts)].filter((t) => !allowed.includes(t));
  expect(unexpected, `state badges outside the pinned vocabulary: ${JSON.stringify(unexpected)}`).toEqual([]);

  const numeric = texts.filter((t) => /^[\d.,\s%-]+$/.test(t));
  expect(numeric, 'a state badge must never be a bare number').toEqual([]);
});

test('UI-016 the board renders with no third-party network access', async ({}, testInfo) => {
  const e = expectation('UI-016');
  const reason = e.cannot_assess_reason ?? 'no reason pinned';
  testInfo.annotations.push({ type: 'cannot-assess', description: reason });
  testInfo.annotations.push({ type: 'expectation', description: 'UI-016' });
  // Recorded as cannot-assess, with its reason, rather than dropped from the run.
  test.skip(true, `cannot-assess: ${reason}`);
});
