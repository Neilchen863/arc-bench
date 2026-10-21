import { test, expect } from '@playwright/test';
import * as K from '../../../../methods/M0L/keep/tests/lib/oracle';
import * as B from '../../../../methods/M0L/bookstack/tests/lib/oracle';
const n = (o: Partial<K.NoteObs>): K.NoteObs => ({ title: 'T', matches: 1, visible: true, titleShown: true, lines: ['T', 'First line', 'Second line'], evidence: '', ...o });
const bad = (f: () => void, id: string) => expect(f).toThrow(new RegExp(`OBLIGATION_FAIL ${id}`));
test('keep fixtures', () => {
  K.exactlyOneVisible('K22-O2', n({})); K.showsLines('K22-O4', n({}), 'First line\nSecond line');
  bad(() => K.showsLines('K22-O4', n({ lines: ['T', 'First line'] }), 'First line\nSecond line'), 'K22-O4');          // missing line
  bad(() => K.showsLines('K22-O4', n({ lines: ['T', 'First line Second line'] }), 'First line\nSecond line'), 'K22-O4'); // joined
  bad(() => K.showsLines('K22-O4', n({ lines: ['T', 'Second line', 'First line'] }), 'First line\nSecond line'), 'K22-O4'); // order
  bad(() => K.exactlyOneVisible('K22-O2', n({ matches: 2 })), 'K22-O2');      // duplicate
  bad(() => K.exactlyOneVisible('K22-O6', n({ matches: 0, visible: false })), 'K22-O6'); // not persisted
  bad(() => K.showsTitle('K22-O3', n({ titleShown: false })), 'K22-O3');       // wrong title
  bad(() => K.hidden('K41-O3', n({})), 'K41-O3');                              // extra list item
  K.hidden('K41-O3', n({ matches: 0, visible: false }));
  K.highlighted('K41-O4', 'T', [{ text: 'St', vhl: true, vhlReason: 'bg' }], 'st');
  bad(() => K.highlighted('K41-O4', 'T', [{ text: 'St', vhl: false, vhlReason: '' }], 'st'), 'K41-O4');   // invisible highlight
  bad(() => K.highlighted('K41-O4', 'T', [{ text: 'Study', vhl: true, vhlReason: 'bg' }], 'st'), 'K41-O4'); // whole word
  bad(() => K.editorClosed('K22-O1', { open: true, evidence: '' }), 'K22-O1');
});
test('bookstack fixtures', () => {
  const v = { headings: ['Book', 'Page B'], lines: ['Page B', 'Body B'], evidence: '' };
  B.opened('B64-O1', 'Page B', v); B.bodyShown('B64-O2', 'Body B', v); B.notOther('B64-O3', [{ title: 'Page A', body: 'Body A' }], v);
  bad(() => B.opened('B64-O1', 'Page B', { ...v, headings: ['Page A'] }), 'B64-O1');                    // wrong object opened
  bad(() => B.notOther('B64-O3', [{ title: 'Page A', body: 'Body A' }], { ...v, lines: ['Body A'] }), 'B64-O3');
  bad(() => B.editorBody('B64-O5', 'Body B', { titleValue: 'Page B', bodyValue: '', saveVisible: true, evidence: '' }), 'B64-O5'); // empty prefill
  bad(() => B.editorBody('B64-O5', 'Body B', { titleValue: 'Page B', bodyValue: 'Body A', saveVisible: true, evidence: '' }), 'B64-O5'); // other page prefill
  bad(() => B.saveAvailable('B64-O6', { titleValue: '', bodyValue: '', saveVisible: false, evidence: '' }), 'B64-O6');
  bad(() => B.listedOnce('B64-P1', 'P', { entries: 2, evidence: '' }), 'B64-P1');
});
