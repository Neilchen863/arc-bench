// requirement: bookstack.REQ-6.4 (S1 layered contract).
import { test, type Page } from '@playwright/test';
import { identity, named, book, pages } from './lib/inputs';
import * as O from './lib/oracle';
import { eventually } from './lib/adapt';
import { captureOnFailure } from './lib/evidence';
import { enter, createBook, createPage, pageListScope, openPage, openEditor } from './lib/operations';
import { pageView, listEntries, editorState } from './lib/observe';

captureOnFailure();

async function setup(page: Page, id: string, n: string) {
  await enter(page);
  const b = book(n); const bookName = named(id, b.base);
  await createBook(page, bookName, b.description, b.tags);
  const ps = pages(n).map(p => ({ ...p, title: named(id, p.base) }));
  for (const p of ps) {
    await createPage(page, bookName, p.title, p.body);
    await eventually(async () => listEntries(await pageListScope(page), p.title), l => O.listedOnce('B64-P1', p.title, l));
  }
  const target = ps.find(p => p.key === 'TARGET')!;
  return { target, others: ps.filter(p => p !== target).map(p => ({ title: p.title, body: p.body })) };
}

test('read_selected_page', async ({ page }, info) => {
  const { target, others } = await setup(page, identity(info), '1');
  await openPage(page, target.title);
  await eventually(() => pageView(page), v => O.opened('B64-O1', target.title, v));
  await eventually(() => pageView(page), v => O.bodyShown('B64-O2', target.body, v));
  O.notOther('B64-O3', others, await pageView(page));
});

test('reopen_page_editor', async ({ page }, info) => {
  const { target } = await setup(page, identity(info), '2');
  await openPage(page, target.title);
  await eventually(() => pageView(page), v => O.opened('B64-O1', target.title, v));
  const ed = await openEditor(page);
  await eventually(() => editorState(page, ed.title, ed.body, ed.save), e => O.editorTitle('B64-O4', target.title, e));
  await eventually(() => editorState(page, ed.title, ed.body, ed.save), e => O.editorBody('B64-O5', target.body, e));
  await eventually(() => editorState(page, ed.title, ed.body, ed.save), e => O.saveAvailable('B64-O6', e));
});
