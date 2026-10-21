// ORACLE CORE (B1; shared verbatim by every method; hashed in protocol). Pure business judgments over Observations.
// Knows nothing about selectors, frameworks or component libraries. Every check names its obligation id.
// Inputs: Observation objects produced by observe.ts and scenario inputs from inputs.ts.

export class ObligationFailure extends Error {
  constructor(public obligation: string, detail: string) { super(`OBLIGATION_FAIL ${obligation}: ${detail}`); }
}
const fail = (id: string, detail: string): never => { throw new ObligationFailure(id, detail); };

// A note as observed on screen. `lines` are the visually distinct text lines inside the note (innerText split),
// trimmed, empty lines removed; `titleShown` tells whether a line equals the title exactly.
export interface NoteObs { title: string; matches: number; visible: boolean; titleShown: boolean; lines: string[];
  evidence: string; }
export interface HighlightObs { text: string; vhl: boolean; vhlReason: string; }
// B1-C01: raw facts about the editing interface after the dismiss action.
// activeControls: visible, editable controls (input/textarea/contenteditable/role=textbox) whose current value
// contains the entered title or content. modalSurfaceShown: the bound editor surface is a modal dialog and still visible.
export interface EditorObs { activeControls: { tag: string; name: string; value: string }[]; modalSurfaceShown: boolean; evidence: string; }

const norm = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[ \t ]+/g, ' ').trim();

export function editorClosed(id: string, e: EditorObs) {
  if (e.activeControls.length) fail(id, `editor still active: ${JSON.stringify(e.activeControls)} (${e.evidence})`);
  if (e.modalSurfaceShown) fail(id, `editor dialog still shown (${e.evidence})`);
}
export function exactlyOneVisible(id: string, n: NoteObs) {
  if (n.matches !== 1) fail(id, `expected exactly one note titled "${n.title}", observed ${n.matches} (${n.evidence})`);
  if (!n.visible) fail(id, `note "${n.title}" not visible`);
}
export function hidden(id: string, n: NoteObs) {
  if (n.matches > 0 && n.visible) fail(id, `note "${n.title}" should not be shown, observed ${n.matches}`);
}
export function showsTitle(id: string, n: NoteObs) {
  if (!n.titleShown) fail(id, `note does not visibly show its exact title "${n.title}"; lines=${JSON.stringify(n.lines)}`);
}
// Expected content lines must appear as consecutive, distinct visual lines in order (A-K22-1).
export function showsLines(id: string, n: NoteObs, content: string) {
  const want = norm(content).split('\n').map(norm).filter(Boolean);
  const got = n.lines.map(norm);
  for (let i = 0; i + want.length <= got.length; i++) {
    if (want.every((w, k) => got[i + k] === w)) return;
  }
  fail(id, `content lines ${JSON.stringify(want)} not shown as consecutive lines; observed ${JSON.stringify(got)}`);
}
// V-HL: at least one highlight fragment inside the note whose text is exactly the keyword (case-insensitive)
// and that passes the frozen visual-distinction rule. Any highlight with other text is a failure.
export function highlighted(id: string, title: string, hs: HighlightObs[], keyword: string) {
  const good = hs.filter(h => h.text.trim().toLowerCase() === keyword.toLowerCase() && h.vhl);
  if (!good.length) fail(id, `no visible highlight of "${keyword}" in "${title}": ${JSON.stringify(hs)}`);
  const wrong = hs.filter(h => h.vhl && h.text.trim().toLowerCase() !== keyword.toLowerCase());
  if (wrong.length) fail(id, `highlight shows non-matching text in "${title}": ${JSON.stringify(wrong)}`);
}
export function panelShown(id: string, shown: boolean, evidence: string) {
  if (!shown) fail(id, `suggested filters panel not shown (${evidence})`);
}
