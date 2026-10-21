// COMMON CONTRACT OBSERVATION (B1-C01; shared verbatim by every method). Raw facts only, no judgement.
import type { Locator, Page } from '@playwright/test';
import type { EditorObs } from './oracle';

// Visible editable controls whose current value contains the entered title or content,
// plus whether the bound editor surface is a modal dialog that is still visible.
export async function editingState(page: Page, surface: Locator | null, title: string, content: string): Promise<EditorObs> {
  const activeControls = await page.evaluate(({ title, content }) => {
    const vis = (e: Element) => {
      const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0
        && !e.closest('[aria-hidden=true],[inert]');
    };
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
    const needles = [title, ...content.split('\n')].map(clean).filter(Boolean);
    const ctrls = Array.from(document.querySelectorAll('input,textarea,[contenteditable=""],[contenteditable=true],[role=textbox]'));
    const out: { tag: string; name: string; value: string }[] = [];
    for (const c of ctrls) {
      if (!vis(c)) continue;
      const editable = c instanceof HTMLInputElement || c instanceof HTMLTextAreaElement
        ? !(c as HTMLInputElement).readOnly && !(c as HTMLInputElement).disabled
        : (c as HTMLElement).isContentEditable;
      if (!editable) continue;
      const value = c instanceof HTMLInputElement || c instanceof HTMLTextAreaElement ? c.value : (c as HTMLElement).innerText || '';
      if (needles.some(n => clean(value).includes(n))) {
        out.push({ tag: c.tagName.toLowerCase(), name: c.getAttribute('aria-label') || c.getAttribute('placeholder') || '', value: clean(value).slice(0, 200) });
      }
    }
    return out;
  }, { title, content });
  let modalSurfaceShown = false; let evidence = 'no bound surface';
  if (surface) {
    const info = await surface.evaluate(e => ({
      modal: e.matches('[role=dialog],[role=alertdialog],dialog,[aria-modal=true]') || !!e.closest('[role=dialog],dialog,[aria-modal=true]'),
      shown: (() => { const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; })(),
      tag: e.tagName.toLowerCase(), role: e.getAttribute('role'),
    }), undefined, { timeout: 1_000 }).catch(() => null);
    if (info) { modalSurfaceShown = info.modal && info.shown; evidence = `surface <${info.tag} role=${info.role}> modal=${info.modal} shown=${info.shown}`; }
    else evidence = 'surface detached';
  }
  return { activeControls, modalSurfaceShown, evidence };
}
