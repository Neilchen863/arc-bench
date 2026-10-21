// METHOD D — generic control drivers (shared by keep and bookstack packages; no implementation-specific branches).
//
// Resolution model:
//  * Candidates are enumerated in the browser by control KIND (action, textbox, checkable, link, heading, container).
//  * Each candidate gets a set of NAMES a user can see or a screen reader announces: aria-label, aria-labelledby text,
//    associated <label> text with description nodes (aria-describedby targets) and nested control values removed,
//    placeholder, title, and its own visible text. A concept matches when any name matches the concept's aliases
//    (the same public S1 alias lists as method B; no per-implementation aliases).
//  * A candidate is OPERABLE when it is rendered, enabled, and not inside an aria-hidden/inert subtree (i.e. not behind
//    an open modal). A checkable whose native input is visually hidden is operable through its visible <label> (B1-C07).
//  * Exactly one operable match is required. Several matches are AMBIGUOUS and must be resolved by a business scope
//    (editor surface, chooser, note record, page list); there is no first()/nth() fallback.
//  * The match is tagged with a transient evaluator-side attribute (data-arc-<key>) so the returned Locator is an identity
//    reference rather than a positional one. The attribute has no effect on product behaviour and is logged.
import type { Locator, Page } from '@playwright/test';
import { act } from './ledger';

export class AdaptationFailure extends Error {
  constructor(what: string, detail: string) { super(`ADAPTATION_FAIL ${what}: ${detail}`); }
}

export type Scope = Page | Locator;
export type Kind = 'action' | 'textbox' | 'checkable' | 'link' | 'heading' | 'overlay';
export interface Concept { what: string; kinds: Kind[]; names: RegExp; within?: string }
export interface Found { loc: Locator; via: 'self' | 'label'; label?: Locator; desc: string; kind: string }

let seq = 0;
const nonce = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

// In-page search. Returns descriptions of operable matches and tags them with data-arc-<key>-<i>[-label].
const FIND = (root: Element, a: { kinds: string[]; src: string; flags: string; key: string; any?: boolean; within?: string }) => {
  const scope = root;
  const SEL: Record<string, string> = {
    action: 'button,[role=button],input[type=button],input[type=submit],a[href],[role=link],[role=menuitem],[role=tab],[role=option],[role=menuitemcheckbox],[role=menuitemradio],[role=treeitem]',
    textbox: 'input:not([type]),input[type=text],input[type=search],input[type=email],input[type=url],input[type=tel],input[type=number],textarea,[contenteditable=""],[contenteditable=true],[role=textbox],[role=searchbox],[role=combobox]',
    checkable: 'input[type=checkbox],input[type=radio],[role=checkbox],[role=switch],[role=menuitemcheckbox],[role=menuitemradio],[role=option],[role=radio]',
    link: 'a[href],[role=link]',
    heading: 'h1,h2,h3,h4,h5,h6,[role=heading]',
    overlay: '[role=dialog],[role=alertdialog],dialog[open],[role=menu],[role=listbox],[aria-modal=true]',
  };
  const re = new RegExp(a.src, a.flags);
  const clean = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
  const rendered = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
  const blocked = (e: Element) => !!e.closest('[aria-hidden=true],[inert]');
  const textOf = (el: Element, skip: Set<Element>): string => {
    let s = '';
    el.childNodes.forEach(n => {
      if (n.nodeType === 3) s += n.textContent;
      else if (n.nodeType === 1) {
        const c = n as Element;
        // Accessible-name rule: aria-hidden descendants (e.g. a decorative required '*') are not part of the name.
        if (skip.has(c) || ['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT'].includes(c.tagName) || c.getAttribute('aria-hidden') === 'true') return;
        if (getComputedStyle(c).display === 'none') return;
        s += ' ' + textOf(c, skip) + ' ';
      }
    });
    return s;
  };
  const byIds = (ids: string | null) => (ids || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)).filter(Boolean) as Element[];
  const labelsOf = (e: Element): Element[] => {
    const out: Element[] = [];
    const ls = (e as HTMLInputElement).labels; if (ls) out.push(...Array.from(ls));
    const wrap = e.closest('label'); if (wrap && !out.includes(wrap)) out.push(wrap);
    return out;
  };
  const namesOf = (e: Element): string[] => {
    const described = new Set(byIds(e.getAttribute('aria-describedby')));
    const n: string[] = [];
    const al = e.getAttribute('aria-label'); if (al) n.push(al);
    const lb = byIds(e.getAttribute('aria-labelledby')); if (lb.length) n.push(lb.map(x => textOf(x, described)).join(' '));
    for (const l of labelsOf(e)) n.push(textOf(l, described));
    for (const attr of ['placeholder', 'title', 'data-placeholder']) { const v = e.getAttribute(attr); if (v) n.push(v); }
    if (!(e instanceof HTMLInputElement) && !(e instanceof HTMLTextAreaElement) && !(e as HTMLElement).isContentEditable) n.push(textOf(e, described));
    if (e instanceof HTMLInputElement && /^(button|submit)$/.test(e.type)) n.push(e.value);
    // Normalise field-label decorations that do not change meaning: trailing required/optional markers and colons
    // ("Name *", "Tags (optional)", "Title:"). Both the raw and the normalised name are kept.
    const deco = (x: string) => x.replace(/\s*(\*|:|\((optional|required)\))\s*$/i, '').trim();
    const raw = n.map(clean).filter(Boolean);
    return Array.from(new Set([...raw, ...raw.map(deco).filter(Boolean)]));
  };
  const disabled = (e: Element) => (e as HTMLButtonElement).disabled || e.getAttribute('aria-disabled') === 'true';
  const cands = new Set<Element>();
  for (const k of a.kinds) scope.querySelectorAll(SEL[k]).forEach(e => cands.add(e));
  if (root !== document.body && a.kinds.some(k => root.matches(SEL[k]))) cands.add(root);
  const hits: { e: Element; via: string; label: Element | null; names: string[] }[] = [];
  for (const e of cands) {
    if (blocked(e) || disabled(e)) continue;
    if (a.within && !e.parentElement?.closest(a.within)) continue;
    const names = namesOf(e);
    if (!a.any && !names.some(x => re.test(x))) continue;
    if (rendered(e)) { hits.push({ e, via: 'self', label: null, names }); continue; }
    const isCheck = e instanceof HTMLInputElement && /^(checkbox|radio)$/.test(e.type);
    const lab = isCheck ? labelsOf(e).find(rendered) : undefined;
    if (lab) hits.push({ e, via: 'label', label: lab, names });
  }
  // A match that contains another match is the same control seen twice (e.g. option wrapper + inner button): keep innermost.
  const inner = hits.filter(h => !hits.some(o => o !== h && h.e.contains(o.e)));
  return inner.map((h, i) => {
    h.e.setAttribute(`data-arc-${a.key}-${i}`, '');
    if (h.label) h.label.setAttribute(`data-arc-${a.key}-${i}-label`, '');
    const role = h.e.getAttribute('role');
    return { i, via: h.via, kind: h.e.tagName.toLowerCase() + (role ? `[role=${role}]` : '') + ((h.e as HTMLInputElement).type ? `[type=${(h.e as HTMLInputElement).type}]` : ''),
      desc: `<${h.e.tagName.toLowerCase()}${role ? ` role=${role}` : ''}> names=${JSON.stringify(h.names.map(x => x.slice(0, 60)))}${h.via === 'label' ? ' (via visible label)' : ''}` };
  });
};

