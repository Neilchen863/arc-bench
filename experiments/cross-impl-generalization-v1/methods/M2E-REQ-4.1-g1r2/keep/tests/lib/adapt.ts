// Generic locating utilities for the operation layer (editable by revision methods).
// Rule: the target must resolve to exactly one visible element. There is no first()/nth(0) fallback.
import type { Locator, Page } from '@playwright/test';

export class AdaptationFailure extends Error {
  constructor(what: string, detail: string) { super(`ADAPTATION_FAIL ${what}: ${detail}`); }
}

export type Scope = Page | Locator;
export type Candidate = { how: string; loc: (s: Scope) => Locator };

export const byRole = (role: Parameters<Page['getByRole']>[0], name: RegExp | string, exact = true): Candidate => ({
  how: `${role}:${name}`,
  loc: s => s.getByRole(role, typeof name === 'string' ? { name, exact } : { name }),
});
export const byLabel = (name: RegExp): Candidate => ({ how: `label:${name}`, loc: s => s.getByLabel(name) });
export const byPlaceholder = (name: RegExp): Candidate => ({ how: `placeholder:${name}`, loc: s => s.getByPlaceholder(name) });
export const byText = (text: string | RegExp): Candidate => ({
  how: `text:${text}`,
  loc: s => s.getByText(text, { exact: typeof text === 'string' }),
});
export const byCss = (css: string): Candidate => ({ how: `css:${css}`, loc: s => s.locator(css) });

async function visibleOnly(l: Locator): Promise<Locator[]> {
  const n = await l.count();
  const out: Locator[] = [];
  for (let i = 0; i < n; i++) if (await l.nth(i).isVisible()) out.push(l.nth(i));
  return out;
}

// Polls the candidate strategies in order. The first strategy with exactly one visible match wins.
// A strategy with several visible matches counts as ambiguous and is skipped.
export async function resolve(scope: Scope, what: string, cands: Candidate[], timeout = 10_000): Promise<Locator> {
  const deadline = Date.now() + timeout;
  let last = '';
  while (true) {
    const seen: string[] = [];
    for (const c of cands) {
      const vis = await visibleOnly(c.loc(scope));
      if (vis.length === 1) return vis[0];
      seen.push(`${c.how}=${vis.length}`);
    }
    last = seen.join(', ');
    if (Date.now() > deadline) throw new AdaptationFailure(what, `no unique visible match (${last})`);
    await new Promise(r => setTimeout(r, 250));
  }
}

export async function isEditable(l: Locator): Promise<'input' | 'rich'> {
  return l.evaluate(e => (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement) ? 'input' : 'rich');
}

// Enter text the way a user would. Native fields use fill. Rich editors receive typed lines separated by Enter.
export async function enterText(page: Page, field: Locator, text: string) {
  if ((await isEditable(field)) === 'input') {
    await field.fill(text);
  } else {
    await field.click();
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.press('Backspace');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (i) await page.keyboard.press('Enter');
      await page.keyboard.type(lines[i]);
    }
  }
}

export async function readValue(field: Locator): Promise<string> {
  return field.evaluate(e => (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement)
    ? e.value : (e as HTMLElement).innerText);
}

// Retry an observation and judgement until the judgement passes or the timeout expires; rethrow the last failure.
export async function eventually<T>(observe: () => Promise<T>, judge: (o: T) => void, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (true) {
    try { judge(await observe()); return; } catch (e) {
      if (Date.now() > deadline) throw e;
      await new Promise(r => setTimeout(r, 250));
    }
  }
}
