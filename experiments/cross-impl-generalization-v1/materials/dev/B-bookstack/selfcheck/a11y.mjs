// Dumps the accessibility snapshot of key screens + checks keyboard reachability of buttons.
import { chromium } from 'playwright';
import os from 'node:os';
const BASE = process.env.BASE || 'http://127.0.0.1:39031';
const exe = `${os.homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage();
await p.goto(BASE + '/books');
await p.getByRole('link').last().waitFor();
const book = (await (await fetch(BASE + '/api/books')).json()).at(-1);
const pg = (await (await fetch(BASE + '/api/pages')).json()).at(-1);
for (const u of ['/', '/books', '/books/new', `/books/${book.id}`, `/books/${book.id}/pages/${pg.id}`, `/books/${book.id}/pages/${pg.id}/edit`]) {
  await p.goto(BASE + u); await p.waitForTimeout(500);
  console.log('=== ' + u); console.log(await p.locator('main').ariaSnapshot());
}
// keyboard: tab to Edit and press Enter
await p.goto(BASE + `/books/${book.id}/pages/${pg.id}`); await p.waitForTimeout(400);
for (let i = 0; i < 20; i++) { await p.keyboard.press('Tab'); if ((await p.evaluate(() => document.activeElement.textContent.trim())) === 'Edit') break; }
await p.keyboard.press('Enter'); await p.waitForTimeout(400);
console.log('keyboard Edit ->', p.url());
await b.close();