const rootOf = (scope: Scope): Locator => ('goto' in scope ? (scope as Page).locator('body') : (scope as Locator));

const pageOf = (s: Scope): Page => ('goto' in s ? (s as Page) : (s as Locator).page());

// All operable matches right now (no waiting).
export async function findAll(scope: Scope, c: Concept, any = false): Promise<Found[]> {
  const key = `t${nonce()}`;
  const res = await rootOf(scope).evaluate(FIND, { kinds: c.kinds, src: c.names.source, flags: c.names.flags, key, any, within: c.within }, { timeout: 5_000 });
  const p = pageOf(scope);
  return res.map(r => ({ loc: p.locator(`[data-arc-${key}-${r.i}]`), via: r.via as 'self' | 'label',
    label: r.via === 'label' ? p.locator(`[data-arc-${key}-${r.i}-label]`) : undefined, desc: r.desc, kind: r.kind }));
}

// Exactly one operable match, polling until timeout; ambiguity and absence are adaptation failures.
export async function find(scope: Scope, c: Concept, timeout = 10_000): Promise<Found> {
  const deadline = Date.now() + timeout;
  let last = '';
  while (true) {
    const hits = await findAll(scope, c).catch(e => { last = String(e); return [] as Found[]; });
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) last = `ambiguous ${hits.length}: ${hits.map(h => h.desc).join(' | ').slice(0, 600)}`;
    else if (!last.startsWith('Error')) last = 'no operable match';
    if (Date.now() >= deadline) throw new AdaptationFailure(c.what, `${last} (kinds=${c.kinds.join('/')}, names=${c.names})`);
    await new Promise(r => setTimeout(r, 250));
  }
}

export async function activate(f: Found, intent: string, target?: string) {
  const el = f.via === 'label' ? f.label! : f.loc;
  await el.click();
  act({ intent, target, control: f.desc, how: f.via === 'label' ? 'click visible label' : 'click' });
}

