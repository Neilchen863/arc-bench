// Throwaway self-check: drives the built app through every in-scope scenario.
import { chromium } from 'playwright';
import os from 'node:os';
const BASE = process.env.BASE || 'http://127.0.0.1:39031';
const MODE = process.env.MODE || 'correct'; // correct | D1 | D2
const exe = `${os.homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };

await fetch(`${BASE}/__reset`, { method: 'POST' });
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage();
const run = Date.now().toString(36);

// REQ-1.1 home links
await page.goto(BASE + '/');
for (const n of ['Shelves', 'Books', 'Log in']) check(`home link ${n}`, await page.getByRole('link', { name: n, exact: true }).isVisible());
check('search box', await page.getByRole('textbox', { name: 'Search' }).isVisible());

// REQ-5.3 cancel
await page.getByRole('link', { name: 'Books', exact: true }).click();
await page.getByRole('button', { name: 'New book' }).click();
await page.getByRole('textbox', { name: 'Name' }).fill(`Book Cancelled ${run}`);
await page.getByRole('textbox', { name: 'Description' }).fill('Unsaved book description.');
await page.getByRole('textbox', { name: 'Tags' }).fill('cancelled, book');
await page.getByRole('button', { name: 'Cancel' }).click();
await page.getByRole('heading', { name: 'Books', level: 1 }).waitFor();
check('cancel returns to Books, no entry', (await page.getByText(`Book Cancelled ${run}`).count()) === 0 && page.url().endsWith('/books'));

// REQ-5.3 save + reload + edit
const bookName = `Book Created ${run}`;
await page.getByRole('button', { name: 'New book' }).click();
await page.getByRole('textbox', { name: 'Name' }).fill(bookName);
await page.getByRole('textbox', { name: 'Description' }).fill('Book created by corresponding prerequisite behavior.');
await page.getByRole('textbox', { name: 'Tags' }).fill('created, book');
await page.getByRole('button', { name: 'Save book' }).click();
await page.getByRole('heading', { name: bookName, level: 1 }).waitFor();
check('book saved -> detail heading + description', await page.getByText('Book created by corresponding prerequisite behavior.').isVisible());
check('business date shown', await page.getByText('Created 6 October 2026').isVisible());
await page.reload();
await page.getByRole('button', { name: 'Edit book' }).click();
await page.getByRole('textbox', { name: 'Name' }).waitFor();
await page.waitForFunction(() => document.querySelector('main input')?.value !== '');
check('edit prefill name', (await page.getByRole('textbox', { name: 'Name' }).inputValue()) === bookName);
check('edit prefill description', (await page.getByRole('textbox', { name: 'Description' }).inputValue()) === 'Book created by corresponding prerequisite behavior.');
check('edit prefill tags', (await page.getByRole('textbox', { name: 'Tags' }).inputValue()) === 'created, book');
await page.getByRole('button', { name: 'Cancel' }).click();

// REQ-5.1 / 5.2 browse + open
await page.getByRole('link', { name: 'Books', exact: true }).click();
await page.getByRole('link', { name: bookName, exact: true }).first().waitFor();
check('book listed exactly once', (await page.getByRole('link', { name: bookName, exact: true }).count()) === 1);
await page.getByRole('link', { name: bookName, exact: true }).focus();
await page.keyboard.press('Enter');
await page.getByRole('heading', { name: bookName, level: 1 }).waitFor();
check('open book via keyboard', true);

// REQ-6.1 publish two pages
for (const i of [1, 2]) {
  await page.getByRole('button', { name: 'New page' }).click();
  await page.getByRole('textbox', { name: 'Title' }).fill(`Page ${i} ${run}`);
  await page.getByRole('textbox', { name: 'Content' }).fill(`Reading content for Page ${i}.\nSecond line ${i}.`);
  await page.getByRole('button', { name: 'Save page' }).click();
  await page.getByRole('heading', { name: bookName, level: 1 }).waitFor();
  check(`page ${i} listed exactly once after save`, (await page.getByRole('link', { name: `Page ${i} ${run}`, exact: true }).count()) === 1);
}
const pagesRegion = page.getByRole('region', { name: 'Pages' });
check('Pages region with 2 entries', (await pagesRegion.getByRole('link').count()) === 2);

// REQ-6.4 read selected (second) page
await pagesRegion.getByRole('link', { name: `Page 2 ${run}`, exact: true }).click();
await page.getByRole('heading', { level: 1 }).waitFor();
const h = await page.getByRole('heading', { level: 1 }).textContent();
check('selected page heading', h === `Page 2 ${run}`, `(got ${h})`);
check('selected page body', await page.getByText('Reading content for Page 2.').isVisible());

// reopen editor
await page.getByRole('button', { name: 'Edit', exact: true }).click();
await page.getByRole('textbox', { name: 'Title' }).waitFor();
await page.waitForTimeout(300);
const t = await page.getByRole('textbox', { name: 'Title' }).inputValue();
const b = await page.getByRole('textbox', { name: 'Content' }).inputValue();
check('editor title prefilled', t === `Page 2 ${run}`, `(got ${t})`);
check('editor body prefilled', b === 'Reading content for Page 2.\nSecond line 2.', `(got ${JSON.stringify(b)})`);
check('Save page visible', await page.getByRole('button', { name: 'Save page' }).isVisible());

// save edited page
await page.getByRole('textbox', { name: 'Content' }).fill('Edited body 2.');
await page.getByRole('button', { name: 'Save page' }).click();
await page.getByText('Edited body 2.').waitFor();
await page.reload();
check('edited page persists after reload', await page.getByText('Edited body 2.').isVisible());
await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: bookName }).click();
await page.getByRole('region', { name: 'Pages' }).getByRole('link').first().waitFor();
check('still exactly 2 pages after edit', (await page.getByRole('region', { name: 'Pages' }).getByRole('link').count()) === 2);

// open first page too
await page.getByRole('link', { name: `Page 1 ${run}`, exact: true }).click();
check('first page opens', (await page.getByRole('heading', { level: 1 }).textContent()) === `Page 1 ${run}`);

// return home from shelves (REQ-1.2 smoke)
await page.getByRole('link', { name: 'Shelves', exact: true }).click();
await page.getByText('Benchmark Bootstrap Shelf').waitFor({ timeout: 5000 }).catch(() => {});
check('bootstrap shelf visible', await page.getByText('Benchmark Bootstrap Shelf').isVisible());
await page.goto(BASE + '/');
check('home Books link after return', await page.getByRole('link', { name: 'Books', exact: true }).isVisible());

// validation: empty name / empty page title are rejected
await page.goto(BASE + '/books/new');
await page.getByRole('button', { name: 'Save book' }).click();
await page.waitForTimeout(300);
check('empty book name rejected', page.url().endsWith('/books/new') && await page.getByText('Please enter a book name').isVisible());
const nBooks = (await (await fetch(BASE + '/api/books')).json()).length;
check('no book created by invalid submit', nBooks === 1);

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed (${MODE})`);
