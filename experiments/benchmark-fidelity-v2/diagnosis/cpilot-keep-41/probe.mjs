// Manual-style reproduction of Cpilot-keep REQ-4.1 prerequisite (create note with label, then close).
// Mode "human": waits for the label chooser to disappear before clicking Close. Mode "fast": clicks Close right after Done.
import { chromium } from '@playwright/test';
const [base, mode, out] = process.argv.slice(2);
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const log = (...a) => console.log(new Date().toISOString().slice(17, 23), ...a);
await page.goto(base);
await page.getByText('Take a note…').click();
await page.getByRole('textbox', { name: 'Title' }).fill('Call dentist existing');
await page.getByRole('textbox', { name: 'Note text' }).fill('Reminder content');
await page.getByRole('button', { name: 'Add label' }).click();
await page.getByRole('checkbox', { name: 'Reminders' }).check();
await page.getByRole('button', { name: 'Done' }).click();
const dialogs = async (tag) => log(tag, JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('[role=dialog]')).map(d => ({ name: d.getAttribute('aria-labelledby'), vis: d.getBoundingClientRect().width > 0, op: getComputedStyle(d.closest('.MuiDialog-root') || d).opacity, hidden: d.closest('[aria-hidden=true]') ? 1 : 0 })))));
await dialogs('after Done');
if (mode === 'human') { await page.getByRole('dialog', { name: 'Label note' }).waitFor({ state: 'detached' }); await dialogs('chooser gone'); }
// same locator style as M0L: getByRole('dialog', {name:/./}).nth(0) captured before the chooser opened
const surface = page.getByRole('dialog', { name: /./ }).nth(0);
const close = surface.getByRole('button', { name: 'Close', exact: true });
log('close count', await close.count());
await close.click();
log('clicked Close');
await page.waitForTimeout(1500);
await dialogs('1.5s after Close');
await page.screenshot({ path: out });
log('cards', JSON.stringify(await page.locator('body').innerText()).slice(0, 400));
await b.close();
