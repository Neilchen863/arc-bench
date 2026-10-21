import { test, expect } from '@playwright/test';

const sfx = () => ` ${Date.now().toString(36)}`.replace(/s|t/gi, 'x');

test.beforeEach(async ({ request, page }) => {
  await request.post('/__reset');
  await page.goto('/');
});

async function createNote(page, title, content, opts = {}) {
  await page.getByRole('button', { name: 'Take a note', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Note editor' });
  await dlg.getByRole('textbox', { name: 'Title' }).fill(title);
  await dlg.getByRole('textbox', { name: 'Content' }).fill(content);
  if (opts.pin) await dlg.getByRole('button', { name: 'Pin note' }).click();
  if (opts.labels) {
    await dlg.getByRole('button', { name: 'Change labels' }).click();
    const ch = page.getByRole('dialog', { name: 'Note labels' });
    for (const l of opts.labels) await ch.getByRole('checkbox', { name: l, exact: true }).check();
    await ch.getByRole('button', { name: 'Done' }).click();
    await expect(ch).toBeHidden();
  }
  await dlg.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dlg).toBeHidden();
}

async function createLabel(page, name) {
  await page.getByRole('navigation', { name: 'Sidebar' }).getByRole('button', { name: 'Edit Labels' }).click();
  const d = page.getByRole('dialog', { name: 'Edit Labels' });
  await d.getByRole('textbox', { name: 'New label' }).fill(name);
  await d.getByRole('button', { name: 'Create label' }).click();
  await expect(d.getByRole('textbox', { name: `Label name ${name}` })).toHaveValue(name);
  await d.getByRole('button', { name: 'Done' }).click();
  await expect(d).toBeHidden();
}

test('REQ-1.1 open workspace + toggle sidebar', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Sidebar' });
  await expect(nav).toBeVisible();
  const toggle = page.getByRole('button', { name: 'Toggle sidebar' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('button', { name: 'Notes' })).toHaveAttribute('aria-current', 'true');
  for (const n of ['Reminders', 'Archived', 'Trash', 'Edit Labels']) await expect(nav.getByRole('button', { name: n })).toBeVisible();
  for (const n of ['Settings menu', 'List view', 'Take a note']) await expect(page.getByRole('button', { name: n })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search' })).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByText('Notes', { exact: true })).toBeHidden();
  for (const n of ['Notes', 'Reminders', 'Archived', 'Trash']) await expect(nav.getByRole('button', { name: n })).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByText('Notes', { exact: true })).toBeVisible();
});

test('REQ-2.2 autosave on close', async ({ page }) => {
  const t = 'New note' + sfx();
  await createNote(page, t, 'First line\nSecond line');
  const r = page.getByRole('region', { name: t, exact: true });
  await expect(r).toHaveCount(1);
  await expect(r).toContainText(t);
  await expect(r).toContainText('First line');
  await expect(r).toContainText('Second line');
});

test('REQ-2.2 keep after reload', async ({ page }) => {
  const t = 'Persistent note' + sfx();
  await createNote(page, t, 'Saved personal content');
  await page.reload();
  const r = page.getByRole('region', { name: t, exact: true });
  await expect(r).toHaveCount(1);
  await expect(r).toContainText('Saved personal content');
});

test('REQ-2.1 pinned vs others', async ({ page }) => {
  const a = 'Sprint goals' + sfx(), b = 'Groceries' + sfx();
  await createNote(page, a, 'Finish the sprint', { pin: true });
  await createNote(page, b, 'Milk and bread');
  const pinned = page.getByRole('region', { name: 'Pinned notes' });
  const other = page.getByRole('region', { name: 'Other notes' });
  await expect(pinned).toHaveCount(1);
  await expect(other).toHaveCount(1);
  await expect(pinned.getByRole('region', { name: a })).toHaveCount(1);
  await expect(other.getByRole('region', { name: a })).toHaveCount(0);
  await expect(other.getByRole('region', { name: b })).toHaveCount(1);
  await expect(pinned.getByRole('region', { name: b })).toHaveCount(0);
});

test('REQ-2.8 labels via More options + sidebar filter', async ({ page }) => {
  const s = sfx(), work = 'Work' + s, pers = 'Personal' + s, t = 'Team retro add label' + s;
  await createLabel(page, work);
  await createLabel(page, pers);
  await createNote(page, t, 'Retro decisions');
  const r = page.getByRole('region', { name: t });
  await r.hover();
  await r.getByRole('button', { name: `More options ${t}` }).click();
  await page.getByRole('menuitem', { name: 'Change labels' }).click();
  const ch = page.getByRole('dialog', { name: 'Note labels' });
  await ch.getByRole('checkbox', { name: work }).check();
  await ch.getByRole('checkbox', { name: pers }).check();
  await ch.getByRole('button', { name: 'Done' }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: t })).toContainText(work);
  await expect(page.getByRole('region', { name: t })).toContainText(pers);
  const nav = page.getByRole('navigation', { name: 'Sidebar' });
  for (const l of [work, pers]) {
    await nav.getByRole('button', { name: l }).click();
    await expect(nav.getByRole('button', { name: l })).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('region', { name: t })).toHaveCount(1);
    await expect(page.getByRole('region', { name: t })).toContainText('Retro decisions');
  }
});

