// Throwaway probe: keyboard-only creation, search clear control, screenshots.
import { chromium } from 'playwright';
import os from 'node:os';
const BASE = 'http://127.0.0.1:39021';
const exe = `${os.homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(BASE);
await page.getByRole('button', { name: 'Take a note…' }).focus();
await page.keyboard.press('Enter');
await page.getByRole('dialog').waitFor();
await page.waitForTimeout(400);
console.log('focused after open:', await page.evaluate(() => document.activeElement.getAttribute('aria-label')));
await page.keyboard.type('Keyboard note');
await page.keyboard.press('Tab'); // pin
await page.keyboard.press('Tab'); // content
await page.keyboard.type('Line A');
await page.keyboard.press('Enter');
await page.keyboard.type('Line B with st');
await page.screenshot({ path: 'editor.png' });
let tabs = 0;
while (tabs < 8) { await page.keyboard.press('Tab'); tabs++; const n = await page.evaluate(() => document.activeElement.textContent.trim()); if (n === 'Close') break; }
await page.keyboard.press('Enter');
await page.getByRole('dialog').waitFor({ state: 'hidden' });
console.log('keyboard note saved:', await page.getByRole('article', { name: 'Keyboard note' }).innerText());
await page.getByRole('searchbox').fill('st');
await page.waitForTimeout(300);
await page.screenshot({ path: 'search.png' });
console.log('search tree:', await page.locator('.search').ariaSnapshot());
await page.getByRole('searchbox').fill('');
await page.getByRole('searchbox').blur();
await page.getByRole('searchbox').focus();
await page.waitForTimeout(300);
await page.screenshot({ path: 'suggest.png' });
await page.getByRole('button', { name: 'Main menu' }).click();
await page.screenshot({ path: 'collapsed.png' });
await browser.close();
