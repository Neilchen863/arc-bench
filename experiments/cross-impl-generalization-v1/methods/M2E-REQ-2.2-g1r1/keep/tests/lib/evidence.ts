// Evidence capture for feedback/attribution: on failure, attach the accessibility snapshot and the visible text.
import { test } from '@playwright/test';

export function captureOnFailure() {
  test.afterEach(async ({ page }, info) => {
    if (info.status === info.expectedStatus) return;
    const aria = await page.locator('body').ariaSnapshot({ timeout: 5_000 }).catch(e => `ariaSnapshot failed: ${e}`);
    const text = await page.evaluate(() => document.body.innerText).catch(e => `innerText failed: ${e}`);
    await info.attach('aria-snapshot', { body: aria, contentType: 'text/plain' });
    await info.attach('visible-text', { body: String(text).slice(0, 20_000), contentType: 'text/plain' });
    await info.attach('url', { body: page.url(), contentType: 'text/plain' });
  });
}
