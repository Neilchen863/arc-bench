// OBSERVATION LAYER (editable). Reports headings, visible text lines, list entries and editor field values.
import type { Locator, Page } from '@playwright/test';
import type { PageViewObs, PageEditorObs, ListObs } from './oracle';
import { readValue } from './adapt';

export async function pageView(page: Page): Promise<PageViewObs> {
  return page.evaluate(() => {
    const vis = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const norm = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' ').replace(/\n+/g, ' ').trim();
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')).filter(vis)
      .map(h => norm((h as HTMLElement).innerText || ''));
    const lines = (document.body.innerText || '').split('\n').map(s => norm(s)).filter(Boolean);
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
