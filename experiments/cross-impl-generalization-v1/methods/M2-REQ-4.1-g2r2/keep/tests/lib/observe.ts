// OBSERVATION LAYER (editable by revision methods). Reports what the page shows and never reads expected values
// other than the business identity (title) it is asked to locate. It returns raw evidence for audit.
import type { Locator, Page } from '@playwright/test';
import type { NoteObs, HighlightObs, EditorObs } from './oracle';

// In-browser: locate note records by their exact visible title and return the record's visual lines.
// A record is the nearest ancestor of the title element that is
//   (a) semantic (article/li/tr/[role=article|listitem|row|region|gridcell|group]),
//   (b) one of several repeated siblings with the same tag and class, or
//   (c) a direct child of a list-like container (ul/ol, role list/grid/feed, CSS grid, wrapping flex, columns),
// and that contains text beyond the title. Elements inside dialogs are ignored.
const FIND_NOTES = (title: string) => {
  const clean = (s: string) => s.replace(/[ \t ]+/g, ' ').trim();
  const inDialog = (e: Element) => !!e.closest('[role=dialog],dialog,[aria-modal=true]');
  const all = Array.from(document.body.querySelectorAll('*')).filter(e =>
    !['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'OPTION'].includes(e.tagName) && !inDialog(e) &&
    clean((e as HTMLElement).innerText || '') === title);
  // Keep the deepest elements only.
  const titles = all.filter(e => !all.some(o => o !== e && e.contains(o)));
  const semantic = 'article,li,tr,[role=article],[role=listitem],[role=row],[role=region],[role=gridcell],[role=group]';
  const listLike = (p: Element) => {
    if (/^(UL|OL)$/.test(p.tagName) || /^(list|grid|feed|rowgroup)$/.test(p.getAttribute('role') || '')) return true;
    const cs = getComputedStyle(p);
    return cs.display.includes('grid') || (cs.display.includes('flex') && cs.flexWrap === 'wrap') || (cs.columnCount !== 'auto' && cs.columnCount !== '1');
  };
  const record = (t: Element): Element => {
    let a: Element | null = t.parentElement;
    let first: Element | null = null;
    while (a && a !== document.body) {
      const p = a.parentElement;
      const extra = clean((a as HTMLElement).innerText || '') !== title;
      const repeated = !!p && Array.from(p.children).filter(c => c !== a && c.tagName === a!.tagName && c.className === (a as HTMLElement).className).length > 0;
      if (extra && (a.matches(semantic) || repeated || (p && listLike(p)))) return a;
      if (extra && !first) first = a;
      a = p;
    }
    return first || t.parentElement || t;
  };
  const recs: Element[] = [];
  for (const t of titles) { const r = record(t); if (!recs.includes(r)) recs.push(r); }
  const vis = (e: Element) => {
    const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  };
  const shown = recs.filter(vis);
  const r0 = shown[0] as HTMLElement | undefined;
  const lines = r0 ? (r0.innerText || '').replace(/\r\n?/g, '\n').split('\n').map(clean).filter(Boolean) : [];
  return {
    matches: recs.length, visible: shown.length > 0, titleShown: lines.includes(title), lines,
    evidence: recs.map(r => `<${r.tagName.toLowerCase()} role=${r.getAttribute('role')} class="${(r as HTMLElement).className}">`).join(' | '),
  };
};

// Search-aware note locator: checks if keyword appears in title or content
const FIND_NOTES_WITH_KEYWORD = ({ title, keyword }: { title: string; keyword: string }) => {
  const clean = (s: string) => s.replace(/[ \t ]+/g, ' ').trim();
  const inDialog = (e: Element) => !!e.closest('[role=dialog],dialog,[aria-modal=true]');
  const all = Array.from(document.body.querySelectorAll('*')).filter(e =>
    !['SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'OPTION'].includes(e.tagName) && !inDialog(e) &&
    clean((e as HTMLElement).innerText || '') === title);
  const titles = all.filter(e => !all.some(o => o !== e && e.contains(o)));
  const semantic = 'article,li,tr,[role=article],[role=listitem],[role=row],[role=region],[role=gridcell],[role=group]';
  const listLike = (p: Element) => {
    if (/^(UL|OL)$/.test(p.tagName) || /^(list|grid|feed|rowgroup)$/.test(p.getAttribute('role') || '')) return true;
    const cs = getComputedStyle(p);
    return cs.display.includes('grid') || (cs.display.includes('flex') && cs.flexWrap === 'wrap') || (cs.columnCount !== 'auto' && cs.columnCount !== '1');
  };
  const record = (t: Element): Element => {
    let a: Element | null = t.parentElement;
    let first: Element | null = null;
    while (a && a !== document.body) {
      const p = a.parentElement;
      const extra = clean((a as HTMLElement).innerText || '') !== title;
      const repeated = !!p && Array.from(p.children).filter(c => c !== a && c.tagName === a!.tagName && c.className === (a as HTMLElement).className).length > 0;
      if (extra && (a.matches(semantic) || repeated || (p && listLike(p)))) return a;
      if (extra && !first) first = a;
      a = p;
    }
    return first || t.parentElement || t;
  };
  const recs: Element[] = [];
  for (const t of titles) { const r = record(t); if (!recs.includes(r)) recs.push(r); }
  const vis = (e: Element) => {
    const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  };
  const keywordLower = keyword.toLowerCase();
  const matchesKeyword = (rec: Element) => {
    const text = clean(rec.innerText || '');
    return text.toLowerCase().includes(keywordLower);
  };
  const shown = recs.filter(vis).filter(matchesKeyword);
  const r0 = shown[0] as HTMLElement | undefined;
  const lines = r0 ? (r0.innerText || '').replace(/\r\n?/g, '\n').split('\n').map(clean).filter(Boolean) : [];
  return {
    matches: recs.length, visible: shown.length > 0, titleShown: lines.includes(title), lines,
    evidence: recs.map(r => `<${r.tagName.toLowerCase()} role=${r.getAttribute('role')} class="${(r as HTMLElement).className}">`).join(' | '),
  };
};

export async function note(page: Page, title: string, keyword?: string): Promise<NoteObs> {
  if (keyword) {
    const o = await page.evaluate(FIND_NOTES_WITH_KEYWORD, { title, keyword });
    return { title, ...o };
  }
  const o = await page.evaluate(FIND_NOTES, title);
  return { title, ...o };
}

// Highlight fragments inside the note record with this title. Candidates are <mark>, elements named/classed
// highlight/match, and elements whose text is exactly the searched keyword (any case) and a strict part of their parent's text.
// V-HL (frozen in the spec audit): differs from the parent in background (Δ≥30 in a channel, non-transparent),
// in weight (≥600 vs ≤500) or in text-decoration-line.
export async function highlights(page: Page, title: string, keyword: string): Promise<HighlightObs[]> {
  return page.evaluate(({ title, keyword }: { title: string; keyword: string }) => {
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
    const recs = Array.from(document.querySelectorAll('*')).filter(e => clean((e as HTMLElement).innerText || '') === title);
    const out: { text: string; vhl: boolean; vhlReason: string }[] = [];
    const rgb = (s: string) => (s.match(/[\d.]+/g) || []).map(Number);
    const seen = new Set<Element>();
    for (const t of recs) {
      let rec: Element | null = t;
      // Climb to the smallest ancestor that has text beyond the title (the record); highlights may be in title or body.
      while (rec && clean((rec as HTMLElement).innerText || '') === title) rec = rec.parentElement;
      if (!rec) continue;
      for (let i = 0; i < 4 && rec.parentElement && rec.parentElement !== document.body; i++) {
        const p = rec.parentElement; if (p.querySelectorAll('*').length > 400) break; rec = p;
        if (rec.matches('article,li,tr,[role=article],[role=listitem],[role=row],[role=region]')) break;
      }
      rec.querySelectorAll('*').forEach(e => {
        if (seen.has(e)) return;
        const txt = clean((e as HTMLElement).innerText || e.textContent || '');
        const parent = e.parentElement; if (!parent || !txt) return;
        const ptxt = clean(parent.innerText || '');
        const named = /highlight|match/i.test(`${(e as HTMLElement).className} ${e.getAttribute('aria-label') || ''}`);
        const partial = ptxt.length > txt.length && txt.toLowerCase() === keyword.toLowerCase();
        if (!(e.tagName === 'MARK' || named || partial)) return;
        const cs = getComputedStyle(e), ps = getComputedStyle(parent);
        const bg = rgb(cs.backgroundColor), pbg = rgb(ps.backgroundColor);
        const bgVisible = bg.length >= 3 && (bg.length < 4 || bg[3] > 0.1);
        const bgDiff = bgVisible && (pbg.length < 3 || (pbg.length === 4 && pbg[3] === 0) ? true : bg.slice(0, 3).some((v, k) => Math.abs(v - pbg[k]) >= 30));
        const w = Number(cs.fontWeight), pw = Number(ps.fontWeight);
        const weightDiff = w >= 600 && pw <= 500;
        const decoDiff = cs.textDecorationLine !== ps.textDecorationLine && cs.textDecorationLine !== 'none';
        const reason = [bgDiff && `bg ${cs.backgroundColor} vs ${ps.backgroundColor}`, weightDiff && `weight ${w} vs ${pw}`, decoDiff && `deco ${cs.textDecorationLine}`].filter(Boolean).join('; ');
        seen.add(e);
        out.push({ text: txt, vhl: !!reason, vhlReason: reason || `none (bg ${cs.backgroundColor}, weight ${w})` });
      });
    }
    return out;
  }, { title, keyword });
}

export async function editorState(editor: Locator): Promise<EditorObs> {
  const open = await editor.isVisible().catch(() => false);
  return { open, evidence: open ? 'editor locator still visible' : 'editor locator hidden/detached' };
}

// Whether a suggestion panel is visible: a container named or headed with "suggest"/"filter" semantics.
export async function suggestionPanel(page: Page): Promise<{ shown: boolean; evidence: string; panel: Locator | null }> {
  // Try to find by role with aria-label containing "Suggested filters" or "suggest" + "filter"
  const panelCandidates = page.locator('[role="region"],[role="dialog"],[role="listbox"],[role="group"],[role="menu"]');
  const count = await panelCandidates.count();
  for (let i = 0; i < count; i++) {
    const panel = panelCandidates.nth(i);
    const ariaLabel = await panel.getAttribute('aria-label');
    const hasSuggest = ariaLabel && /Suggested|suggest/i.test(ariaLabel);
    const hasFilter = ariaLabel && /filter/i.test(ariaLabel);
    if (hasSuggest && hasFilter) {
      return { shown: true, evidence: `suggestion panel found by aria-label "${ariaLabel}"`, panel };
    }
  }

  // Fallback: look for a container with "Suggested" text and filter-like buttons
  const textBased = await page.locator('section,div,aside,[role=region],[role=listbox]').filter({
    hasText: /Suggested|filter/i
  }).first().isVisible();
  if (textBased) {
    const panel = page.locator('section,div,aside,[role=region],[role=listbox]').filter({
      hasText: /Suggested|filter/i
    }).first();
    return { shown: true, evidence: 'suggestion panel found by text content', panel };
  }

  // Last resort: look for a container with buttons that have "Reminders" or similar labels
  const buttonBased = await page.locator('[role="listbox"],[role="group"],[role="menu"]').filter({
    has: page.getByRole('button', { name: /Reminders|Labels/i })
  }).first().isVisible();
  if (buttonBased) {
    const panel = page.locator('[role="listbox"],[role="group"],[role="menu"]').filter({
      has: page.getByRole('button', { name: /Reminders|Labels/i })
    }).first();
    return { shown: true, evidence: 'suggestion panel found by button content', panel };
  }

  return { shown: false, evidence: 'no suggestion container found', panel: null };
}
