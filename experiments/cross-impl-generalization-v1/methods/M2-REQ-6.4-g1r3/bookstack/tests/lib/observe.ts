// OBSERVATION LAYER (editable). Reports headings, visible text lines, list entries and editor field values.
import type { Locator, Page } from '@playwright/test';
import type { PageViewObs, PageEditorObs, ListObs } from './oracle';
import { readValue } from './adapt';

export async function pageView(page: Page): Promise<PageViewObs> {
  return page.evaluate(() => {
    const vis = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    // Focus on main content area - look for main element or article, then fallback to body
    const main = document.querySelector('main, article, [role="main"]');
    const target = main || document.body;
    const headings = Array.from(target.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')).filter(vis)
      .map(h => ((h as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim());
    const lines = (target.innerText || '').split('\n').map(s => s.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean);
    return { headings, lines, evidence: `url=${location.pathname}` };
  });
}

// Count visible opening entries (link/button) with the exact title inside the page-list scope.
export async function listEntries(scope: Locator | Page, title: string): Promise<ListObs> {
  const l = scope.getByRole('link', { name: title, exact: true }).or(scope.getByRole('button', { name: title, exact: true }));
  const n = await l.count(); let v = 0;
  for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) v++;
  return { entries: v, evidence: `${n} matching, ${v} visible` };
}

export async function editorState(page: Page, title: Locator | null, body: Locator | null, save: Locator | null): Promise<PageEditorObs> {
  return {
    titleValue: title ? await readValue(title) : null,
    bodyValue: body ? await readValue(body) : null,
    saveVisible: save ? await save.isVisible() : false,
    evidence: `title=${!!title} body=${!!body} save=${!!save}`,
  };
}
