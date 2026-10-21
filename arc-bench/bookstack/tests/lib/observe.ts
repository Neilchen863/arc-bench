// METHOD D observation: reading view (same as method B pageView).
import type { Page } from '@playwright/test';
import type { PageViewObs } from './oracle';

export async function pageView(page: Page): Promise<PageViewObs> {
  return page.evaluate(() => {
    const vis = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')).filter(vis)
      .map(h => ((h as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim());
    const lines = (document.body.innerText || '').split('\n').map(s => s.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean);
    return { headings, lines, evidence: `url=${location.pathname}` };
  });
}
