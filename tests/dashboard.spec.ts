import { test, expect, Page, Locator } from '@playwright/test';
import { corpus, expectation, field, SCREENS } from './corpus';
import { TARGET } from './target';

/**
 * Structural validation of the delivery-flow board against the pinned
 * expected-result corpus (expectations/expected-v1.json).
 *
 * The specs never carry their own numbers: every expected value is read out of
 * the corpus by case id, so a spec cannot quietly agree with the candidate.
 */

test.beforeEach(async ({ page }) => {
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await page.locator('#today h1.verdict').waitFor();
});

/** A dial is an ARIA group labelled "<name>: <value> — <provenance>". */
function dialByName(page: Page, name: string): Locator {
  return page.getByRole('group', { name: new RegExp(`^${name}:`) });
}

test.describe('Candidate identity and framing', () => {
  test('UI-001 the demo provenance banner is present', async ({ page }) => {
    const e = expectation('UI-001');
    const banner = page.locator('.demo').first();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(field<string>('UI-001', 'banner_lead_text'));
    await expect(banner).toContainText(field<string>('UI-001', 'must_contain'));
    expect(e.kind).toBe('benign');
  });

  test('UI-002 all ten screens render a verdict sentence', async ({ page }) => {
    expect(SCREENS).toHaveLength(field<number>('UI-002', 'screen_count'));
    const minLen = field<number>('UI-002', 'verdict_min_length');
    for (const id of SCREENS) {
      const screen = page.locator(`#${id}`);
      await expect(screen, `screen #${id} must exist`).toHaveCount(1);
      const verdict = screen.locator('h1.verdict');
      await expect(verdict, `#${id} must carry exactly one verdict`).toHaveCount(1);
      const text = ((await verdict.textContent()) ?? '').trim();
      expect(text.length, `#${id} verdict is too short to be a sentence`).toBeGreaterThan(minLen);
    }
  });

  test('UI-014 every left-rail link resolves to a screen that exists', async ({ page }) => {
    const rail = page.locator('nav.rail');

    // Five screens are listed without interaction; five sit behind the rail fold.
    const visibleBefore = await rail.getByRole('link').count();
    expect(visibleBefore, 'rail links exposed without interaction').toBe(
      field<number>('UI-014', 'links_visible_without_interaction'),
    );

    const fold = rail.locator('details');
    await expect(fold.locator('summary')).toHaveText(field<string>('UI-014', 'rail_fold_summary'));
    await fold.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(fold).toHaveAttribute('open', '');
    expect(
      (await rail.getByRole('link').count()) - visibleBefore,
      'rail links revealed by the fold',
    ).toBe(field<number>('UI-014', 'links_behind_rail_fold'));

    const hrefs = (
      await rail.getByRole('link').evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''),
      )
    ).filter((h) => h.startsWith('#'));

    for (const href of hrefs) {
      await expect(page.locator(href), `rail link ${href} must target a real element`).toHaveCount(1);
    }
    const targeted = new Set(hrefs.map((h) => h.slice(1)));
    for (const id of SCREENS) {
      expect(targeted.has(id), `rail must link to #${id}`).toBe(true);
    }
  });
});

test.describe('Verdicts state the absence, not a zero', () => {
  test('UI-003 Delivery today says none of the landings carries a verdict', async ({ page }) => {
    const verdict = page.locator('#today').locator('h1.verdict');
    await expect(verdict).toHaveText(field<string>('UI-003', 'text'));
    await expect(verdict).toContainText(field<string>('UI-003', 'must_contain_word'));
    for (const forbidden of field<string[]>('UI-003', 'must_not_contain')) {
      await expect(verdict).not.toContainText(forbidden);
    }
  });

  test('UI-006 Decisions reports 7 mandates with a receipt and 4 refuted', async ({ page }) => {
    const section = page.locator('#decisions');
    const verdict = section.locator('h1.verdict');
    const text = ((await verdict.textContent()) ?? '').trim();

    const withReceipt = field<number>('UI-006', 'mandates_with_receipt');
    const refuted = field<number>('UI-006', 'refuted');
    expect(text).toContain(`${withReceipt} decisions have a receipt`);
    expect(text).toContain(`${refuted} were refuted`);

    const badgeText = field<string>('UI-006', 'badge_text');
    const refutedBadges = section.locator('.state.na', { hasText: new RegExp(`^${badgeText}$`) });
    await expect(refutedBadges).toHaveCount(field<number>('UI-006', 'refuted_badges_in_section'));
  });
});

