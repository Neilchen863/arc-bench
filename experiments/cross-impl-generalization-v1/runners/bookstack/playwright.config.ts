import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:33000/";
// Generate once in the runner; workers inherit this ID. Explicit evaluator IDs take precedence.
const runId = process.env.PLAYWRIGHT_RUN_ID ||= randomBytes(8).toString('hex');
for (const key of ['BOOKSTACK_RUN_ID', 'KEEP_RUN_ID', 'CTRIP_RUN_ID', 'SO_RUN_ID', 'RAIL_RUN_ID']) {
  process.env[key] ||= runId;
}
// Secondary browser contexts must use the same application as the primary context.
process.env.SO_BASE_URL ||= baseURL;
const expiredComment = /REQ-5\.3: Refuse an expired comment edit/;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 10_000,
  expect: { timeout: 10_000 },
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    timezoneId: "UTC",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
