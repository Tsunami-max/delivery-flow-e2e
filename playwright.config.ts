import { defineConfig, devices } from '@playwright/test';

const BASE = process.env.TARGET_URL ?? 'https://s4u-methodology.pages.dev/demo/delivery-flow.html';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  // Discipline: a flaky result is a result. Retries would hide it.
  retries: 0,
  forbidOnly: true,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME ?? 'evidence/results.json' }],
  ],
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
