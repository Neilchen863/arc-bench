// requirement: keep.REQ-2.2 (S1 layered contract). Orchestration only: operations -> observations -> oracle core.
import { test } from '@playwright/test';
import { K22, identity, benchmarkNow } from './lib/inputs';
import * as O from './lib/oracle';
import { eventually, eventuallyHidden } from './lib/adapt';
import { captureOnFailure } from './lib/evidence';
import { openHome, beginNote, fillNote, closeEditor } from './lib/operations';
import { note, editorState, editorClosedByTitle } from './lib/observe';

captureOnFailure();

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(benchmarkNow)); });

test('autosave_on_close', async ({ page }, info) => {
  const title = identity(info, K22.autosave.base);
  await openHome(page);
  const ed = await beginNote(page);
  await fillNote(page, ed, title, K22.autosave.content);
  await closeEditor(ed);
  // Wait for editor to close using both locator visibility and DOM presence checks.
  await eventuallyHidden(ed.surface, 10_000);
  await eventually(() => editorClosedByTitle(page, title), e => {
    if (!e.closed) throw new Error(`editor still present (${e.evidence})`);
  }, 10_000);
  await eventually(() => note(page, title), n => O.exactlyOneVisible('K22-O2', n));
  const n = await note(page, title);
  O.showsTitle('K22-O3', n);
  await eventually(() => note(page, title), n => O.showsLines('K22-O4', n, K22.autosave.content));
});

test('persist_after_reload', async ({ page }, info) => {
  const title = identity(info, K22.persist.base);
  await openHome(page);
  const ed = await beginNote(page);
  await fillNote(page, ed, title, K22.persist.content);
  await closeEditor(ed);
  // Wait for editor to close using both locator visibility and DOM presence checks.
  await eventuallyHidden(ed.surface, 10_000);
  await eventually(() => editorClosedByTitle(page, title), e => {
    if (!e.closed) throw new Error(`editor still present (${e.evidence})`);
  }, 10_000);
  await eventually(() => note(page, title), n => O.exactlyOneVisible('K22-O2', n));
  await page.reload();
  await eventually(() => note(page, title), n => { O.exactlyOneVisible('K22-O6', n); O.showsLines('K22-O6', n, K22.persist.content); }, 15_000);
});
