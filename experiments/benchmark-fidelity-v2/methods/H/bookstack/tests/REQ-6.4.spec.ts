// requirement: bookstack.REQ-6.4 — method B (M0L aligned to B1). M0L strategy unchanged; common ledger only.
import { test, type Page } from '@playwright/test';
import { identity, named, book, pages } from './lib/inputs';
import * as O from './lib/oracle';
import { ob, plan, step } from './lib/ledger';
import { captureOnFailure } from './lib/evidence';
import { enter, createBook, createPage, pageListScope, openPage, openEditor } from './lib/operations';
import { pageView, listEntries, editorState } from './lib/observe';

captureOnFailure();

async function setup(page: Page, id: string, n: string) {
  step('enter'); await enter(page);
  const b = book(n); const bookName = named(id, b.base);
  step('create book'); await createBook(page, bookName, b.description, b.tags);
  const ps = pages(n).map(p => ({ ...p, title: named(id, p.base) }));
  for (const p of ps) {
    step(`create page ${p.key}`); await createPage(page, bookName, p.title, p.body);
    await ob('B64-P1', async () => listEntries(await pageListScope(page), p.title), l => O.listedOnce('B64-P1', p.title, l));
  }
  const target = ps.find(p => p.key === 'TARGET')!;
  return { target, others: ps.filter(p => p !== target).map(p => ({ title: p.title, body: p.body })) };
}

test('read_selected_page', async ({ page }, info) => {
  plan(['B64-P1', 'B64-O1', 'B64-O2', 'B64-O3']);
  const { target, others } = await setup(page, identity(info), '1');
  step('open target page'); await openPage(page, target.title);
  await ob('B64-O1', () => pageView(page), v => O.opened('B64-O1', target.title, v));
  await ob('B64-O2', () => pageView(page), v => O.bodyShown('B64-O2', target.body, v));
  await ob('B64-O3', () => pageView(page), v => O.notOther('B64-O3', others, v), 0);
});

test('reopen_page_editor', async ({ page }, info) => {
  plan(['B64-P1', 'B64-O1', 'B64-O4', 'B64-O5', 'B64-O6']);
  const { target } = await setup(page, identity(info), '2');
  step('open target page'); await openPage(page, target.title);
  await ob('B64-O1', () => pageView(page), v => O.opened('B64-O1', target.title, v));
  step('open editor'); const ed = await openEditor(page);
  await ob('B64-O4', () => editorState(page, ed.title, ed.body, ed.save), e => O.editorTitle('B64-O4', target.title, e));
  await ob('B64-O5', () => editorState(page, ed.title, ed.body, ed.save), e => O.editorBody('B64-O5', target.body, e));
  await ob('B64-O6', () => editorState(page, ed.title, ed.body, ed.save), e => O.saveAvailable('B64-O6', e));
});
