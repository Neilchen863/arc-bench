// Certification walkthrough for bookstack REQ-6.4 (independent of methods B/D): hand-written per-variant steps,
// screenshot at each obligation point, raw facts only. Usage: node walk-bookstack.mjs <baseURL> <N5|N6|...> REQ-6.4 <outdir>
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const [base, v, , out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const facts = []; let n = 0;
const shot = async (tag, fact = {}) => { n++; await page.screenshot({ path: `${out}/${String(n).padStart(2, '0')}-${tag}.png`, fullPage: true }); facts.push({ n, tag, url: page.url(), ...fact }); };
const headings = () => page.evaluate(() => Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent.trim()));
const text = () => page.evaluate(() => document.body.innerText);

const F = {
  N5: { name: () => page.getByLabel(/^Name/), desc: () => page.getByLabel('Description'), tags: () => page.getByLabel(/^Tags/),
    saveBook: () => page.getByRole('button', { name: 'Save Book' }), newPage: () => page.getByRole('button', { name: 'New Page' }),
    ptitle: () => page.getByLabel(/^Page title/), pbody: () => page.getByLabel('Page content'), savePage: () => page.getByRole('button', { name: 'Save Page' }),
    entry: (t) => page.getByRole('button', { name: t, exact: true }).or(page.getByRole('link', { name: t, exact: true })), edit: () => page.getByRole('button', { name: 'Edit' }).or(page.getByRole('link', { name: 'Edit' })) },
  N6: { name: () => page.getByLabel('Name'), desc: () => page.getByLabel('Description'),
    tags: null, tagsInput: () => page.locator('.el-form-item').filter({ hasText: 'Tags' }).locator('input'),
    saveBook: () => page.getByRole('button', { name: 'Save book' }), newPage: () => page.getByRole('link', { name: /new page/i }).or(page.getByRole('button', { name: /new page/i })),
    ptitle: () => page.getByLabel('Title'), pbody: () => page.getByLabel('Content'), savePage: () => page.getByRole('button', { name: /save page/i }),
    entry: (t) => page.getByRole('link', { name: t, exact: true }), edit: () => page.getByRole('link', { name: 'Edit' }).or(page.getByRole('button', { name: 'Edit' })) },
  // acceptance (built after protocol/freeze-acceptance.json)
  X5: { name: () => page.getByLabel('Name'), desc: () => page.getByLabel('Description'), tags: () => page.getByLabel('Tags'),
    saveBook: () => page.getByRole('button', { name: 'Save Book' }), newPage: () => page.getByRole('button', { name: 'New Page' }),
    ptitle: () => page.getByLabel('Page title'), pbody: () => page.getByRole('textbox', { name: 'Page content' }), savePage: () => page.getByRole('button', { name: 'Save Page' }),
    entry: (t) => page.getByRole('button', { name: t, exact: true }), edit: () => page.getByRole('button', { name: 'Edit', exact: true }) },
  X6: { name: () => page.getByLabel('Name'), desc: () => page.getByRole('textbox', { name: 'Description' }), tags: () => page.getByLabel(/^Tags/),
    saveBook: () => page.getByRole('button', { name: 'Save Book' }), newPage: () => page.getByRole('button', { name: 'New Page' }),
    ptitle: () => page.getByLabel('Title', { exact: true }), pbody: () => page.getByRole('textbox', { name: 'Page content' }), savePage: () => page.getByRole('button', { name: 'Save page' }),
    entry: (t) => page.getByRole('link', { name: t, exact: true }), edit: () => page.getByRole('button', { name: 'Edit page' }) },
};
const V = F[v];
try {
await page.goto(base);
await page.waitForLoadState('networkidle');
await page.getByRole('link', { name: 'Books', exact: true }).first().click();
await page.waitForURL(/books/);
await page.getByRole('link', { name: /create new book|new book/i }).or(page.getByRole('button', { name: /create new book|new book/i })).first().click();
await V.name().fill('Book W1');
await V.desc().fill('Reference book description.');
if (V.tags) await V.tags().fill('manual, handbook');
else { const t = V.tagsInput(); await t.click(); await t.type('manual'); await page.keyboard.press('Enter'); await t.type('handbook'); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.getByRole('heading').first().click(); }
await shot('book-form');
await V.saveBook().click();
await page.getByRole('heading', { name: 'Book W1' }).waitFor();
for (const k of ['A', 'B', 'C']) {
  await V.newPage().click();
  await V.ptitle().fill(`Page ${k} W1`);
  await V.pbody().fill(`Reading content for Page ${k} W1.`);
  await V.savePage().click();
  await page.getByRole('heading', { name: 'Book W1' }).waitFor();
}
await shot('book-with-pages', { text: (await text()).slice(0, 1500) });
await V.entry('Page B W1').click(); await page.waitForTimeout(800);
await shot('opened-target', { headings: await headings(), text: (await text()).slice(0, 1500) });
await V.edit().first().click(); await page.waitForTimeout(800);
const vals = await page.evaluate(() => Array.from(document.querySelectorAll('input,textarea,[contenteditable=true]')).map(e => ({ label: e.getAttribute('aria-label') || e.id || e.className, value: e.value ?? e.innerText })));
await shot('editor', { fields: vals, text: (await text()).slice(0, 800) });
} catch (e) { await shot('FAIL', { error: String(e).slice(0, 500) }); }
fs.writeFileSync(`${out}/walk.json`, JSON.stringify(facts, null, 1));
await b.close();
