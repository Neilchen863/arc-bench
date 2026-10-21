// EVALUATOR SELF-TEST (plan §5.3): same-named actions, nested surfaces, hidden native inputs, label descriptions.
// Only meaningful for method D's capability interface (method B has no equivalent entry points); B is covered by
// the observer self-test and by the case reproductions.
import { test, expect } from '@playwright/test';
import { openNoteEditor, enterNoteContent, selectLabel, dismissNoteEditor } from '../tests/lib/capabilities';
import { find, enterList } from '../tests/lib/drivers';

// A modal editor whose label chooser is a second modal with its own "Done" and "Close"; while the chooser is open the
// editor is aria-hidden, and the chooser fades out over 400 ms (still rendered, as in MUI/Element Plus).
const FIXTURE = `
<style>.hide{display:none}.fade{opacity:.5}input.skin{position:absolute;width:0;height:0;opacity:0;margin:0}</style>
<button id="new">Take a note…</button>
<div id="ed" role="dialog" aria-label="New note" class="hide">
  <input aria-label="Title"><textarea aria-label="Note text"></textarea>
  <button id="lab" aria-label="Change labels">🏷</button><button id="close">Close</button>
</div>
<div id="ch" role="dialog" aria-label="Label note" class="hide">
  <label class="opt"><input type="checkbox" class="skin" id="rem"><span>Reminders</span></label>
  <button id="done">Done</button><button>Close</button>
</div>
<p id="log"></p>
<script>
  const $ = id => document.getElementById(id);
  $('new').onclick = () => $('ed').classList.remove('hide');
  $('lab').onclick = () => { $('ch').classList.remove('hide'); $('ed').setAttribute('aria-hidden', 'true'); };
  $('done').onclick = () => { $('ch').classList.add('fade'); setTimeout(() => { $('ch').classList.add('hide'); $('ch').classList.remove('fade'); $('ed').removeAttribute('aria-hidden'); }, 400); };
  $('close').onclick = () => { $('log').textContent = 'editor closed; labels=' + ($('rem').checked ? 'Reminders' : ''); $('ed').classList.add('hide'); };
</script>`;

test('nested chooser with same-named Done/Close: editor closed by its own Close after chooser is gone', async ({ page }) => {
  await page.setContent(FIXTURE);
  const ed = await openNoteEditor(page);
  await enterNoteContent(page, ed, 'T1', 'C1');
  await selectLabel(page, ed, ['Reminders']);
  await dismissNoteEditor(page, ed);
  await expect(page.locator('#log')).toHaveText('editor closed; labels=Reminders');
});

test('label text with an aria-describedby hint still identifies the field', async ({ page }) => {
  await page.setContent(`<label><span>Tags</span><input aria-describedby="h"><small id="h">Separate tags with commas</small></label>
    <label><span>Name</span><input></label>`);
  const f = await find(page, { what: 'tags', kinds: ['textbox'], names: /^(tags|book tags)$/i }, 1_000);
  expect(f.desc).toContain('Tags');
});

test('two same-named actions without a business scope are ambiguous (no first() pick)', async ({ page }) => {
  await page.setContent(`<button>Close</button><div><button>Close</button></div>`);
  await expect(find(page, { what: 'close', kinds: ['action'], names: /^close$/i }, 500)).rejects.toThrow(/ambiguous 2/);
});

test('a control behind a modal (aria-hidden) is not operable', async ({ page }) => {
  await page.setContent(`<main aria-hidden="true"><button>Notes</button></main><div role="dialog"><p>modal</p></div>`);
  await expect(find(page, { what: 'notes', kinds: ['action'], names: /^notes$/i }, 500)).rejects.toThrow(/no operable match/);
});

test('label decorations: aria-hidden required marker and (optional) qualifier', async ({ page }) => {
  await page.setContent(`<label for="n">Name <span aria-hidden="true">*</span></label><input id="n">
    <label for="t">Tags <span>(optional)</span></label><input id="t">`);
  await find(page, { what: 'name', kinds: ['textbox'], names: /^(name|book name)$/i }, 500);
  await find(page, { what: 'tags', kinds: ['textbox'], names: /^(tags|book tags)$/i }, 500);
});

test('label decoration rule does not merge different words (Tag line is not Tags)', async ({ page }) => {
  await page.setContent(`<label for="t">Tag line (optional)</label><input id="t">`);
  await expect(find(page, { what: 'tags', kinds: ['textbox'], names: /^(tags|book tags)$/i }, 500)).rejects.toThrow(/no operable match/);
});

const CHIPS = `<label for="tg">Tags</label><div class="w"><span id="chips"></span><input id="tg" role="combobox" aria-expanded="false"></div>
<script>const i = document.getElementById('tg'); i.addEventListener('keydown', e => { if (e.key === 'Enter' && i.value.trim()) {
  const s = document.createElement('span'); s.textContent = i.value.trim(); document.getElementById('chips').appendChild(s); i.value = ''; } });</script>`;

test('token combobox: each tag committed with Enter and visible as a chip', async ({ page }) => {
  await page.setContent(CHIPS);
  await enterList(page, await find(page, { what: 'tags', kinds: ['textbox'], names: /^tags$/i }, 500), ['manual', 'handbook'], 'tags');
  await expect(page.locator('#chips')).toHaveText('manualhandbook');
});

test('token combobox that never shows tokens is an adaptation failure (not silently accepted)', async ({ page }) => {
  await page.setContent(`<label for="tg">Tags</label><input id="tg" role="combobox">`);
  await expect(enterList(page, await find(page, { what: 'tags', kinds: ['textbox'], names: /^tags$/i }, 500), ['manual'], 'tags')).rejects.toThrow(/not visible/);
});

test('editor still fading in when the chooser opens is not taken as the chooser', async ({ page }) => {
  await page.setContent(FIXTURE.replace('<style>', '<style>#ed{transition:opacity 1.5s}#ed.fadein{opacity:0.01}')
    .replace("$('new').onclick = () => $('ed').classList.remove('hide');",
             "$('new').onclick = () => { $('ed').classList.remove('hide'); $('ed').classList.add('fadein'); setTimeout(() => $('ed').classList.remove('fadein'), 1200); };"));
  const ed = await openNoteEditor(page);
  await enterNoteContent(page, ed, 'T2', 'C2');
  await selectLabel(page, ed, ['Reminders']);
  await dismissNoteEditor(page, ed);
  await expect(page.locator('#log')).toHaveText('editor closed; labels=Reminders');
});
