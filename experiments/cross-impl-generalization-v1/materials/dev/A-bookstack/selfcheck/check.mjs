// Throwaway self-check: drives the built app through every in-scope scenario.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:39011';
const EXE = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1200/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
const exp = async (name, fn) => { try { await fn(); ok(name, true); } catch (e) { ok(name, false, String(e).split('\n').slice(0,3).join(' ')); console.log(page.url(), (await page.locator('main').innerText()).slice(0,300)); } };
const vis = (loc) => loc.waitFor({ state: 'visible', timeout: 5000 });
const R = Date.now().toString(36);

await fetch(BASE + '/__reset', { method: 'POST' });

async function createBook(name, desc, tags) {
  await page.getByRole('link', { name: 'Books', exact: true }).click();
  await page.getByRole('button', { name: 'Create New Book', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill(desc);
  await page.getByRole('textbox', { name: 'Tags', exact: true }).fill(tags);
  await page.getByRole('button', { name: 'Save Book', exact: true }).click();
  await vis(page.getByRole('heading', { name, exact: true }));
}
async function publish(title, body) {
  await page.getByRole('button', { name: 'New Page', exact: true }).click();
  await page.getByRole('textbox', { name: 'Page title', exact: true }).fill(title);
  await page.getByRole('textbox', { name: 'Write your page content here...', exact: true }).fill(body);
  await page.getByRole('button', { name: 'Save Page', exact: true }).click();
}

await exp('REQ-1.1 home links', async () => {
  await page.goto(BASE + '/');
  for (const n of ['Login', 'Shelves', 'Books']) await vis(page.getByRole('link', { name: n, exact: true }));
  await vis(page.getByRole('searchbox'));
});
await exp('REQ-1.2 shelves then home', async () => {
  await page.getByRole('link', { name: 'Shelves', exact: true }).click();
  await vis(page.getByRole('region', { name: 'Shelf list' }).getByText('Benchmark Bootstrap Shelf'));
  await page.goto(BASE + '/');
  await vis(page.getByRole('link', { name: 'Books', exact: true }));
});
await exp('REQ-5.3 save + reload + reopen Edit', async () => {
  const n = `Book Created 5.3.1 ${R}`;
  await page.goto(BASE + '/');
  await createBook(n, 'Book created by corresponding prerequisite behavior.', 'created, book');
  await vis(page.getByText('Book created by corresponding prerequisite behavior.'));
  await page.reload();
  await vis(page.getByRole('heading', { name: n, exact: true }));
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const v = async (l) => page.getByRole('textbox', { name: l, exact: true }).inputValue();
  await page.getByRole('textbox', { name: 'Name', exact: true }).waitFor();
  if ((await v('Name')) !== n) throw new Error('name');
  if ((await v('Description')) !== 'Book created by corresponding prerequisite behavior.') throw new Error('desc');
  if ((await v('Tags')) !== 'created, book') throw new Error('tags ' + (await v('Tags')));
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await vis(page.getByRole('heading', { name: n, exact: true }));
});
await exp('REQ-5.3 cancel', async () => {
  const n = `Book Cancelled 5.3.2 ${R}`;
  await page.getByRole('link', { name: 'Books', exact: true }).click();
  await page.getByRole('button', { name: 'Create New Book', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(n);
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Unsaved book description 5.3.2.');
  await page.getByRole('textbox', { name: 'Tags', exact: true }).fill('cancelled, book');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const list = page.getByRole('region', { name: 'Book list' });
  await vis(list);
  await page.waitForTimeout(300);
  if ((await list.getByRole('button', { name: n }).count()) !== 0) throw new Error('created');
});
await exp('REQ-5.1 + 5.2 browse and open', async () => {
  const n = `Book 5.2.1 ${R}`;
  await createBook(n, 'Reference book description.', 'manual, handbook');
  await page.getByRole('link', { name: 'Books', exact: true }).click();
  const e = page.getByRole('region', { name: 'Book list' }).getByRole('button', { name: n, exact: true });
  await vis(e);
  if ((await e.count()) !== 1) throw new Error('count');
  await e.focus(); await page.keyboard.press('Enter');
  await vis(page.getByRole('heading', { name: n, exact: true }));
  await vis(page.getByText('Reference book description.'));
});
await exp('REQ-6.1 publish page', async () => {
  const n = `Book 6.1.1 ${R}`; const t = `Page Created 6.1.1 ${R}`;
  await createBook(n, 'd', '');
  await publish(t, 'Page content created by corresponding prerequisite behavior.');
  await vis(page.getByRole('heading', { name: n, exact: true }));
  const e = page.getByRole('region', { name: 'Page list' }).getByRole('button', { name: t, exact: true });
  await vis(e);
  if ((await e.count()) !== 1) throw new Error('count');
});
await exp('REQ-6.4 read selected page (multi-page book)', async () => {
  const n = `Book 6.3.1 ${R}`;
  await createBook(n, 'd', '');
  await publish(`Other Page ${R}`, 'Other body.');
  await publish(`Page 6.3.1 ${R}`, 'Reading content for Page 6.3.1.');
  await page.getByRole('region', { name: 'Page list' }).getByRole('button', { name: `Page 6.3.1 ${R}`, exact: true }).click();
  await vis(page.getByRole('heading', { name: `Page 6.3.1 ${R}`, exact: true }));
  await vis(page.getByText('Reading content for Page 6.3.1.'));
});
await exp('REQ-6.4 reopen editor + save edited page + reload', async () => {
  const n = `Book 6.3.2 ${R}`; const t = `Page 6.3.2 ${R}`;
  await createBook(n, 'd', '');
  await publish(t, 'Reading content for Page 6.3.2.');
  await page.getByRole('region', { name: 'Page list' }).getByRole('button', { name: t, exact: true }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const ti = page.getByRole('textbox', { name: 'Page title', exact: true });
  const bo = page.getByRole('textbox', { name: 'Write your page content here...', exact: true });
  await vis(ti);
  if ((await ti.inputValue()) !== t) throw new Error('title');
  if ((await bo.inputValue()) !== 'Reading content for Page 6.3.2.') throw new Error('body');
  await vis(page.getByRole('button', { name: 'Save Page', exact: true }));
  await bo.fill('Edited body.');
  await page.getByRole('button', { name: 'Save Page', exact: true }).click();
  await vis(page.getByRole('heading', { name: t, exact: true }));
  await vis(page.locator('article').getByText('Edited body.'));
  await page.reload();
  await vis(page.getByRole('heading', { name: t, exact: true }));
  await vis(page.getByText('Edited body.'));
  await page.getByRole('link', { name: n, exact: true }).click();
  if ((await page.getByRole('region', { name: 'Page list' }).getByRole('button', { name: t, exact: true }).count()) !== 1) throw new Error('dup');
});
await exp('dates use business now', async () => {
  await vis(page.getByText('Created 6 October 2026'));
});
for (const r of results) console.log(r.join(' | '));
await browser.close();
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
