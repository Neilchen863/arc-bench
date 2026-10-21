// METHOD D — keep capability interface: business-level operations over generic drivers (drivers.ts).
// Aliases are the same public S1 alias lists as method B. No implementation-family branches.
import type { Locator, Page } from '@playwright/test';
import { act } from './ledger';
import { AdaptationFailure, activate, bindObject, ensureChecked, enterText, find, findAll, waitUntil, type Found } from './drivers';

const CREATE = /^(take a note|take a note…|take a note\.\.\.|new note|create( a)? note|add( a)? note|write a note|\+)$/i;
const TITLE = /^(title|note title)$/i;
const CONTENT = /^(content|note|note content|body|take a note|take a note…|take a note\.\.\.|note text|text)$/i;
const CLOSE = /^(close|done|close editor|close note|finish)$/i;
const LABELS = /^(change labels|labels|add label|edit labels for note|manage labels|label note|add labels)$/i;
const DONE = /^(done|ok|apply|close|save labels)$/i;
// Confirm-type names are tried before plain close (a fixed name preference, not a positional pick).
const DONE_PRIMARY = /^(done|ok|apply|save labels)$/i;
const DONE_CLOSE = /^close$/i;
const exact = (s: string) => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

export interface Editor { surface: Locator; title: Found; content: Found }

export async function openHome(page: Page) {
  await page.goto('/');
  await find(page, { what: 'create-note entry', kinds: ['action', 'textbox'], names: CREATE }, 15_000);
  act({ intent: 'open home', how: 'goto /' });
}

// The editor surface is the nearest modal/form ancestor of the title field, else the smallest ancestor that also holds
// a content field. It is bound by identity (data-arc-obj), never by position.
const SURFACE = (title: Element, a: { src: string; flags: string }) => {
  const re = new RegExp(a.src, a.flags);
  const nameHit = (e: Element) => [e.getAttribute('aria-label'), e.getAttribute('placeholder'), e.getAttribute('data-placeholder'),
    ...Array.from((e as HTMLInputElement).labels || []).map(l => l.textContent)].some(n => n && re.test(n.replace(/\s+/g, ' ').trim()));
  const modal = title.parentElement?.closest('[role=dialog],[role=alertdialog],dialog,[aria-modal=true],form');
  if (modal && modal !== document.body) return modal;
  let a2: Element | null = title.parentElement;
  while (a2 && a2 !== document.body) {
    const fields = Array.from(a2.querySelectorAll('input,textarea,[contenteditable=true],[contenteditable=""],[role=textbox]')).filter(e => e !== title);
    if (fields.some(nameHit)) return a2;
    a2 = a2.parentElement;
  }
  return null;
};

export async function openNoteEditor(page: Page): Promise<Editor> {
  const entry = await find(page, { what: 'create-note entry', kinds: ['action', 'textbox'], names: CREATE }, 15_000);
  await activate(entry, 'open note editor', 'new note');
  const title = await find(page, { what: 'note title field', kinds: ['textbox'], names: TITLE });
  const sEl = await title.loc.evaluateHandle(SURFACE, { src: CONTENT.source, flags: CONTENT.flags });
  const el = sEl.asElement();
  if (!el) throw new AdaptationFailure('note editor surface', 'no ancestor holds both title and content fields');
  const tmp = page.locator('[data-arc-surface-tmp]');
  await el.evaluate(e => e.setAttribute('data-arc-surface-tmp', ''));
  const surface = await bindObject(tmp, 'editor');
  await el.evaluate(e => e.removeAttribute('data-arc-surface-tmp'));
  const content = await find(surface, { what: 'note content field', kinds: ['textbox'], names: CONTENT });
  const desc = await surface.evaluate(e => `<${e.tagName.toLowerCase()} role=${e.getAttribute('role')} class="${(e as HTMLElement).className}">`);
  act({ intent: 'bind note editor', target: 'new note', control: desc, how: 'nearest modal/form ancestor of title field, else smallest ancestor with content field' });
  return { surface, title, content };
}

export async function enterNoteContent(page: Page, ed: Editor, title: string, content: string) {
  await enterText(page, ed.title, title, 'enter note title');
  await enterText(page, ed.content, content, 'enter note content');
}

// In-page: is the bound surface the top-most interactive surface (no other open dialog/menu/listbox outside it)?
const SURFACE_ON_TOP = (s: Element) => {
  const rendered = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  if (s.closest('[aria-hidden=true],[inert]')) return false;
  const others = Array.from(document.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open],[role=menu],[role=listbox],[aria-modal=true]'))
    .filter(o => rendered(o) && !o.contains(s) && !s.contains(o) && !o.closest('[aria-hidden=true],[inert]'));
  return others.length === 0;
};

// Dismiss the editor with its own close action (B1-C02): wait until nothing is stacked above it, never a save action.
export async function dismissNoteEditor(page: Page, ed: Editor) {
  await waitUntil('note editor on top (nested surfaces closed)', () => ed.surface.evaluate(SURFACE_ON_TOP));
  const btn = await find(ed.surface, { what: 'close-editor action', kinds: ['action'], names: CLOSE });
  if (/save/i.test(btn.desc)) throw new AdaptationFailure('close-editor action', `refusing save-like control ${btn.desc}`);
  await activate(btn, 'dismiss note editor', 'note editor');
}

