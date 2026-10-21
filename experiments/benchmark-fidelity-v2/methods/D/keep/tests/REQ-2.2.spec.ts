// requirement: keep.REQ-2.2 — method D (capability interface + generic control drivers). Same scenario, inputs,
// obligations and oracle as method B; only the operation/binding/observation implementation differs.
import { test } from '@playwright/test';
import { K22, identity, benchmarkNow } from './lib/inputs';
import * as O from './lib/oracle';
import { ob, plan, step } from './lib/ledger';
import { editingState } from './lib/editing-obs';
import { captureOnFailure } from './lib/evidence';
import { openHome, openNoteEditor, enterNoteContent, dismissNoteEditor } from './lib/capabilities';
import { note } from './lib/observe';

captureOnFailure();

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(benchmarkNow)); });

test('autosave_on_close', async ({ page }, info) => {
  plan(['K22-O1', 'K22-O2', 'K22-O3', 'K22-O4', 'K22-O5']);
  const title = identity(info, K22.autosave.base), content = K22.autosave.content;
  step('open home'); await openHome(page);
  step('open editor'); const ed = await openNoteEditor(page);
  step('enter note'); await enterNoteContent(page, ed, title, content);
  step('dismiss editor'); await dismissNoteEditor(page, ed);
  await ob('K22-O5', () => 'close action only (dismissNoteEditor refuses save-like controls)', () => {}, 0);
  await ob('K22-O1', () => editingState(page, ed.surface, title, content), e => O.editorClosed('K22-O1', e));
  await ob('K22-O2', () => note(page, title), n => O.exactlyOneVisible('K22-O2', n));
  await ob('K22-O3', () => note(page, title), n => O.showsTitle('K22-O3', n), 0);
  await ob('K22-O4', () => note(page, title), n => O.showsLines('K22-O4', n, content));
});

test('persist_after_reload', async ({ page }, info) => {
  plan(['K22-O1', 'K22-O2', 'K22-O6']);
  const title = identity(info, K22.persist.base), content = K22.persist.content;
  step('open home'); await openHome(page);
  step('open editor'); const ed = await openNoteEditor(page);
  step('enter note'); await enterNoteContent(page, ed, title, content);
  step('dismiss editor'); await dismissNoteEditor(page, ed);
  await ob('K22-O1', () => editingState(page, ed.surface, title, content), e => O.editorClosed('K22-O1', e));
  await ob('K22-O2', () => note(page, title), n => O.exactlyOneVisible('K22-O2', n));
  step('reload'); await page.reload();
  await ob('K22-O6', () => note(page, title), n => { O.exactlyOneVisible('K22-O6', n); O.showsLines('K22-O6', n, content); }, 15_000);
});
