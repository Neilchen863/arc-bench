// Throwaway self-check: clicks through every in-scope scenario by accessible role/name.
// Usage: node check.mjs <baseURL> [expect=correct|D1|D2]
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:39051';
const mode = process.argv[3] || 'correct';
const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); };

await fetch(base + '/__reset', { method: 'POST' });
const browser = await chromium.launch();
const page = await browser.newPage();
const vis = async (loc) => { try { await loc.first().waitFor({ state: 'visible', timeout: 4000 }); return true; } catch { return false; } };

// REQ-1.1
await page.goto(base + '/');
for (const n of ['Login', 'Shelves', 'Books']) ok(`1.1 link ${n}`, await vis(page.getByRole('link', { name: n, exact: true })) && (await page.getByRole('link', { name: n, exact: true }).count()) === 1);
ok('1.1 search input', await vis(page.getByRole('searchbox')));

async function createBook(name, desc, tags) {
  await page.getByRole('link', { name: 'Books', exact: true }).click();
  await page.getByRole('button', { name: 'Create New Book', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill(desc);
  await page.getByRole('textbox', { name: 'Tags', exact: true }).fill(tags);
  await page.getByRole('button', { name: 'Save Book', exact: true }).click();
}

// REQ-5.3 save + reload + reopen Edit
await createBook('Book Created 5.3.1 r1', 'Book created by corresponding prerequisite behavior.', 'created, book');
ok('5.3.1 heading', await vis(page.getByRole('heading', { name: 'Book Created 5.3.1 r1', exact: true })));
ok('5.3.1 desc', await vis(page.getByText('Book created by corresponding prerequisite behavior.')));
await page.reload();
await page.getByRole('button', { name: 'Edit', exact: true }).click();
ok('5.3.1 name prefill', (await page.getByRole('textbox', { name: 'Name', exact: true }).inputValue()) === 'Book Created 5.3.1 r1');
ok('5.3.1 desc prefill', (await page.getByRole('textbox', { name: 'Description', exact: true }).inputValue()) === 'Book created by corresponding prerequisite behavior.');
ok('5.3.1 tags prefill', (await page.getByRole('textbox', { name: 'Tags', exact: true }).inputValue()) === 'created, book');
// book edit cancel
await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Changed');
await page.getByRole('button', { name: 'Cancel', exact: true }).click();
ok('5.4 cancel keeps', await vis(page.getByRole('heading', { name: 'Book Created 5.3.1 r1', exact: true })));

// REQ-5.3 cancel
await page.getByRole('link', { name: 'Books', exact: true }).click();
await page.getByRole('button', { name: 'Create New Book', exact: true }).click();
await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Book Cancelled 5.3.2 r1');
await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Unsaved book description 5.3.2.');
await page.getByRole('textbox', { name: 'Tags', exact: true }).fill('cancelled, book');
await page.getByRole('button', { name: 'Cancel', exact: true }).click();
ok('5.3.2 back to list', await vis(page.getByRole('region', { name: 'Book list' })));
ok('5.3.2 not created', (await page.getByRole('region', { name: 'Book list' }).getByRole('button', { name: 'Book Cancelled 5.3.2 r1' }).count()) === 0);

// REQ-5.1 / 5.2
await createBook('Book 5.2.1 r1', 'Reference book description.', 'manual, handbook');
await page.getByRole('link', { name: 'Books', exact: true }).click();
const entry = page.getByRole('region', { name: 'Book list' }).getByRole('button', { name: 'Book 5.2.1 r1', exact: true });
await vis(entry);
ok('5.1 exactly one entry', (await entry.count()) === 1);
await entry.focus(); await page.keyboard.press('Enter');
ok('5.2 keyboard open heading', await vis(page.getByRole('heading', { name: 'Book 5.2.1 r1', exact: true })));
ok('5.2 desc', await vis(page.getByText('Reference book description.')));

// REQ-6.1 publish (two pages so D1 can be observed)
async function publish(book, title, body) {
  await page.getByRole('button', { name: 'New Page', exact: true }).click();
  await page.getByRole('textbox', { name: 'Page title', exact: true }).fill(title);
  await page.getByRole('textbox', { name: 'Write your page content here...', exact: true }).fill(body);
  await page.getByRole('button', { name: 'Save Page', exact: true }).click();
  await vis(page.getByRole('heading', { name: book, exact: true }));
}
await createBook('Book 6.3.1 r1', 'Reference book description.', 'manual, handbook');
await publish('Book 6.3.1 r1', 'Page Other 6.3.1 r1', 'Other content.');
await publish('Book 6.3.1 r1', 'Page 6.3.1 r1', 'Reading content for Page 6.3.1.');
const plist = page.getByRole('region', { name: 'Page list' });
ok('6.1 back on book', await vis(page.getByRole('heading', { name: 'Book 6.3.1 r1', exact: true })));
ok('6.1 exactly one entry', (await plist.getByRole('button', { name: 'Page 6.3.1 r1', exact: true }).count()) === 1);
await page.reload();
await vis(page.getByRole('region', { name: 'Page list' }));
ok('6.1 persists reload', (await page.getByRole('region', { name: 'Page list' }).getByRole('button', { name: 'Page 6.3.1 r1', exact: true }).count()) === 1);

// REQ-6.4 read
await page.getByRole('region', { name: 'Page list' }).getByRole('button', { name: 'Page 6.3.1 r1', exact: true }).click();
const readOk = await vis(page.getByRole('heading', { name: 'Page 6.3.1 r1', exact: true })) && await vis(page.getByText('Reading content for Page 6.3.1.'));
ok('6.4.1 read selected page', mode === 'D1' ? !readOk : readOk, mode === 'D1' ? '(expected to FAIL in D1 -> inverted)' : '');
// REQ-6.4 reopen editor
await page.getByRole('button', { name: 'Edit', exact: true }).click();
const t = await page.getByRole('textbox', { name: 'Page title', exact: true }).inputValue();
const b = await page.getByRole('textbox', { name: 'Write your page content here...', exact: true }).inputValue();
const expTitle = mode === 'D1' ? 'Page Other 6.3.1 r1' : 'Page 6.3.1 r1';
const expBody = mode === 'D1' ? 'Other content.' : mode === 'D2' ? '' : 'Reading content for Page 6.3.1.';
ok('6.4.2 title prefill', t === expTitle, t);
ok('6.4.2 body prefill', b === expBody, JSON.stringify(b));
ok('6.4.2 Save Page visible', await vis(page.getByRole('button', { name: 'Save Page', exact: true })));
// save edited page
await page.getByRole('textbox', { name: 'Write your page content here...', exact: true }).fill('Edited body.');
await page.getByRole('button', { name: 'Save Page', exact: true }).click();
await page.waitForURL((u) => !u.pathname.endsWith('/edit'));
ok('edit save shows new body', await vis(page.getByRole('article').getByText('Edited body.')));
await page.reload();
ok('edit save persists', await vis(page.getByRole('article').getByText('Edited body.')));
// back to book via breadcrumb
await page.getByRole('link', { name: 'Book 6.3.1 r1', exact: true }).click();
ok('breadcrumb to book', await vis(page.getByRole('heading', { name: 'Book 6.3.1 r1', exact: true })));

// Shelves stub + login stub reachable
await page.getByRole('link', { name: 'Shelves', exact: true }).click();
ok('shelves list', await vis(page.getByRole('region', { name: 'Shelf list' }).getByRole('button', { name: 'Benchmark Bootstrap Shelf' })));
await page.goto(base + '/');
ok('1.2 home again', await vis(page.getByRole('link', { name: 'Books', exact: true })));
await page.getByRole('link', { name: 'Login', exact: true }).click();
ok('login form', await vis(page.getByRole('textbox', { name: 'Email' })) && !(await page.getByRole('checkbox', { name: 'Remember Me' }).isChecked()));
// dates use business date
await page.goto(base + '/');
ok('business date shown', await vis(page.getByText('6 October 2026')));

await browser.close();
for (const r of results) console.log(r.join('\t'));
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(`${mode}: ${results.length - fails}/${results.length} pass`);
process.exit(fails ? 1 : 0);