test.describe('Readiness blockers are named, not scored', () => {
  test('UI-005 Business intent shows exactly six blockers with one open conflict', async ({ page }) => {
    const blockers = page.locator('#intent').locator('.blk');
    await expect(blockers).toHaveCount(field<number>('UI-005', 'blocker_count'));

    for (const label of field<string[]>('UI-005', 'labels')) {
      await expect(
        blockers.filter({ hasText: label }),
        `blocker "${label}" must be named on the intent screen`,
      ).toHaveCount(1);
    }

    await expect(page.locator('#intent').locator('.blk.open')).toHaveCount(
      field<number>('UI-005', 'open_blk_elements'),
    );

    const conflict = blockers.filter({ hasText: 'open conflict' });
    const count = Number(((await conflict.locator('b').textContent()) ?? '').trim());
    expect(count).toBe(field<number>('UI-005', 'open_conflict_count'));
  });
});

test.describe('Provenance is carried by every figure', () => {
  test('UI-007 every dial carries exactly one provenance chip from the vocabulary', async ({ page }) => {
    const dials = page.locator('.dial');
    await expect(dials).toHaveCount(field<number>('UI-007', 'dial_count'));

    const perDial = await dials.evaluateAll((els) =>
      els.map((el) => ({
        label: el.getAttribute('aria-label') ?? '',
        chips: Array.from(el.querySelectorAll('.chip')).map((c) => (c.textContent ?? '').trim()),
      })),
    );

    const vocabulary = corpus.provenance_vocabulary;
    const expectChips = field<number>('UI-007', 'chips_per_dial');
    for (const d of perDial) {
      expect(d.chips.length, `dial "${d.label}" must carry exactly one chip`).toBe(expectChips);
      expect(vocabulary, `dial "${d.label}" chip "${d.chips[0]}" is outside the vocabulary`).toContain(d.chips[0]);
    }
  });

  test('UI-008 every screen carries at least one chart', async ({ page }) => {
    const min = field<number>('UI-008', 'min_charts_per_screen');
    for (const id of SCREENS) {
      const charts = page.locator(`#${id}`).locator('.viz');
      expect(await charts.count(), `#${id} must carry at least ${min} chart`).toBeGreaterThanOrEqual(min);
    }
  });
});

test.describe('Interaction', () => {
  test('UI-009 the trace picker switches the heading and the state line', async ({ page }) => {
    const heading = page.locator('#trace-h');
    const state = page.locator('#trace-s');
    await expect(heading).toHaveText(field<string>('UI-009', 'initial_heading'));

    // The picker lives behind a fold; open it the way a keyboard user would.
    const fold = page.locator('#trace').locator('details.more').filter({ has: page.locator('#trace-pick') });
    await fold.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(fold).toHaveAttribute('open', '');

    const choice = page.locator('#trace-pick').locator('button[data-i="5"]');
    await expect(choice).toBeVisible();
    await choice.click();

    await expect(heading).toHaveText(field<string>('UI-009', 'after_selecting_index_5_heading'));
    await expect(state).toHaveText(field<string>('UI-009', 'after_selecting_index_5_state'));
    if (field<boolean>('UI-009', 'aria_pressed_moves')) {
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#trace-pick').locator('button[aria-pressed="true"]')).toHaveCount(1);
    }
  });

  test('UI-010 the theme toggle flips data-theme and returns', async ({ page }) => {
    const html = page.locator('html');
    const toggle = page.locator('#theme');
    await expect(html).toHaveAttribute('data-theme', field<string>('UI-010', 'initial'));
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', field<string>('UI-010', 'after_one_click'));
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', field<string>('UI-010', 'after_two_clicks'));
  });
});

test.describe('Rendering hygiene', () => {
  test('UI-012 no rendered text leaks undefined or NaN', async ({ page }) => {
    // Open every fold first: a placeholder leak hidden behind a fold is still a leak.
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach((d) => ((d as HTMLDetailsElement).open = true));
    });
    const text = await page.locator('body').innerText();
    for (const forbidden of field<string[]>('UI-012', 'forbidden_substrings')) {
      expect(text, `rendered text must not contain "${forbidden}"`).not.toContain(forbidden);
    }
  });
});