// Choose labels in the editor's label chooser (REQ-2.8 prerequisite). The chooser is the overlay that appears after the
// change-labels action; if none appears, the chooser is inline in the editor surface.
// In-page: outermost rendered, unblocked overlays that were not present before (no data-arc-pre); tags them data-arc-fresh.
const FRESH_OVERLAYS = () => {
  const rendered = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  document.querySelectorAll('[data-arc-fresh]').forEach(e => e.removeAttribute('data-arc-fresh'));
  const os = Array.from(document.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open],[role=menu],[role=listbox],[aria-modal=true]'))
    .filter(o => rendered(o) && !o.closest('[aria-hidden=true],[inert]') && !o.hasAttribute('data-arc-pre'));
  const outer = os.filter(o => !os.some(q => q !== o && q.contains(o)));
  outer.forEach(o => o.setAttribute('data-arc-fresh', ''));
  return outer.map(o => `<${o.tagName.toLowerCase()} role=${o.getAttribute('role')} name=${(o.getAttribute('aria-label') || (o.getAttribute('aria-labelledby') && document.getElementById(o.getAttribute('aria-labelledby')!)?.textContent) || '').trim()}>`);
};

export async function selectLabel(page: Page, ed: Editor, labels: string[]) {
  // Mark overlays that are already rendered, so the chooser is identified as the overlay the action opens.
  const pre = await findAll(page, { what: 'overlay', kinds: ['overlay'], names: /.*/ }, true);
  for (const o of pre) await o.loc.evaluate(e => e.setAttribute('data-arc-pre', ''));
  // The editor surface itself (and overlays nesting it or nested in it) is never the chooser, even if it was still
  // fading in when the pre-existing overlays were marked (race seen on Element Plus, regression run 2026-10-20).
  await ed.surface.evaluate(s => {
    document.querySelectorAll('[role=dialog],[role=alertdialog],dialog,[role=menu],[role=listbox],[aria-modal=true]')
      .forEach(o => { if (o.contains(s) || s.contains(o)) o.setAttribute('data-arc-pre', ''); });
  });
  const action = await find(ed.surface, { what: 'change-labels action', kinds: ['action'], names: LABELS });
  await activate(action, 'open label chooser', 'note editor');
  let chooser: Locator = ed.surface; let how = 'inline in editor (no new overlay)';
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const fresh = await page.evaluate(FRESH_OVERLAYS);
    if (fresh.length === 1) { chooser = await bindObject(page.locator('[data-arc-fresh]'), 'chooser'); how = fresh[0]; break; }
    if (fresh.length > 1) throw new AdaptationFailure('label chooser', `${fresh.length} new overlays: ${fresh.join(' | ')}`);
    await new Promise(r => setTimeout(r, 200));
  }
  act({ intent: 'bind label chooser', control: how });
  for (const label of labels) {
    const check = await findAll(chooser, { what: `label option ${label}`, kinds: ['checkable'], names: exact(label) });
    if (check.length === 1) await ensureChecked(check[0], 'select label', label);
    else await activate(await find(chooser, { what: `label option ${label}`, kinds: ['action', 'checkable'], names: exact(label) }), 'select label', label);
  }
  if (chooser !== ed.surface) {
    const done = await find(chooser, { what: 'label chooser done', kinds: ['action'], names: DONE_PRIMARY }, 3_000).catch(() => null)
      ?? await find(chooser, { what: 'label chooser close', kinds: ['action'], names: DONE_CLOSE }, 1_000).catch(() => null);
    if (done) await activate(done, 'confirm label chooser'); else { await page.keyboard.press('Escape'); act({ intent: 'confirm label chooser', how: 'Escape' }); }
    await waitUntil('label chooser closed', async () => !(await chooser.isVisible()));
  }
}

export async function searchBox(page: Page): Promise<Found> {
  return find(page, { what: 'search input', kinds: ['textbox'], names: /search/i });
}

export async function searchNotes(page: Page, keyword: string) {
  const box = await searchBox(page);
  await box.loc.fill(keyword);
  act({ intent: 'search notes', control: box.desc, how: 'fill', after: keyword });
}

export async function focusSearch(page: Page) {
  const box = await searchBox(page);
  await box.loc.click();
  act({ intent: 'focus search', control: box.desc, how: 'click' });
}

export async function chooseSuggestedFilter(page: Page, panel: Locator, name: string) {
  await activate(await find(panel, { what: `suggested filter ${name}`, kinds: ['action', 'checkable'], names: exact(name) }), 'choose suggested filter', name);
}

export async function clearSearch(page: Page) {
  const box = await searchBox(page);
  await box.loc.fill('');
  if ((await box.loc.inputValue().catch(() => '')) !== '') throw new AdaptationFailure('clear search', 'value not empty');
  act({ intent: 'clear search', control: box.desc, how: 'fill empty' });
}

// Sidebar view selection: the named entry inside a navigation landmark (nav/aside/role=navigation), unique overall.
export async function openView(page: Page, name: string) {
  await activate(await find(page, { what: `nav ${name}`, kinds: ['action'], names: exact(name), within: 'nav,aside,[role=navigation]' }), 'select view', name);
}
