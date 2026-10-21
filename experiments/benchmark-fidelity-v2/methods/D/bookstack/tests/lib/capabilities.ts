// METHOD D — bookstack capability interface over generic drivers. Same public S1 aliases as method B.
import type { Locator, Page } from '@playwright/test';
import { act } from './ledger';
import { AdaptationFailure, activate, enterList, enterText, find, findAll, readValue, type Concept, type Found } from './drivers';

const BOOKS = /^(books|all books|book library)$/i;
const CREATE_BOOK = /^(create new book|new book|create book|add book|add a book|\+ new book)$/i;
const NAME = /^(name|book name|title|book title)$/i;
const DESCRIPTION = /^(description|book description)$/i;
const TAGS = /^(tags|book tags)$/i;
const SAVE_BOOK = /^(save book|save|create book|create)$/i;
const NEW_PAGE = /^(new page|create page|add page|add a page|create new page|\+ new page)$/i;
const PAGE_TITLE = /^(page title|title)$/i;
const PAGE_BODY = /^(write your page content here\.\.\.|page content|content|body|page body|editor|rich text editor.*|write.*)$/i;
const SAVE_PAGE = /^(save page|save|publish|publish page|update page|save changes)$/i;
const EDIT = /^(edit|edit page)$/i;
const PAGES_HEADING = /^pages?( list)?$/i;
const exact = (s: string) => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const field = (what: string, names: RegExp): Concept => ({ what, kinds: ['textbox'], names });
// Rich-text body/description: a named field, else the single rich editor on the page (same fallback as method B).
async function richField(page: Page, what: string, names: RegExp): Promise<Found> {
  const named = await find(page, field(what, names), 5_000).catch(() => null);
  if (named) return named;
  const rich = await findAll(page, { what, kinds: ['textbox'], names: /.*/ }, true);
  const ce: Found[] = [];
  for (const r of rich) if (await r.loc.evaluate(e => (e as HTMLElement).isContentEditable && !(e.parentElement as HTMLElement)?.isContentEditable)) ce.push(r);
  if (ce.length !== 1) throw new AdaptationFailure(what, `no named field and ${ce.length} rich editors`);
  return ce[0];
}

export async function enter(page: Page) { await page.goto('/'); act({ intent: 'enter app', how: 'goto /' }); }

export async function createBook(page: Page, name: string, description: string, tags: string) {
  await activate(await find(page, { what: 'books navigation', kinds: ['action'], names: BOOKS }), 'open books');
  await activate(await find(page, { what: 'create-book action', kinds: ['action'], names: CREATE_BOOK }), 'create book');
  await enterText(page, await find(page, field('book name field', NAME)), name, 'enter book name');
  await enterText(page, await richField(page, 'book description field', DESCRIPTION), description, 'enter book description');
  await enterList(page, await find(page, field('book tags field', TAGS)), tags.split(',').map(t => t.trim()).filter(Boolean), 'enter book tags');
  await activate(await find(page, { what: 'save-book action', kinds: ['action'], names: SAVE_BOOK }), 'save book');
  await find(page, { what: 'book heading', kinds: ['heading'], names: exact(name) }, 15_000);
}

// The parent's page list: a container labelled/headed "Pages" (heading, landmark name), else the whole page.
const LIST_SCOPE = (_: Element, a: { src: string; flags: string }) => {
  const re = new RegExp(a.src, a.flags);
  const clean = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim();
  document.querySelectorAll('[data-arc-pagelist]').forEach(e => e.removeAttribute('data-arc-pagelist'));
  const named = Array.from(document.querySelectorAll('[aria-label],[aria-labelledby]')).filter(e =>
    re.test(clean(e.getAttribute('aria-label')) || clean(document.getElementById(e.getAttribute('aria-labelledby') || '')?.textContent || '')));
  const headed = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')).filter(h => re.test(clean((h as HTMLElement).innerText)))
    .map(h => { let c = h.parentElement; while (c && c !== document.body && !c.querySelector('a[href],[role=link],button,[role=button]')) c = c.parentElement; return c; })
    .filter(Boolean) as Element[];
  const all = Array.from(new Set([...named, ...headed])).filter(e => (e as HTMLElement).getBoundingClientRect().height > 0);
  const inner = all.filter(e => !all.some(o => o !== e && e.contains(o)));
  if (inner.length === 1) { inner[0].setAttribute('data-arc-pagelist', ''); return `<${inner[0].tagName.toLowerCase()}>`; }
  return `none (${inner.length})`;
};

export async function pageListScope(page: Page): Promise<Locator | Page> {
  const r = await page.locator('body').evaluate(LIST_SCOPE, { src: PAGES_HEADING.source, flags: PAGES_HEADING.flags });
  return r.startsWith('none') ? page : page.locator('[data-arc-pagelist]');
}

export async function createPage(page: Page, bookName: string, title: string, body: string) {
  await find(page, { what: 'book heading', kinds: ['heading'], names: exact(bookName) }, 15_000);
  await activate(await find(page, { what: 'new-page action', kinds: ['action'], names: NEW_PAGE }), 'new page');
  await enterText(page, await find(page, field('page title field', PAGE_TITLE)), title, 'enter page title');
  await enterText(page, await richField(page, 'page body field', PAGE_BODY), body, 'enter page body');
  await activate(await find(page, { what: 'save-page action', kinds: ['action'], names: SAVE_PAGE }), 'save page');
  await find(page, { what: 'book heading after save', kinds: ['heading'], names: exact(bookName) }, 15_000);
}

export async function openPage(page: Page, title: string) {
  const scope = await pageListScope(page);
  await activate(await find(scope, { what: `page entry ${title}`, kinds: ['action', 'link'], names: exact(title) }), 'open page', title);
}

export interface PageEditor { title: Found; body: Found; save: Found | null }
export async function openPageEditor(page: Page): Promise<PageEditor> {
  await activate(await find(page, { what: 'edit action', kinds: ['action'], names: EDIT }), 'open page editor');
  const title = await find(page, field('editor title field', PAGE_TITLE));
  const body = await richField(page, 'editor body field', PAGE_BODY);
  const save = await find(page, { what: 'editor save action', kinds: ['action'], names: SAVE_PAGE }, 5_000).catch(() => null);
  return { title, body, save };
}

export async function editorFields(ed: PageEditor) {
  return {
    titleValue: await readValue(ed.title).catch(() => null),
    bodyValue: await readValue(ed.body).catch(() => null),
    saveVisible: ed.save ? await ed.save.loc.isVisible() : false,
    evidence: `title=${ed.title.desc} body=${ed.body.desc} save=${ed.save?.desc ?? 'none'}`,
  };
}

// Count operable entries (link/button) with the exact title inside the page-list scope.
export async function listEntries(page: Page, title: string) {
  const scope = await pageListScope(page);
  const hits = await findAll(scope, { what: `page entry ${title}`, kinds: ['action', 'link'], names: exact(title) });
  return { entries: hits.length, evidence: hits.map(h => h.desc).join(' | ') || 'none' };
}
