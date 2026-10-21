// ORACLE CORE (read-only for every method; hashed in protocol). Pure judgments over Observations.
export class ObligationFailure extends Error {
  constructor(public obligation: string, detail: string) { super(`OBLIGATION_FAIL ${obligation}: ${detail}`); }
}
const fail = (id: string, detail: string): never => { throw new ObligationFailure(id, detail); };
const norm = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' ').replace(/\n+/g, '\n').trim();

// What a reading view shows: visible heading texts and visible text lines of the main content.
export interface PageViewObs { headings: string[]; lines: string[]; evidence: string }
export interface PageEditorObs { titleValue: string | null; bodyValue: string | null; saveVisible: boolean; evidence: string }
export interface ListObs { entries: number; evidence: string }

export function listedOnce(id: string, title: string, l: ListObs) {
  if (l.entries !== 1) fail(id, `page list should show "${title}" exactly once, observed ${l.entries} (${l.evidence})`);
}
export function opened(id: string, title: string, v: PageViewObs) {
  if (!v.headings.map(norm).includes(norm(title))) fail(id, `no heading "${title}"; headings=${JSON.stringify(v.headings)}`);
}
export function bodyShown(id: string, body: string, v: PageViewObs) {
  if (!v.lines.map(norm).includes(norm(body))) fail(id, `saved body "${body}" not visible; lines=${JSON.stringify(v.lines.slice(0, 40))}`);
}
export function notOther(id: string, others: { title: string; body: string }[], v: PageViewObs) {
  for (const o of others) {
    if (v.headings.map(norm).includes(norm(o.title))) fail(id, `another page's title "${o.title}" is shown as heading`);
    if (v.lines.map(norm).includes(norm(o.body))) fail(id, `another page's body "${o.body}" is shown`);
  }
}
export function editorTitle(id: string, title: string, e: PageEditorObs) {
  if (e.titleValue === null || norm(e.titleValue) !== norm(title)) fail(id, `editor title field holds ${JSON.stringify(e.titleValue)}, expected "${title}" (${e.evidence})`);
}
export function editorBody(id: string, body: string, e: PageEditorObs) {
  if (e.bodyValue === null || norm(e.bodyValue) !== norm(body)) fail(id, `editor body field holds ${JSON.stringify(e.bodyValue)}, expected "${body}" (${e.evidence})`);
}
export function saveAvailable(id: string, e: PageEditorObs) {
  if (!e.saveVisible) fail(id, `no visible save-page action (${e.evidence})`);
}
