// OPERATION LAYER (editable). Generic strategies from the public S1 manifest; UI only.
import type { Locator, Page } from '@playwright/test';
import { byCss, byLabel, byPlaceholder, byRole, enterText, resolve, eventually, type Candidate } from './adapt';

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

const field = (re: RegExp): Candidate[] => [byRole('textbox', re), byLabel(re), byPlaceholder(re)];

export async function enter(page: Page) { await page.goto('/'); }

async function nav(page: Page, re: RegExp) {
  await (await resolve(page, `nav ${re}`, [byRole('link', re), byRole('button', re), byRole('tab', re), byRole('menuitem', re)])).click();
}

export async function createBook(page: Page, name: string, description: string, tags: string) {
  await nav(page, BOOKS);
  await (await resolve(page, 'create-book action', [byRole('button', CREATE_BOOK), byRole('link', CREATE_BOOK)])).click();
  await enterText(page, await resolve(page, 'book name field', field(NAME)), name);
  await enterText(page, await resolve(page, 'book description field', [...field(DESCRIPTION), byCss('[contenteditable=true]')]), description);
  await enterText(page, await resolve(page, 'book tags field', [...field(TAGS), byRole('combobox', TAGS)]), tags);
  await (await resolve(page, 'save-book action', [byRole('button', SAVE_BOOK)])).click();
  await resolve(page, 'book heading', [byRole('heading', name)], 15_000);
}

export async function pageListScope(page: Page): Promise<Locator | Page> {
  // First try to find a region explicitly labeled as page list
  try {
    return await resolve(page, 'page list region', [
      byRole('region', /pages?( list)?$/i),
      byRole('navigation', /pages?( list)?$/i),
    ], 3_000);
  } catch {
    // Fallback: look for a section with a pages heading and page entries
    try {
      return await resolve(page, 'page list section', [
        byCss('section:has(> h2:text-matches("^pages", "i")), section:has(> h3:text-matches("^pages", "i"))'),
      ], 3_000);
    } catch {
      // Last resort: use the whole page
      return page;
    }
  }
}

export async function createPage(page: Page, bookName: string, title: string, body: string) {
  await resolve(page, 'book heading', [byRole('heading', bookName)], 15_000);
  await (await resolve(page, 'new-page action', [byRole('button', NEW_PAGE), byRole('link', NEW_PAGE)])).click();
  await enterText(page, await resolve(page, 'page title field', field(PAGE_TITLE)), title);
  await enterText(page, await resolve(page, 'page body field', [...field(PAGE_BODY), byCss('[contenteditable=true]')]), body);
  await (await resolve(page, 'save-page action', [byRole('button', SAVE_PAGE)])).click();
  await resolve(page, 'book heading after save', [byRole('heading', bookName)], 15_000);
}

export async function openPage(page: Page, title: string) {
  const scope = await pageListScope(page);
  await (await resolve(scope, `page entry ${title}`, [byRole('link', title), byRole('button', title)])).click();
  // Wait for the page to fully load after navigation
  await resolve(page, 'page loaded', [byRole('heading', title)], 10_000);
}

export async function openEditor(page: Page): Promise<{ title: Locator; body: Locator; save: Locator | null }> {
  await (await resolve(page, 'edit action', [byRole('button', EDIT), byRole('link', EDIT)])).click();
  // Wait for editor to be fully loaded before returning
  const title = await resolve(page, 'editor title field', field(PAGE_TITLE), 10_000);
  const body = await resolve(page, 'editor body field', [...field(PAGE_BODY), byCss('[contenteditable=true]')], 10_000);
  const save = await resolve(page, 'editor save action', [byRole('button', SAVE_PAGE)], 5_000).catch(() => null);
  return { title, body, save };
}
export { eventually };
