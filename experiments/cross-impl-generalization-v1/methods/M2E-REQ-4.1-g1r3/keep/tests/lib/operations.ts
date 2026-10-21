// OPERATION LAYER (editable by revision methods). Performs scenario user intents through the UI only.
// Static, generic strategies derived from the public S1 manifest; no implementation-specific selectors.
import { expect, type Locator, type Page } from '@playwright/test';
import { AdaptationFailure, byCss, byLabel, byPlaceholder, byRole, enterText, resolve, type Candidate } from './adapt';

const CREATE = /^(take a note|take a note…|take a note\.\.\.|new note|create( a)? note|add( a)? note|write a note|\+)$/i;
const TITLE = /^(title|note title)$/i;
const CONTENT = /^(content|note|note content|body|take a note|take a note…|take a note\.\.\.|note text|text)$/i;
const CLOSE = /^(close|done|close editor|close note|finish)$/i;
const LABELS = /^(change labels|labels|add label|edit labels for note|manage labels|label note|add labels)$/i;
const DONE = /^(done|ok|apply|close|save labels)$/i;

export async function openHome(page: Page) {
  await page.goto('/');
  await creationEntry(page);
}

async function creationEntry(page: Page) {
  return resolve(page, 'create-note entry', [
    byRole('button', CREATE), byRole('textbox', CREATE), byRole('link', CREATE), byPlaceholder(CREATE),
  ], 15_000);
}

export interface Editor { surface: Locator; title: Locator; content: Locator }

// The editor surface: a dialog when one appears, else the region holding the title field.
export async function beginNote(page: Page): Promise<Editor> {
  await (await creationEntry(page)).click();
  const fieldCands = (scopeName: string): { title: Candidate[]; content: Candidate[] } => ({
    title: [byRole('textbox', TITLE), byPlaceholder(TITLE), byLabel(TITLE)],
    content: [byRole('textbox', CONTENT), byPlaceholder(CONTENT), byLabel(CONTENT),
      byCss('[contenteditable=true]:not([aria-label*="itle" i])')],
  });
  let surface: Locator;
  try {
    surface = await resolve(page, 'note editor dialog', [byRole('dialog', /./), byCss('dialog[open]')], 5_000);
  } catch {
    const t = await resolve(page, 'note title field', fieldCands('page').title);
    surface = t.locator('xpath=ancestor::*[.//textarea or .//*[@contenteditable="true"] or count(.//input)>=2][1]');
  }
  const c = fieldCands('editor');
  const title = await resolve(surface, 'note title field', c.title);
  const content = await resolve(surface, 'note content field', c.content);
  return { surface, title, content };
}

export async function fillNote(page: Page, ed: Editor, title: string, content: string) {
  await enterText(page, ed.title, title);
  await enterText(page, ed.content, content);
}

export async function chooseLabelsInEditor(page: Page, ed: Editor, labels: string[]) {
  await (await resolve(ed.surface, 'change-labels action', [byRole('button', LABELS), byRole('menuitem', LABELS)])).click();
  const chooser = await resolve(page, 'label chooser', [
    byRole('dialog', /label/i), byRole('menu', /label/i), byRole('listbox', /label/i), byRole('group', /label/i),
    byRole('dialog', /./),
  ].filter(Boolean), 10_000).catch(async () => page.locator('body'));
  for (const label of labels) {
    const ctl = await resolve(chooser, `label option ${label}`, [
      byRole('checkbox', label), byRole('menuitemcheckbox', label), byRole('option', label), byRole('switch', label),
      byRole('button', label),
    ]);
    const role = await ctl.getAttribute('role');
    const tag = await ctl.evaluate(e => e.tagName);
    if (role === 'checkbox' || role === 'switch' || role === 'menuitemcheckbox' || tag === 'INPUT') await ctl.check();
    else await ctl.click();
  }
  const done = await resolve(chooser, 'label chooser done', [byRole('button', DONE)], 3_000).catch(() => null);
  if (done) await done.click(); else await page.keyboard.press('Escape');
}

// Close the editor without any save action (K22-O5). Names containing "save" are never used.
export async function closeEditor(ed: Editor) {
  const btn = await resolve(ed.surface, 'close-editor action', [byRole('button', CLOSE)]);
  const name = (await btn.getAttribute('aria-label')) || (await btn.innerText());
  if (/save/i.test(name)) throw new AdaptationFailure('close-editor action', `refusing save-like control "${name}"`);
  await btn.click();
}

export async function searchBox(page: Page): Promise<Locator> {
  // Use broader search strategies to handle variations in search control implementation
  return resolve(page, 'search input', [
    byRole('searchbox', /./),
    byRole('textbox', /search/i),
    byPlaceholder(/search/i),
    byRole('combobox', /search/i),
    byRole('textbox', /Search notes/i),
    byPlaceholder(/Search notes/i),
    byRole('searchbox', /Search/i), // fallback for generic searchbox with "Search" name
    byPlaceholder(/Search/i),      // fallback for generic placeholder with "Search"
  ]);
}

export async function chooseSuggested(page: Page, panel: Locator, name: string) {
  // Try multiple strategies for the suggested filter button
  // Prioritize text-based matching as fallback when role-based fails
  const cands = [
    byRole('menuitem', name),
    byRole('option', name),
    byRole('button', name),
    byRole('link', name),
    byRole('checkbox', name),
    byText(name),
    byRole('menuitem', new RegExp(`^${name}$`, 'i')),
    byRole('option', new RegExp(`^${name}$`, 'i')),
    byRole('button', new RegExp(`^${name}$`, 'i')),
  ];
  const ctl = await resolve(panel, `suggested ${name}`, cands);
  await ctl.click();
}

export async function clearSearch(page: Page) {
  const box = await searchBox(page);
  await box.fill('');
  await expect(box).toHaveValue('');
}

export async function navigate(page: Page, name: string) {
  const nav = await resolve(page, 'sidebar navigation', [byRole('navigation', /./), byCss('nav,aside')]).catch(() => page.locator('body'));
  await (await resolve(nav, `nav ${name}`, [byRole('button', name), byRole('link', name), byRole('tab', name),
    byRole('menuitem', name), byRole('button', new RegExp(`^${name}$`, 'i')), byRole('link', new RegExp(`^${name}$`, 'i'))])).click();
}
