// Throwaway self-check: drives the built app through the in-scope scenarios.
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:39041';
const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, pass: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const sfx = '-' + Date.now().toString(36);
const reset = () => fetch(BASE + '/__reset', { method: 'POST' });

const browser = await chromium.launch();
const page = await browser.newPage();
const card = (t) => page.getByRole('article', { name: t, exact: true });

async function createNote(title, content, { labels = [], pin = false } = {}) {
  await page.getByRole('button', { name: 'Take a note…' }).click();
  const dlg = page.getByRole('dialog', { name: 'New note' });
  await dlg.getByRole('textbox', { name: 'Title' }).fill(title);
  await dlg.getByRole('textbox', { name: 'Note text' }).fill(content);
  if (pin) await dlg.getByRole('button', { name: 'Pin note' }).click();
  if (labels.length) {
    await dlg.getByRole('button', { name: 'Add label' }).click();
    const ch = page.getByRole('dialog', { name: 'Label note' });
    for (const l of labels) await ch.getByRole('checkbox', { name: l }).check();
    await ch.getByRole('button', { name: 'Done' }).click();
  }
  await dlg.getByRole('button', { name: 'Close' }).click();
  await dlg.waitFor({ state: 'detached' });
}
async function waitSaved() { await page.waitForFunction(() => true); await page.waitForTimeout(300); }

