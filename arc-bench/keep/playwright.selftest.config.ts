// Evaluator self-tests (20 fixtures) for the production library in ./tests/lib.
// Kept apart from product evaluation: the default testDir for product runs stays ./tests.
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './evaluator-selftests',
  testMatch: '**/*.spec.ts',
  workers: 1, retries: 0, timeout: 120_000,
  use: { headless: true },
  outputDir: './selftest-output',
  reporter: [['list'], ['json', {
    outputFile: './selftest-output/report.json'
  }]],
});