async function checkedState(f: Found): Promise<boolean | null> {
  return f.loc.evaluate(e => {
    if (e instanceof HTMLInputElement && /^(checkbox|radio)$/.test(e.type)) return e.checked;
    for (const a of ['aria-checked', 'aria-selected', 'aria-pressed']) { const v = e.getAttribute(a); if (v !== null) return v === 'true'; }
    return null;
  }).catch(() => null);
}

// Make a checkable option checked the way a user does (click it or its visible label), then verify the state.
export async function ensureChecked(f: Found, intent: string, target?: string) {
  const before = await checkedState(f);
  if (before === true) { act({ intent, target, control: f.desc, how: 'already checked', before }); return; }
  await (f.via === 'label' ? f.label! : f.loc).click();
  let after = await checkedState(f);
  for (let i = 0; i < 20 && after === false; i++) { await new Promise(r => setTimeout(r, 100)); after = await checkedState(f); }
  act({ intent, target, control: f.desc, how: f.via === 'label' ? 'click visible label' : 'click', before, after });
  if (after === false) throw new AdaptationFailure(intent, `option did not become checked (${f.desc})`);
}

// Enter text like a user: native fields are filled; rich editors get typed lines separated by Enter.
export async function enterText(page: Page, f: Found, text: string, intent: string) {
  const kind = await f.loc.evaluate(e => (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement) ? 'input'
    : (e as HTMLElement).isContentEditable ? 'rich' : (e.querySelector('[contenteditable=true],[contenteditable=""]') ? 'rich-wrapper' : 'other'));
  let target = f.loc;
  if (kind === 'rich-wrapper') target = f.loc.locator('[contenteditable=true],[contenteditable=""]');
  if (kind === 'input') await target.fill(text);
  else {
    await target.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) { if (i) await page.keyboard.press('Enter'); await page.keyboard.type(lines[i]); }
  }
  act({ intent, control: f.desc, how: kind === 'input' ? 'fill' : 'type (rich text)', after: text.slice(0, 80) });
}

export async function readValue(f: Found | Locator): Promise<string> {
  const loc = 'loc' in f ? f.loc : f;
  return loc.evaluate(e => (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement) ? e.value
    : ((e as HTMLElement).isContentEditable ? (e as HTMLElement).innerText
      : ((e.querySelector('[contenteditable=true],[contenteditable=""]') as HTMLElement)?.innerText ?? (e as HTMLElement).innerText)));
}

// Visible overlays (dialogs, menus, listboxes, popovers) as identity-tagged locators.
export async function overlays(page: Page): Promise<{ loc: Locator; desc: string }[]> {
  const hits = await findAll(page, { what: 'overlay', kinds: ['overlay'], names: /.*/ }, true);
  return hits.map(h => ({ loc: h.loc, desc: h.desc }));
}

// Tag one element (identified by a Found) as a named business object; returns a stable identity locator.
export async function bindObject(f: Locator, role: string): Promise<Locator> {
  const id = `${role}-${nonce()}`;
  await f.evaluate((e, id) => e.setAttribute('data-arc-obj', id), id);
  return f.page().locator(`[data-arc-obj="${id}"]`);
}

export async function waitUntil(what: string, cond: () => Promise<boolean>, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (!(await cond().catch(() => false))) {
    if (Date.now() >= deadline) throw new AdaptationFailure(what, 'condition not reached');
    await new Promise(r => setTimeout(r, 150));
  }
}

// Enter a list value (e.g. tags) the way the control expects: a plain text field takes the comma-separated text;
// a token/chip combobox (role=combobox or aria-autocomplete) takes one item at a time committed with Enter, and every
// item must then be visible as a token in the widget. Otherwise the entry is an adaptation failure, never silently kept.
export async function enterList(page: Page, f: Found, items: string[], intent: string) {
  const isCombo = await f.loc.evaluate(e => e.getAttribute('role') === 'combobox' || e.hasAttribute('aria-autocomplete'));
  if (!isCombo) return enterText(page, f, items.join(', '), intent);
  for (const it of items) {
    await f.loc.click();
    await f.loc.pressSequentially(it);
    await page.keyboard.press('Enter');
  }
  await page.keyboard.press('Escape');
  const shown = await f.loc.evaluate((e, items) => {
    let w: Element | null = e;
    for (let i = 0; i < 5 && w; i++) { if (items.every(t => ((w as HTMLElement).innerText || '').includes(t))) return true; w = w.parentElement; }
    return false;
  }, items);
  act({ intent, control: f.desc, how: 'token entry (type + Enter per item)', after: items, note: `tokens visible: ${shown}` });
  if (!shown) throw new AdaptationFailure(intent, `tokens ${JSON.stringify(items)} not visible after entry (${f.desc})`);
}
