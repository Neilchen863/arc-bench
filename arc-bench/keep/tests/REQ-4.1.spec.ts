// requirement: keep.REQ-4.1 — method D. Prerequisites use the same capability interface (REQ-2.2, REQ-2.8).
import { test, type Page } from '@playwright/test';
import { K41, identity, benchmarkNow } from './lib/inputs';
import * as O from './lib/oracle';
import { ob, plan, step } from './lib/ledger';
import { editingState } from './lib/editing-obs';
import { captureOnFailure } from './lib/evidence';
import { openHome, openNoteEditor, enterNoteContent, dismissNoteEditor, selectLabel, searchNotes, focusSearch, chooseSuggestedFilter, clearSearch, openView } from './lib/capabilities';
import { note, highlights, suggestionPanel } from './lib/observe';

captureOnFailure();
// Validated under a 120s case timeout (upstream setup-playwright.sh default is 10s).
test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(benchmarkNow)); });

// Prerequisite creation; failures here are prerequisite failures (K41-P1, B1-C05).
async function create(page: Page, title: string, content: string, labels: string[] = []) {
  step(`create ${title}`);
  const ed = await openNoteEditor(page);
  await enterNoteContent(page, ed, title, content);
  if (labels.length) await selectLabel(page, ed, labels);
  await dismissNoteEditor(page, ed);
  await ob('K41-P1', () => editingState(page, ed.surface, title, content), e => O.editorClosed('K41-P1', e));
  await ob('K41-P1', () => note(page, title), n => { O.exactlyOneVisible('K41-P1', n); O.showsLines('K41-P1', n, content); });
}

test('REQ-4.1: Search title and content with highlights', async ({ page }, info) => {
  plan(['K41-P1', 'K41-O1', 'K41-O2', 'K41-O3', 'K41-O4', 'K41-O5']);
  const t = identity(info, K41.titleMatch.base), c = identity(info, K41.contentMatch.base), o = identity(info, K41.other.base);
  step('open home'); await openHome(page);
  await create(page, t, K41.titleMatch.content);
  await create(page, c, K41.contentMatch.content);
  await create(page, o, K41.other.content);
  step('search'); await searchNotes(page, K41.keyword);
  await ob('K41-O3', () => note(page, o), n => O.hidden('K41-O3', n));
  await ob('K41-O1', () => note(page, t), n => O.exactlyOneVisible('K41-O1', n));
  await ob('K41-O2', () => note(page, c), n => O.exactlyOneVisible('K41-O2', n));
  for (const title of [t, c]) {
    await ob('K41-O4', () => highlights(page, title, K41.keyword), hs => O.highlighted('K41-O4', title, hs, K41.keyword));
  }
  step('clear search'); await clearSearch(page);
  step('select Notes'); await openView(page, 'Notes');
  for (const [title, content] of [[t, K41.titleMatch.content], [c, K41.contentMatch.content], [o, K41.other.content]]) {
    await ob('K41-O5', () => note(page, title), n => { O.exactlyOneVisible('K41-O5', n); O.showsLines('K41-O5', n, content); });
  }
});

test('REQ-4.1: Choose a suggested label filter', async ({ page }, info) => {
  plan(['K41-P1', 'K41-O6', 'K41-O7', 'K41-O8']);
  const m = identity(info, K41.labeled.base), u = identity(info, K41.unlabeled.base);
  step('open home'); await openHome(page);
  await create(page, m, K41.labeled.content, [K41.labeled.label]);
  await create(page, u, K41.unlabeled.content);
  step('focus search'); await focusSearch(page);
  const panel = await ob('K41-O6', () => suggestionPanel(page), p => O.panelShown('K41-O6', p.shown, p.evidence));
  step('choose suggested Reminders'); await chooseSuggestedFilter(page, panel.panel!, K41.labeled.label);
  await ob('K41-O7', () => note(page, u), n => O.hidden('K41-O7', n));
  await ob('K41-O7', () => note(page, m), n => { O.exactlyOneVisible('K41-O7', n); O.showsLines('K41-O7', n, K41.labeled.content); });
  step('clear search'); await clearSearch(page);
  step('select Notes'); await openView(page, 'Notes');
  for (const [title, content] of [[m, K41.labeled.content], [u, K41.unlabeled.content]]) {
    await ob('K41-O8', () => note(page, title), n => { O.exactlyOneVisible('K41-O8', n); O.showsLines('K41-O8', n, content); });
  }
});
