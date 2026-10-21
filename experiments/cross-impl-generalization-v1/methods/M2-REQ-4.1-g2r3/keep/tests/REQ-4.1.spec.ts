// requirement: keep.REQ-4.1 (S1 layered contract). Prerequisites use the same operation layer (REQ-2.2, REQ-2.8).
import { test, type Page } from '@playwright/test';
import { K41, identity, benchmarkNow } from './lib/inputs';
import * as O from './lib/oracle';
import { eventually } from './lib/adapt';
import { captureOnFailure } from './lib/evidence';
import { openHome, beginNote, fillNote, closeEditor, chooseLabelsInEditor, searchBox, chooseSuggested, clearSearch, navigate } from './lib/operations';
import { note, editorState, highlights, suggestionPanel } from './lib/observe';

captureOnFailure();

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(benchmarkNow)); });

// Prerequisite creation; failures here are prerequisite failures (reported with the P obligation id).
async function create(page: Page, title: string, content: string, labels: string[] = []) {
  const ed = await beginNote(page);
  await fillNote(page, ed, title, content);
  if (labels.length) await chooseLabelsInEditor(page, ed, labels);
  await closeEditor(ed);
  await eventually(() => editorState(ed.surface), e => O.editorClosed('K41-P1', e));
  await eventually(() => note(page, title), n => { O.exactlyOneVisible('K41-P1', n); O.showsLines('K41-P1', n, content); });
}

test('search_title_content_highlight', async ({ page }, info) => {
  const t = identity(info, K41.titleMatch.base), c = identity(info, K41.contentMatch.base), o = identity(info, K41.other.base);
  await openHome(page);
  await create(page, t, K41.titleMatch.content);
  await create(page, c, K41.contentMatch.content);
  await create(page, o, K41.other.content);
  await (await searchBox(page)).fill(K41.keyword);
  await eventually(() => note(page, o, K41.keyword), n => O.hidden('K41-O3', n));
  await eventually(() => note(page, t, K41.keyword), n => O.exactlyOneVisible('K41-O1', n));
  await eventually(() => note(page, c, K41.keyword), n => O.exactlyOneVisible('K41-O2', n));
  for (const title of [t, c]) {
    await eventually(() => highlights(page, title, K41.keyword), hs => O.highlighted('K41-O4', title, hs, K41.keyword));
  }
  await clearSearch(page);
  await navigate(page, 'Notes');
  for (const [title, content] of [[t, K41.titleMatch.content], [c, K41.contentMatch.content], [o, K41.other.content]]) {
    await eventually(() => note(page, title), n => { O.exactlyOneVisible('K41-O5', n); O.showsLines('K41-O5', n, content); });
  }
});

test('suggested_label_filter', async ({ page }, info) => {
  const m = identity(info, K41.labeled.base), u = identity(info, K41.unlabeled.base);
  await openHome(page);
  await create(page, m, K41.labeled.content, [K41.labeled.label]);
  await create(page, u, K41.unlabeled.content);
  const box = await searchBox(page);
  await box.click();
  let panel: Awaited<ReturnType<typeof suggestionPanel>> = { shown: false, evidence: '', panel: null };
  await eventually(async () => (panel = await suggestionPanel(page)), p => O.panelShown('K41-O6', p.shown, p.evidence));
  await chooseSuggested(page, panel.panel!, K41.labeled.label);
  await eventually(() => note(page, u, K41.labeled.label), n => O.hidden('K41-O7', n));
  await eventually(() => note(page, m, K41.labeled.label), n => { O.exactlyOneVisible('K41-O7', n); O.showsLines('K41-O7', n, K41.labeled.content); });
  await clearSearch(page);
  await navigate(page, 'Notes');
  for (const [title, content] of [[m, K41.labeled.content], [u, K41.unlabeled.content]]) {
    await eventually(() => note(page, title), n => { O.exactlyOneVisible('K41-O8', n); O.showsLines('K41-O8', n, content); });
  }
});
