// Throwaway self-check: drives the built app through every in-scope scenario.
import { chromium } from 'playwright';
import os from 'node:os';

const BASE = process.env.BASE || 'http://127.0.0.1:39021';
const exe = `${os.homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const suffix = `-${Date.now() % 100000}`;

await fetch(`${BASE}/__reset`, { method: 'POST' });
const browser = await chromium.launch({ executablePath: process.env.EXE || exe });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(BASE);

const nav = page.getByRole('navigation', { name: 'Main navigation' });
const menu = page.getByRole('button', { name: 'Main menu' });
const card = t => page.getByRole('article', { name: t, exact: true });

// REQ-1.1
await nav.waitFor();
check('1.1 sidebar expanded', (await menu.getAttribute('aria-expanded')) === 'true');
check('1.1 Notes current', (await nav.getByRole('button', { name: 'Notes' }).getAttribute('aria-current')) === 'page');
for (const n of ['Reminders', 'Edit labels', 'Archive', 'Trash']) check(`1.1 nav ${n}`, await nav.getByRole('button', { name: n }).isVisible());
check('1.1 searchbox', await page.getByRole('searchbox', { name: 'Search notes' }).isVisible());
for (const n of ['Settings', 'List view', 'Take a note…']) check(`1.1 ${n}`, await page.getByRole('button', { name: n }).isVisible());
await menu.click();
check('1.1 collapsed', (await menu.getAttribute('aria-expanded')) === 'false');
check('1.1 Notes text hidden', !(await nav.getByText('Notes', { exact: true }).isVisible()));
for (const n of ['Notes', 'Reminders', 'Archive', 'Trash']) check(`1.1 collapsed ${n} accessible`, await nav.getByRole('button', { name: n }).isVisible());
await menu.click();
check('1.1 expanded again', (await menu.getAttribute('aria-expanded')) === 'true' && await nav.getByText('Notes', { exact: true }).isVisible());

// Element Plus keeps the native checkbox input visually hidden; users click the label.
async function toggle(dlg, name, want) {
  const box = dlg.getByRole('checkbox', { name, exact: true });
  await dlg.locator('label.el-checkbox', { hasText: name }).first().waitFor();
  if ((await box.isChecked()) !== want) await dlg.locator('label.el-checkbox').filter({ has: page.getByText(name, { exact: true }) }).click();
  if ((await box.isChecked()) !== want) throw new Error('toggle failed ' + name);
}

async function createNote(title, content, { pin = false, labels = [], closeWith = 'button' } = {}) {
  await page.getByRole('button', { name: 'Take a note…' }).click();
  const dlg = page.getByRole('dialog', { name: 'New note' });
  await dlg.waitFor();
  await dlg.getByRole('textbox', { name: 'Title' }).fill(title);
  await dlg.getByRole('textbox', { name: 'Note text' }).fill(content);
  if (pin) await dlg.getByRole('button', { name: 'Pin note' }).click();
  if (labels.length) {
    await dlg.getByRole('button', { name: 'Change labels' }).click();
    const ch = page.getByRole('dialog', { name: 'Label note' });
    for (const l of labels) await toggle(ch, l, true);
    await ch.getByRole('button', { name: 'Done' }).click();
    await ch.waitFor({ state: 'hidden' });
  }
  if (closeWith === 'escape') await page.keyboard.press('Escape');
  else await dlg.getByRole('button', { name: 'Close', exact: true }).click();
  await dlg.waitFor({ state: 'hidden' });
}

// REQ-2.2 autosave
const t1 = `New note${suffix}`;
await createNote(t1, 'First line\nSecond line');
await card(t1).waitFor();
check('2.2 one card', (await card(t1).count()) === 1);
const txt = await card(t1).locator('.note-content').innerText();
check('2.2 two lines', txt === 'First line\nSecond line', JSON.stringify(txt));
const t2 = `Persistent note${suffix}`;
await createNote(t2, 'Saved personal content');
await page.reload();
await card(t2).waitFor();
check('2.2 persists after reload', (await card(t2).count()) === 1 && (await card(t2).innerText()).includes('Saved personal content'));
const t2b = `Escape note${suffix}`;
await createNote(t2b, 'Closed by Escape', { closeWith: 'escape' });
check('2.2 Escape also saves', (await card(t2b).count()) === 1);

// REQ-2.1
await createNote(`Sprint goals${suffix}`, 'Finish the sprint', { pin: true });
await createNote(`Groceries${suffix}`, 'Milk and bread');
const pinned = page.getByRole('region', { name: 'Pinned' }), others = page.getByRole('region', { name: 'Others' });
check('2.1 sections once', (await pinned.count()) === 1 && (await others.count()) === 1);
check('2.1 sprint pinned only', (await pinned.getByRole('article', { name: `Sprint goals${suffix}` }).count()) === 1 && (await others.getByRole('article', { name: `Sprint goals${suffix}` }).count()) === 0);
check('2.1 groceries other only', (await others.getByRole('article', { name: `Groceries${suffix}` }).count()) === 1 && (await pinned.getByRole('article', { name: `Groceries${suffix}` }).count()) === 0);

// REQ-3.1 / 2.8 labels
const work = `Work${suffix}`, personal = `Personal${suffix}`;
await nav.getByRole('button', { name: 'Edit labels' }).click();
const el = page.getByRole('dialog', { name: 'Edit labels' });
for (const l of [work, personal]) {
  await el.getByRole('textbox', { name: 'New label name' }).fill(l);
  await el.getByRole('button', { name: 'Create label' }).click();
  await el.getByRole('textbox', { name: `Label name ${l}` }).waitFor();
}
await el.getByRole('button', { name: 'Done' }).click();
await el.waitFor({ state: 'hidden' });
check('3.1 sidebar labels', (await nav.getByRole('button', { name: work, exact: true }).count()) === 1);

const retro = `Team retro add label${suffix}`;
await createNote(retro, 'Retro decisions');
await card(retro).getByRole('button', { name: `More options for ${retro}` }).click();
await page.getByRole('menuitem', { name: 'Change labels' }).click();
const ch = page.getByRole('dialog', { name: 'Label note' });
await toggle(ch, work, true);
await toggle(ch, personal, true);
await ch.getByRole('button', { name: 'Done' }).click();
await page.reload();
await card(retro).waitFor();
check('2.8 labels visible after reload', (await card(retro).getByText(work, { exact: true }).isVisible()) && (await card(retro).getByText(personal, { exact: true }).isVisible()));
for (const l of [work, personal]) {
  await nav.getByRole('button', { name: l, exact: true }).click();
  const arts = page.getByRole('article');
  check(`2.8 filter ${l}`, (await arts.count()) === 1 && (await card(retro).innerText()).includes('Retro decisions'));
}
await nav.getByRole('button', { name: 'Notes' }).click();

// remove label through editor
const rem = `Team retro remove label${suffix}`, keepN = `Other Work note${suffix}`;
await createNote(rem, 'Remove membership', { labels: [work] });
await createNote(keepN, 'Keep membership', { labels: [work] });
await card(rem).getByRole('button', { name: `Edit ${rem}` }).click();
const ed = page.getByRole('dialog', { name: 'Edit note' });
await ed.getByRole('button', { name: 'Change labels' }).click();
await toggle(page.getByRole('dialog', { name: 'Label note' }), work, false);
await page.getByRole('dialog', { name: 'Label note' }).getByRole('button', { name: 'Done' }).click();
await ed.getByRole('button', { name: 'Close', exact: true }).click();
await ed.waitFor({ state: 'hidden' });
await page.reload();
await card(rem).waitFor();
check('2.8 label removed', !(await card(rem).getByText(work, { exact: true }).count()));
await nav.getByRole('button', { name: work, exact: true }).click();
check('2.8 work filter', (await card(rem).count()) === 0 && (await card(keepN).count()) === 1);
await nav.getByRole('button', { name: 'Notes' }).click();

// Reminders on creation
const dent = `Call dentist created${suffix}`;
await createNote(dent, 'Arrange the appointment', { labels: ['Reminders'] });
check('2.8 carries Reminders', await card(dent).getByText('Reminders', { exact: true }).isVisible());
await nav.getByRole('button', { name: 'Reminders' }).click();
check('2.8 reminders filter', (await page.getByRole('article').count()) === 1 && (await card(dent).count()) === 1);
await nav.getByRole('button', { name: 'Notes' }).click();

// REQ-4.1 keyword search
const ss = `Study schedule${suffix}`, rp = `Reading plan${suffix}`, om = `Ocean memo${suffix}`;
await createNote(ss, 'Math on Monday');
await createNote(rp, 'Read a story');
await createNote(om, 'Calm blue waves');
const sb = page.getByRole('searchbox', { name: 'Search notes' });
await sb.fill('st');
await page.waitForTimeout(200);
check('4.1 study shown', (await card(ss).count()) === 1);
check('4.1 reading shown', (await card(rp).count()) === 1);
check('4.1 ocean hidden', (await card(om).count()) === 0);
for (const t of [ss, rp]) {
  const marks = await card(t).locator('mark').allInnerTexts();
  const bg = await card(t).locator('mark').first().evaluate(e => getComputedStyle(e).backgroundColor);
  check(`4.1 highlight in ${t}`, marks.length >= 1 && marks.every(m => m.toLowerCase() === 'st'), `${JSON.stringify(marks)} ${bg}`);
}
const allMatch = await page.getByRole('article').evaluateAll(as => as.map(a => a.innerText.toLowerCase().includes('st')));
check('4.1 every result matches', allMatch.every(Boolean));
await page.getByRole('button', { name: 'Clear search' }).click();
await nav.getByRole('button', { name: 'Notes' }).click();
check('4.1 restored', (await card(ss).count()) === 1 && (await card(rp).count()) === 1 && (await card(om).count()) === 1 && (await card(om).innerText()).includes('Calm blue waves'));

// REQ-4.1 suggested filter
const cde = `Call dentist existing${suffix}`, ml = `Movie list${suffix}`;
await createNote(cde, 'Reminder content', { labels: ['Reminders'] });
await createNote(ml, 'Unlabeled content');
await sb.focus();
const sug = page.getByRole('region', { name: 'Filter by label' });
check('4.1 suggestions on focus', await sug.isVisible());
await sug.getByRole('button', { name: 'Reminders' }).click();
await page.waitForTimeout(200);
check('4.1 reminders only', (await card(cde).count()) === 1 && (await card(ml).count()) === 0 && (await page.getByRole('article').evaluateAll(as => as.length)) === 2 /* + dentist created */);
await page.getByRole('button', { name: 'Clear search' }).click();
await nav.getByRole('button', { name: 'Notes' }).click();
check('4.1 restored both', (await card(cde).count()) === 1 && (await card(ml).count()) === 1 && (await card(ml).innerText()).includes('Unlabeled content'));

// layout toggle + trash seed
await page.getByRole('button', { name: 'List view' }).click();
check('layout list', await page.getByRole('button', { name: 'Grid view' }).isVisible());
await page.getByRole('button', { name: 'Grid view' }).click();
await nav.getByRole('button', { name: 'Trash' }).click();
check('trash seeds + business date', (await page.getByText('Deleted Jul 14, 2026').count()) === 1);
await nav.getByRole('button', { name: 'Notes' }).click();

await page.screenshot({ path: 'notes.png', fullPage: true });
await browser.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