test('REQ-2.8 remove label via editor', async ({ page }) => {
  const s = sfx(), work = 'Work' + s, a = 'Team retro remove label' + s, b = 'Other Work note' + s;
  await createLabel(page, work);
  await createNote(page, a, 'Remove membership', { labels: [work] });
  await createNote(page, b, 'Keep membership', { labels: [work] });
  await page.getByRole('button', { name: `Open ${a}` }).click();
  const dlg = page.getByRole('dialog', { name: 'Note editor' });
  await expect(dlg.getByRole('textbox', { name: 'Title' })).toHaveValue(a);
  await dlg.getByRole('button', { name: 'Change labels' }).click();
  const ch = page.getByRole('dialog', { name: 'Note labels' });
  await ch.getByRole('checkbox', { name: work }).uncheck();
  await ch.getByRole('button', { name: 'Done' }).click();
  await dlg.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: a })).not.toContainText(work);
  await page.getByRole('navigation', { name: 'Sidebar' }).getByRole('button', { name: work }).click();
  await expect(page.getByRole('region', { name: a })).toHaveCount(0);
  await expect(page.getByRole('region', { name: b })).toHaveCount(1);
  await expect(page.getByRole('region', { name: b })).toContainText('Keep membership');
});

test('REQ-2.8 create note with Reminders', async ({ page }) => {
  const t = 'Call dentist created' + sfx();
  await createNote(page, t, 'Arrange the appointment', { labels: ['Reminders'] });
  await expect(page.getByRole('region', { name: t })).toContainText('Reminders');
  await page.getByRole('navigation', { name: 'Sidebar' }).getByRole('button', { name: 'Reminders' }).click();
  await expect(page.getByRole('region', { name: t })).toHaveCount(1);
  await expect(page.getByRole('region', { name: t })).toContainText('Arrange the appointment');
});

test('REQ-4.1 keyword search + highlights', async ({ page }) => {
  const s = sfx(), a = 'Study schedule' + s, b = 'Reading plan' + s, c = 'Ocean memo' + s;
  await createNote(page, a, 'Math on Monday');
  await createNote(page, b, 'Read a story');
  await createNote(page, c, 'Calm blue waves');
  const box = page.getByRole('searchbox', { name: 'Search' });
  await box.fill('st');
  await expect(page.getByRole('region', { name: a })).toHaveCount(1);
  await expect(page.getByRole('region', { name: b })).toHaveCount(1);
  await expect(page.getByRole('region', { name: c })).toHaveCount(0);
  for (const t of [a, b]) {
    const hs = page.getByRole('region', { name: t }).getByRole('region', { name: 'Highlight st' });
    await expect(hs.first()).toBeVisible();
    for (const h of await hs.all()) expect((await h.textContent()).toLowerCase()).toBe('st');
  }
  await box.fill('');
  await page.getByRole('navigation', { name: 'Sidebar' }).getByRole('button', { name: 'Notes' }).click();
  for (const [t, ct] of [[a, 'Math on Monday'], [b, 'Read a story'], [c, 'Calm blue waves']]) {
    await expect(page.getByRole('region', { name: t })).toHaveCount(1);
    await expect(page.getByRole('region', { name: t })).toContainText(ct);
  }
});

test('REQ-4.1 suggested Reminders filter', async ({ page }) => {
  const s = sfx(), a = 'Call dentist existing' + s, b = 'Movie list' + s;
  await createNote(page, a, 'Reminder content', { labels: ['Reminders'] });
  await createNote(page, b, 'Unlabeled content');
  await page.getByRole('searchbox', { name: 'Search' }).focus();
  const sug = page.getByRole('region', { name: 'Suggested filters' });
  await expect(sug).toBeVisible();
  await sug.getByRole('button', { name: 'Reminders' }).click();
  await expect(page.getByRole('region', { name: a })).toHaveCount(1);
  await expect(page.getByRole('region', { name: b })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search' }).fill('');
  await page.getByRole('navigation', { name: 'Sidebar' }).getByRole('button', { name: 'Notes' }).click();
  await expect(page.getByRole('region', { name: a })).toContainText('Reminder content');
  await expect(page.getByRole('region', { name: b })).toContainText('Unlabeled content');
});

test('Trash retention + delete', async ({ page }) => {
  const t = 'Delete me' + sfx();
  await createNote(page, t, 'Recently deleted content');
  await page.getByRole('region', { name: t }).hover();
  await page.getByRole('button', { name: `More options ${t}` }).click();
  await page.getByRole('menuitem', { name: 'Delete Note' }).click();
  await expect(page.getByRole('status', { name: 'Note deleted' })).toBeVisible();
  await expect(page.getByRole('region', { name: t })).toHaveCount(0);
  await page.getByRole('button', { name: 'Trash' }).click();
  const del = page.getByRole('region', { name: 'Deleted notes' });
  await expect(del.getByRole('region', { name: t })).toContainText('Recently deleted content');
  await expect(del.getByRole('region', { name: 'Recent six-day note' })).toHaveCount(1);
  await expect(del.getByRole('region', { name: 'Expired seven-day note' })).toHaveCount(0);
});
