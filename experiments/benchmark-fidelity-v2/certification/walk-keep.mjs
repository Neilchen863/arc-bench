// Certification walkthrough (independent of methods B/D): hand-written, per-variant steps that a person would do,
// with a screenshot at every obligation point. Output: <out>/NN-*.png + walk.json (raw facts, no verdicts).
// Usage: node walk-keep.mjs <baseURL> <variant N1..N4|X1..X4> <REQ-2.2|REQ-4.1> <outdir>
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const [base, v, req, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.clock.setFixedTime(new Date('2026-07-21T12:00:00.000Z'));
const facts = []; let n = 0;
const shot = async (tag, fact = {}) => { n++; await page.screenshot({ path: `${out}/${String(n).padStart(2, '0')}-${tag}.png` }); facts.push({ n, tag, ...fact }); };
const api = async () => page.evaluate(async () => (await (await fetch('/api/notes')).json()).filter(x => !x.trashed).map(x => ({ title: x.title, content: x.content, labels: x.labels })));
const bodyText = () => page.evaluate(() => document.body.innerText);

// Per-variant manual bindings (what a person clicks).
const B = {
  N1: { open: () => page.getByRole('button', { name: 'Take a note' }).click(), title: () => page.getByRole('textbox', { name: 'Title' }), content: () => page.getByRole('textbox', { name: 'Content' }), close: () => page.locator('section[aria-label="New note"]').getByRole('button', { name: 'Close' }).click() },
  N2: { open: () => page.getByRole('button', { name: 'Take a note…' }).click(), title: () => page.getByRole('textbox', { name: 'Title' }), content: () => page.getByRole('textbox', { name: 'Note text' }), close: () => page.getByRole('dialog', { name: 'New note' }).getByRole('button', { name: 'Close' }).click(), rich: true },
  N3: { open: () => page.getByRole('button', { name: 'Take a note' }).click(), title: () => page.getByRole('textbox', { name: 'Title' }), content: () => page.getByRole('textbox', { name: 'Content' }), close: () => page.getByRole('dialog', { name: 'Note editor' }).getByRole('button', { name: 'Close' }).click(),
    label: async (l) => { await page.getByRole('button', { name: 'Change labels' }).click(); await page.getByRole('dialog', { name: 'Note labels' }).getByRole('button', { name: l }).click(); await page.getByRole('dialog', { name: 'Note labels' }).getByRole('button', { name: 'Done' }).click(); } },
  N4: { open: () => page.getByRole('button', { name: 'Take a note…' }).click(), title: () => page.getByRole('textbox', { name: 'Title' }), content: () => page.getByRole('textbox', { name: 'Note text' }), close: () => page.getByRole('dialog', { name: 'New note' }).getByRole('button', { name: 'Close' }).click(),
    label: async (l) => { await page.getByRole('dialog', { name: 'New note' }).getByRole('button', { name: 'Change labels' }).click(); const ch = page.getByRole('dialog', { name: 'Label note' }); await ch.locator('label.el-checkbox', { hasText: l }).click(); await ch.getByRole('button', { name: 'Done' }).click(); await ch.waitFor({ state: 'hidden' }); } },
  // acceptance (built after protocol/freeze-acceptance.json)
  X1: { open: () => page.getByRole('button', { name: 'Take a note…' }).click(), title: () => page.getByRole('textbox', { name: 'Title' }), content: () => page.getByRole('textbox', { name: 'Note text' }), close: () => page.getByRole('dialog', { name: 'New note' }).getByRole('button', { name: 'Close', exact: true }).click() },
  X2: { open: () => page.getByRole('button', { name: 'New note' }).click(), title: () => page.getByRole('textbox', { name: 'Title' }), content: () => page.getByRole('textbox', { name: 'Note text' }), close: () => page.getByRole('region', { name: 'New note' }).getByRole('button', { name: 'Close', exact: true }).click(), rich: true },
  X3: { open: () => page.getByRole('button', { name: 'Take a note…' }).click(), title: () => page.getByRole('textbox', { name: 'Title' }), content: () => page.getByRole('textbox', { name: 'Note text' }), close: () => page.getByRole('dialog', { name: 'New note' }).getByRole('button', { name: 'Close', exact: true }).click(),
    label: async (l) => { await page.getByRole('dialog', { name: 'New note' }).getByRole('button', { name: 'Add label' }).click(); const ch = page.getByRole('dialog', { name: 'Label note' }); await ch.getByLabel(l).check(); await ch.getByRole('button', { name: 'Done' }).click(); await ch.waitFor({ state: 'hidden' }); } },
  X4: { open: () => page.getByRole('button', { name: 'New note' }).click(), title: () => page.getByRole('textbox', { name: 'Title' }), content: () => page.getByRole('textbox', { name: 'Note text' }), close: () => page.getByRole('dialog', { name: 'New note' }).getByRole('button', { name: 'Close', exact: true }).click(), rich: true,
    label: async (l) => { await page.getByRole('dialog', { name: 'New note' }).getByRole('button', { name: 'Change labels' }).click(); const ch = page.getByRole('dialog', { name: 'Note labels' }); await ch.getByRole('switch', { name: l }).click(); await ch.getByRole('button', { name: 'Done' }).click(); await ch.waitFor({ state: 'hidden' }); } },
};
const V = B[v];
async function create(title, content, labels = []) {
  await V.open();
  await V.title().fill(title);
  if (V.rich) { await V.content().click(); for (const [i, line] of content.split('\n').entries()) { if (i) await page.keyboard.press('Enter'); await page.keyboard.type(line); } }
  else await V.content().fill(content);
  if (labels.length) await V.label(labels[0]);
  await page.waitForTimeout(300);
  await V.close();
  await page.waitForTimeout(800);
}

await page.goto(base);
if (req === 'REQ-2.2') {
  await create('New note W1', 'First line\nSecond line');
  await shot('after-close', { editors_open: await page.locator('[role=dialog]:visible').count(), api: await api(), text: (await bodyText()).slice(0, 800) });
  await page.reload(); await page.waitForTimeout(1000);
  await shot('after-reload', { api: await api(), text: (await bodyText()).slice(0, 800) });
} else {
  await create('Study schedule W1', 'Math on Monday');
  await create('Reading plan W1', 'Read a story');
  await create('Ocean memo W1', 'Calm blue waves');
  const box = page.getByRole('searchbox').or(page.getByRole('textbox', { name: /search/i })).or(page.getByPlaceholder(/search/i));
  await box.fill('st'); await page.waitForTimeout(800);
  const marks = await page.evaluate(() => Array.from(document.querySelectorAll('mark,[class*=highlight],[aria-label^=Highlight]')).map(e => ({ text: e.textContent, bg: getComputedStyle(e).backgroundColor, fw: getComputedStyle(e).fontWeight })));
  await shot('search-st', { text: (await bodyText()).slice(0, 1200), marks });
  await box.fill(''); await page.getByRole('navigation').or(page.locator('aside')).getByText('Notes', { exact: true }).first().click(); await page.waitForTimeout(600);
  await shot('cleared-notes', { text: (await bodyText()).slice(0, 1200) });
  await page.reload();
  await create('Call dentist W1', 'Reminder content', ['Reminders']);
  await create('Movie list W1', 'Unlabeled content');
  await shot('labelled-created', { api: await api() });
  await box.click(); await page.waitForTimeout(600);
  await shot('search-focused', { text: (await bodyText()).slice(0, 1200) });
  await page.getByText('Filter by label').locator('xpath=..').getByText('Reminders', { exact: true }).or(page.getByRole('region', { name: /suggest/i }).getByText('Reminders', { exact: true })).first().click();
  await page.waitForTimeout(800);
  await shot('reminders-filter', { text: (await bodyText()).slice(0, 1200) });
  await box.fill(''); await page.getByRole('navigation').or(page.locator('aside')).getByText('Notes', { exact: true }).first().click(); await page.waitForTimeout(600);
  await shot('cleared-notes-2', { text: (await bodyText()).slice(0, 1200) });
}
fs.writeFileSync(`${out}/walk.json`, JSON.stringify(facts, null, 1));
await b.close();
