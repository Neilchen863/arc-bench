// Throwaway self-check: drives the built app through every in-scope scenario.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const BASE = process.argv[2] || 'http://127.0.0.1:39071';
const browser = await chromium.launch();
const page = await browser.newPage();
const log = m => console.log('PASS', m);
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await fetch(BASE + '/__reset', { method: 'POST' });

// REQ-1.1
await page.goto(BASE + '/');
for (const n of ['Login', 'Shelves', 'Books']) await assert.ok(await page.getByRole('link', { name: n, exact: true }).isVisible());
assert.ok(await page.getByRole('searchbox', { name: 'Search' }).isVisible());
log('REQ-1.1 home entry links + search');

async function createBook(name, desc, tags) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Books', exact: true }).click();
  await page.getByRole('button', { name: 'Create New Book' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill(name);
  await page.getByRole('textbox', { name: 'Description' }).fill(desc);
  await page.getByRole('textbox', { name: 'Tags' }).fill(tags);
  await page.getByRole('button', { name: 'Save Book' }).click();
  await page.getByRole('heading', { level: 1, name }).waitFor();
}
// REQ-5.3 save
await createBook('Book Created 5.3.1', 'Book created by corresponding prerequisite behavior.', 'created, book');
assert.ok(await page.getByText('Book created by corresponding prerequisite behavior.').isVisible());
await page.reload();
await page.getByRole('heading', { level: 1, name: 'Book Created 5.3.1' }).waitFor();
await page.getByRole('button', { name: 'Edit book' }).click();
await page.getByRole('button', { name: 'Save Book' }).waitFor();
assert.equal(await page.getByRole('textbox', { name: 'Name' }).inputValue(), 'Book Created 5.3.1');
assert.equal((await page.getByRole('textbox', { name: 'Description' }).innerText()).trim(), 'Book created by corresponding prerequisite behavior.');
assert.equal(await page.getByRole('textbox', { name: 'Tags' }).inputValue(), 'created, book');
log('REQ-5.3 save + reload + reopen edit');
await page.getByRole('button', { name: 'Cancel' }).click();
await page.getByRole('heading', { level: 1, name: 'Book Created 5.3.1' }).waitFor();

// REQ-5.3 cancel
await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Books', exact: true }).click();
await page.getByRole('button', { name: 'Create New Book' }).click();
await page.getByRole('textbox', { name: 'Name' }).fill('Book Cancelled 5.3.2');
await page.getByRole('textbox', { name: 'Description' }).fill('Unsaved book description 5.3.2.');
await page.getByRole('textbox', { name: 'Tags' }).fill('cancelled, book');
await page.getByRole('button', { name: 'Cancel' }).click();
await page.getByRole('heading', { level: 1, name: 'Books' }).waitFor();
const list = page.getByRole('region', { name: 'Book list' });
await list.getByRole('link', { name: 'Book Created 5.3.1' }).waitFor();
assert.equal(await list.getByText('Book Cancelled 5.3.2').count(), 0);
assert.equal((await (await fetch(BASE + '/api/books')).json()).length, 1);
log('REQ-5.3 cancel creates nothing');

// REQ-5.1 / 5.2
await createBook('Book 5.1', 'Reference book description.', 'manual, handbook');
await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Books', exact: true }).click();
await list.getByRole('link', { name: 'Book 5.1', exact: true }).waitFor();
assert.equal(await list.getByRole('link', { name: 'Book 5.1', exact: true }).count(), 1);
// keyboard activation
await list.getByRole('link', { name: 'Book 5.1', exact: true }).focus();
await page.keyboard.press('Enter');
await page.getByRole('heading', { level: 1, name: 'Book 5.1' }).waitFor();
assert.ok(await page.getByText('Reference book description.').isVisible());
log('REQ-5.1/5.2 single entry, keyboard open, heading+description');

// REQ-6.1 publish
await createBook('Book 6.1.1', 'Parent book.', '');
await page.getByRole('button', { name: 'New Page' }).click();
await page.getByRole('textbox', { name: 'Title' }).fill('Page Created 6.1.1');
await page.getByRole('textbox', { name: 'Page content' }).fill('Page content created by corresponding prerequisite behavior.');
await page.getByRole('button', { name: 'Save page' }).click();
await page.getByRole('heading', { level: 1, name: 'Book 6.1.1' }).waitFor();
const pagesRegion = page.getByRole('region', { name: 'Pages' });
await pagesRegion.getByRole('link', { name: 'Page Created 6.1.1' }).waitFor();
assert.equal(await pagesRegion.getByRole('link', { name: 'Page Created 6.1.1' }).count(), 1);
log('REQ-6.1 publish page returns to book with one entry');

// second + third page, then REQ-6.4 read selected (non-first) page
for (const [t, b] of [['Page 6.3.1', 'Reading content for Page 6.3.1.'], ['Page 6.3.2', 'Reading content for Page 6.3.2.\nSecond line.']]) {
  await page.getByRole('button', { name: 'New Page' }).click();
  await page.getByRole('textbox', { name: 'Title' }).fill(t);
  await page.getByRole('textbox', { name: 'Page content' }).click();
  const [l1, l2] = b.split('\n');
  await page.keyboard.type(l1);
  if (l2) { await page.keyboard.press('Enter'); await page.keyboard.type(l2); }
  await page.getByRole('button', { name: 'Save page' }).click();
  await pagesRegion.getByRole('link', { name: t }).waitFor();
}
assert.equal(await pagesRegion.getByRole('link').count(), 3);
await pagesRegion.getByRole('link', { name: 'Page 6.3.1' }).click();
await page.getByRole('heading', { level: 1, name: 'Page 6.3.1' }).waitFor();
assert.ok(await page.getByText('Reading content for Page 6.3.1.').isVisible());
log('REQ-6.4 read selected page (2nd entry)');
await page.goBack();
await pagesRegion.getByRole('link', { name: 'Page 6.3.2' }).click();
await page.getByRole('heading', { level: 1, name: 'Page 6.3.2' }).waitFor();
assert.ok(await page.getByText('Second line.').isVisible());
await page.getByRole('button', { name: 'Edit page' }).click();
await page.getByRole('button', { name: 'Save page' }).waitFor();
assert.equal(await page.getByRole('textbox', { name: 'Title' }).inputValue(), 'Page 6.3.2');
const bodyText = await page.getByRole('textbox', { name: 'Page content' }).innerText();
assert.ok(bodyText.includes('Reading content for Page 6.3.2.') && bodyText.includes('Second line.'), bodyText);
log('REQ-6.4 reopen editor prefilled title+body, save visible');
// save edited
await page.getByRole('textbox', { name: 'Title' }).fill('Page 6.3.2 edited');
await page.getByRole('textbox', { name: 'Page content' }).click();
await page.keyboard.press('ControlOrMeta+End');
await page.keyboard.type(' Appended.');
await page.getByRole('button', { name: 'Save page' }).click();
await page.getByRole('heading', { level: 1, name: 'Page 6.3.2 edited' }).waitFor();
await page.reload();
await page.getByRole('heading', { level: 1, name: 'Page 6.3.2 edited' }).waitFor();
assert.ok(await page.getByText('Appended.').isVisible());
await page.getByRole('link', { name: 'Book 6.1.1' }).click();
await pagesRegion.getByRole('link').first().waitFor();
assert.equal(await pagesRegion.getByRole('link').count(), 3);
log('save edited page persists after reload, no duplicate');
assert.ok(await page.getByText('Created 6 October 2026').first().isVisible());
log('dates from /api/now');
// shelves/login stubs
await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Shelves', exact: true }).click();
await page.getByText('Benchmark Bootstrap Shelf').waitFor();
await page.goto(BASE + '/');
await page.getByRole('link', { name: 'Books', exact: true }).waitFor();
log('REQ-1.2-ish return home / shelves stub');
assert.deepEqual(errors, []);
await browser.close();
console.log('ALL OK');