try {
  await reset();
  await page.goto(BASE);
  // REQ-1.1
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  ok('1.1 nav visible', await nav.isVisible());
  ok('1.1 toggle expanded', (await page.getByRole('button', { name: 'Main menu' }).getAttribute('aria-expanded')) === 'true');
  ok('1.1 Notes current', (await nav.getByRole('button', { name: 'Notes' }).getAttribute('aria-current')) === 'page');
  for (const n of ['Reminders', 'Edit labels', 'Archive', 'Trash']) ok(`1.1 nav ${n}`, await nav.getByRole('button', { name: n }).isVisible());
  for (const [r, n] of [['searchbox', 'Search notes'], ['button', 'Settings'], ['button', 'List view'], ['button', 'Take a note…']]) ok(`1.1 ${n}`, await page.getByRole(r, { name: n }).isVisible());
  await page.getByRole('button', { name: 'Main menu' }).click();
  ok('1.1 collapsed expanded=false', (await page.getByRole('button', { name: 'Main menu' }).getAttribute('aria-expanded')) === 'false');
  ok('1.1 Notes text hidden', (await nav.getByText('Notes', { exact: true }).count()) === 0);
  for (const n of ['Notes', 'Reminders', 'Archive', 'Trash']) ok(`1.1 collapsed ${n} accessible`, await nav.getByRole('button', { name: n }).isVisible());
  await page.getByRole('button', { name: 'Main menu' }).click();
  ok('1.1 Notes text back', await nav.getByText('Notes', { exact: true }).isVisible());

  // REQ-2.2 autosave
  const t1 = 'New note' + sfx;
  await createNote(t1, 'First line\nSecond line');
  ok('2.2 one card', (await card(t1).count()) === 1);
  ok('2.2 content lines', /First line\nSecond line/.test(await card(t1).innerText()));
  const t2 = 'Persistent note' + sfx;
  await createNote(t2, 'Saved personal content');
  await waitSaved();
  await page.reload();
  ok('2.2 survives reload', (await card(t2).count()) === 1 && (await card(t2).innerText()).includes('Saved personal content'));
  const fromServer = await (await fetch(BASE + '/api/notes')).json();
  ok('2.2 on server', fromServer.filter((n) => n.title === t2).length === 1);

  // REQ-2.1 pinned/others
  const sp = 'Sprint goals' + sfx, gr = 'Groceries' + sfx;
  await createNote(sp, 'Finish the sprint', { pin: true });
  await createNote(gr, 'Milk and bread');
  const pinned = page.getByRole('region', { name: 'Pinned' }), others = page.getByRole('region', { name: 'Others' });
  ok('2.1 pinned section', (await pinned.getByRole('article', { name: sp }).count()) === 1 && (await others.getByRole('article', { name: sp }).count()) === 0);
  ok('2.1 others section', (await others.getByRole('article', { name: gr }).count()) === 1 && (await pinned.getByRole('article', { name: gr }).count()) === 0);

  // REQ-3.1 + 2.8 labels
  const work = 'Work' + sfx, pers = 'Personal' + sfx;
  await nav.getByRole('button', { name: 'Edit labels' }).click();
  const el = page.getByRole('dialog', { name: 'Edit labels' });
  for (const l of [work, pers]) { await el.getByRole('textbox', { name: 'Create new label' }).fill(l); await el.getByRole('button', { name: 'Create label' }).click(); }
  await page.waitForTimeout(200);
  ok('3.1 label field', (await el.getByRole('textbox', { name: `Rename label ${work}` }).inputValue()) === work);
  await el.getByRole('button', { name: 'Done' }).click(); await el.waitFor({ state: 'detached' });
  ok('3.1 sidebar label', (await nav.getByRole('button', { name: work, exact: true }).count()) === 1);
  const tr = 'Team retro add label' + sfx;
  await createNote(tr, 'Retro decisions');
  await card(tr).getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Change labels' }).click();
  const ch = page.getByRole('dialog', { name: 'Label note' });
  await ch.getByRole('checkbox', { name: work }).check(); await ch.getByRole('checkbox', { name: pers }).check();
  await ch.getByRole('button', { name: 'Done' }).click();
  await waitSaved(); await page.reload();
  ok('2.8 labels visible after reload', (await card(tr).innerText()).includes(work) && (await card(tr).innerText()).includes(pers));
  for (const l of [work, pers]) {
    await nav.getByRole('button', { name: l, exact: true }).click();
    ok(`2.8 filter ${l}`, (await page.getByRole('article').count()) === 1 && (await card(tr).innerText()).includes('Retro decisions'));
  }
  // remove label via editor chooser
  await card(tr).getByRole('button', { name: 'Edit note' }).click();
  await page.getByRole('dialog', { name: 'Edit note' }).getByRole('button', { name: 'Add label' }).click();
  await page.getByRole('dialog', { name: 'Label note' }).getByRole('checkbox', { name: work }).uncheck();
  await page.getByRole('dialog', { name: 'Label note' }).getByRole('button', { name: 'Done' }).click();
  await page.getByRole('dialog', { name: 'Edit note' }).getByRole('button', { name: 'Close' }).click();
  await waitSaved(); await page.reload();
  await nav.getByRole('button', { name: work, exact: true }).click();
  ok('2.8 removed from Work', (await card(tr).count()) === 0);
  await nav.getByRole('button', { name: 'Notes' }).click();
  // Reminders create
  const cd = 'Call dentist created' + sfx;
  await createNote(cd, 'Arrange the appointment', { labels: ['Reminders'] });
  await waitSaved();
  ok('2.8 reminder chip', (await card(cd).innerText()).includes('Reminders'));
  await nav.getByRole('button', { name: 'Reminders' }).click();
  ok('2.8 reminders filter', (await card(cd).count()) === 1 && (await page.getByRole('article').count()) === 1);
  await nav.getByRole('button', { name: 'Notes' }).click();

  // REQ-4.1 keyword search
  await reset(); await page.reload();
  const s1 = 'Study schedule' + sfx.replace(/s|t/g, 'x'), r1 = 'Reading plan' + sfx.replace(/s|t/g, 'x'), o1 = 'Ocean memo' + sfx.replace(/s|t/g, 'x');
  await createNote(s1, 'Math on Monday'); await createNote(r1, 'Read a story'); await createNote(o1, 'Calm blue waves');
  const sb = page.getByRole('searchbox', { name: 'Search notes' });
  await sb.click();
  ok('4.1 filters panel on focus', await page.getByRole('region', { name: 'Filter by label' }).isVisible());
  await sb.fill('st');
  ok('4.1 study shown', (await card(s1).count()) === 1);
  ok('4.1 reading shown', (await card(r1).count()) === 1);
  ok('4.1 ocean hidden', (await card(o1).count()) === 0);
  const marksS = await card(s1).locator('mark').allInnerTexts(); const marksR = await card(r1).locator('mark').allInnerTexts();
  ok('4.1 highlights', marksS.length >= 1 && marksR.length >= 1 && [...marksS, ...marksR].every((m) => m.toLowerCase() === 'st'), JSON.stringify([marksS, marksR]));
  const bg = await card(s1).locator('mark').first().evaluate((e) => getComputedStyle(e).backgroundColor);
  ok('4.1 highlight visible bg', bg !== 'rgba(0, 0, 0, 0)', bg);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await nav.getByRole('button', { name: 'Notes' }).click();
  ok('4.1 restore all', (await page.getByRole('article').count()) === 3);

  // REQ-4.1 suggested filter
  const ce = 'Call dentist existing' + sfx, ml = 'Movie list' + sfx;
  await createNote(ce, 'Reminder content', { labels: ['Reminders'] }); await createNote(ml, 'Unlabeled content');
  await sb.click();
  const panel = page.getByRole('region', { name: 'Filter by label' });
  ok('4.1 panel visible', await panel.isVisible());
  await panel.getByRole('button', { name: 'Reminders' }).click();
  ok('4.1 reminders only', (await card(ce).count()) === 1 && (await page.getByRole('article').count()) === 1);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await nav.getByRole('button', { name: 'Notes' }).click();
  ok('4.1 restore both', (await card(ce).count()) === 1 && (await card(ml).count()) === 1 && (await card(ml).innerText()).includes('Unlabeled content'));
  // Trash seeds visible
  await nav.getByRole('button', { name: 'Trash' }).click();
  ok('trash seeds', (await page.getByRole('article').count()) === 2 && (await page.getByText('Deleted Jul 15, 2026').count()) === 1);
  // keyboard: open editor with keyboard
  await nav.getByRole('button', { name: 'Notes' }).click();
  await page.getByRole('button', { name: 'Take a note…' }).focus(); await page.keyboard.press('Enter');
  ok('kbd opens editor', await page.getByRole('dialog', { name: 'New note' }).isVisible());
  await page.keyboard.type('Kbd note' + sfx); await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok('escape autosaves', (await card('Kbd note' + sfx).count()) === 1);
} catch (e) { console.log('ERROR', e.message); results.push({ name: 'exception', pass: false }); }
await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
