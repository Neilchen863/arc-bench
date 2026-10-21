// requirement: keep.REQ-2.2 — method B (M0L aligned to B1). M0L locating/operation/observation strategy unchanged;
// common changes only: B1-C01 editor-closed observation (editing-obs.ts) and the common ledger (ledger.ts).
import { test } from '@playwright/test';
import { K22, identity, benchmarkNow } from './lib/inputs';
import * as O from './lib/oracle';
import { ob, plan, step } from './lib/ledger';
import { editingState } from './lib/editing-obs';
import { captureOnFailure } from './lib/evidence';
import { openHome, beginNote, fillNote, closeEditor } from './lib/operations';
import { note } from './lib/observe';

captureOnFailure();

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(benchmarkNow)); });

test('autosave_on_close', async ({ page }, info) => {
  plan(['K22-O1', 'K22-O2', 'K22-O3', 'K22-O4', 'K22-O5']);
  const title = identity(info, K22.autosave.base), content = K22.autosave.content;
  step('open home'); await openHome(page);
  step('open editor'); const ed = await beginNote(page);
  step('enter note'); await fillNote(page, ed, title, content);
  step('dismiss editor'); await closeEditor(ed);
  await ob('K22-O5', () => 'close action only (operation layer refuses save-like controls)', () => {}, 0);
  await ob('K22-O1', () => editingState(page, ed.surface, title, content), e => O.editorClosed('K22-O1', e));
  await ob('K22-O2', () => note(page, title), n => O.exactlyOneVisible('K22-O2', n));
  await ob('K22-O3', () => note(page, title), n => O.showsTitle('K22-O3', n), 0);
  await ob('K22-O4', () => note(page, title), n => O.showsLines('K22-O4', n, content));
});

test('persist_after_reload', async ({ page }, info) => {
  plan(['K22-O1', 'K22-O2', 'K22-O6']);
  const title = identity(info, K22.persist.base), content = K22.persist.content;
  step('open home'); await openHome(page);
  step('open editor'); const ed = await beginNote(page);
  step('enter note'); await fillNote(page, ed, title, content);
  step('dismiss editor'); await closeEditor(ed);
  await ob('K22-O1', () => editingState(page, ed.surface, title, content), e => O.editorClosed('K22-O1', e));
  await ob('K22-O2', () => note(page, title), n => O.exactlyOneVisible('K22-O2', n));
  step('reload'); await page.reload();
  await ob('K22-O6', () => note(page, title), n => { O.exactlyOneVisible('K22-O6', n); O.showsLines('K22-O6', n, content); }, 15_000);
});
