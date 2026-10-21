// Unified main-experiment configuration (plan §8.1). Same file for every method; only env differs per run.
// Diff vs upstream setup-playwright.sh config: case timeout 10s -> 120s; JSON reporter; fixed viewport/locale;
// trace/screenshot always kept; run id supplied explicitly by the matrix runner (never random).
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) throw new Error('PLAYWRIGHT_BASE_URL must be supplied by the matrix runner');
const runId = process.env.PLAYWRIGHT_RUN_ID;
if (!runId) throw new Error('PLAYWRIGHT_RUN_ID must be supplied by the matrix runner');
for (const key of ['BOOKSTACK_RUN_ID', 'KEEP_RUN_ID', 'CTRIP_RUN_ID']) process.env[key] = runId;

export default defineConfig({
  testDir: process.env.ARC_TEST_DIR || './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir: process.env.ARC_OUTPUT_DIR || './test-results',
  reporter: [['json', { outputFile: process.env.ARC_JSON_REPORT || './report.json' }], ['line']],
  use: {
    baseURL,
    timezoneId: process.env.ARC_TIMEZONE || 'UTC',
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'on',
    screenshot: 'on',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
