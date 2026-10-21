// Independent certifier script for B-keep (keep REQ-2.2 / REQ-4.1). Written from checklist-pilot.md.
// Usage: node certify.mjs <buildDir> <variant> <scenario> <rep> <port> <outDir>
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const [B, variant, scenario, rep, portS, OUT] = process.argv.slice(2);
const port = Number(portS);
const base = `http://127.0.0.1:${port}`;
fs.mkdirSync(OUT, { recursive: true });
const logLines = [];
const log = (s) => { logLines.push(`[${new Date().toISOString()}] ${s}`); };
const ob = {};
const setOb = (id, holds, reason) => { ob[id] = { holds: !!holds, reason }; log(`OBLIGATION ${id}: ${holds ? 'HOLDS' : 'FAILS'} - ${reason}`); };
const hex = () => crypto.randomBytes(3).toString('hex').replace(/[^0-9a-f]/g, '');
let shotN = 0;
const shot = async (page, name) => { shotN++; const f = `${String(shotN).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: path.join(OUT, f), fullPage: true }); log(`screenshot ${f}`); };
const getApi = async () => ({ notes: await (await fetch(`${base}/api/notes`)).json(), labels: await (await fetch(`${base}/api/labels`)).json() });
const activeApiWithTitle = (api, t) => api.notes.filter(n => n.title === t && !n.trashed && !n.archived);

const srv = spawn(process.execPath, ['server/server.mjs'], { cwd: B, env: { ...process.env, PORT: String(port), APP: 'keep', STATIC_DIR: path.join(B, 'app/dist') }, stdio: ['ignore', fs.openSync(path.join(OUT, 'server.log'), 'w'), fs.openSync(path.join(OUT, 'server.log'), 'a')] });
log(`server pid ${srv.pid} build ${B} port ${port}`);
let browser;
const pageErrors = [];
let crashed = null;
try {
  let healthy = null;
  for (let i = 0; i < 100; i++) { try { const r = await fetch(`${base}/__health`); if (r.ok) { healthy = await r.json(); break; } } catch {} await new Promise(r => setTimeout(r, 100)); }
  if (!healthy) throw new Error('server not healthy');
  await fetch(`${base}/__reset`, { method: 'POST' });
  log(`POST /__reset; health ${JSON.stringify(healthy)}`);
  fs.writeFileSync(path.join(OUT, 'api-before.json'), JSON.stringify(await getApi(), null, 2));

  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  const page = await ctx.newPage();
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
  await page.goto(base + '/'); log(`goto ${base}/`);
  await page.getByRole('button', { name: /take a note/i }).waitFor({ timeout: 10000 });
  const main = page.getByRole('main');
  const noteCard = (t) => main.getByRole('article', { name: t, exact: true });
  const titleHeadings = (t) => main.getByRole('heading', { name: t, exact: true });

  async function createNote(title, lines, { reminders = false } = {}) {
    const entry = page.getByRole('button', { name: /take a note/i });
    await entry.click(); log(`click button "${await entry.getAttribute('aria-label') || (await entry.innerText()).trim()}" (located by role=button, visible text "Take a note…")`);
    const dlg = page.getByRole('dialog', { name: 'New note' });
    await dlg.waitFor(); log('editor dialog "New note" visible (role=dialog, heading "New note")');
    const t = dlg.getByRole('textbox', { name: 'Title', exact: true });
    await t.click(); await page.keyboard.type(title); log(`click textbox "Title" in editor; type "${title}"`);
    const c = dlg.getByRole('textbox', { name: 'Note text' });
    await c.click(); log('click textbox "Note text" (placeholder "Take a note…") in editor');
    for (let i = 0; i < lines.length; i++) { if (i) { await page.keyboard.press('Enter'); log('press Enter (newline)'); } await page.keyboard.type(lines[i]); log(`type "${lines[i]}"`); }
    if (reminders) {
      await dlg.getByRole('button', { name: 'Change labels' }).click(); log('click button "Change labels" in editor toolbar');
      const ld = page.getByRole('dialog', { name: 'Label note' });
      await ld.waitFor(); log('dialog "Label note" visible');
      const cb = ld.getByRole('checkbox', { name: 'Reminders' });
      await ld.getByText('Reminders', { exact: true }).click(); log('click visible label text "Reminders" in group "Available labels" (checkbox)');
      const checked = await cb.isChecked(); log(`checkbox "Reminders" checked=${checked}`);
      await ld.getByRole('button', { name: 'Done' }).click(); log('click button "Done" in "Label note"');
      await ld.waitFor({ state: 'hidden' });
      if (!checked) throw new Error('prerequisite: Reminders checkbox could not be checked');
    }
    const close = dlg.getByRole('button', { name: 'Close', exact: true });
    await close.click(); log('click button "Close" (footer of editor dialog; the only dismiss control used; no Save control exists/used)');
    let gone = true;
    try { await dlg.waitFor({ state: 'hidden', timeout: 6000 }); } catch { gone = false; }
    log(`editor hidden after close: ${gone}`);
    return gone;
  }

  async function linesInfo(card, a, b) {
    return await card.evaluate((el, [a, b]) => {
      const rectOf = (needle) => {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n; while ((n = w.nextNode())) { const i = n.data.indexOf(needle); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + needle.length); const rr = r.getBoundingClientRect(); return { top: rr.top, bottom: rr.bottom, left: rr.left, h: rr.height, w: rr.width }; } }
        return null;
      };
      return { a: rectOf(a), b: rectOf(b), innerText: el.innerText };
    }, [a, b]);
  }

  async function highlights(card) {
    return await card.evaluate((el) => {
      const parseRGB = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const effBg = (e) => { while (e) { const c = parseRGB(getComputedStyle(e).backgroundColor); if (c && c.a > 0) return c; e = e.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
      const out = [];
      for (const e of el.querySelectorAll('*')) {
        if (e.closest('button,svg,[role=button]')) continue;
        const cs = getComputedStyle(e);
        if (!cs.display.startsWith('inline') || cs.display === 'inline-block' && e.children.length) continue;
        const txt = (e.textContent || '').trim(); if (!txt) continue;
        const parent = e.parentElement; const ps = getComputedStyle(parent);
        const own = parseRGB(cs.backgroundColor); const pb = effBg(parent);
        const bgDiff = own && own.a > 0 ? Math.max(Math.abs(own.r - pb.r), Math.abs(own.g - pb.g), Math.abs(own.b - pb.b)) : 0;
        const fw = parseInt(cs.fontWeight), pfw = parseInt(ps.fontWeight);
        const fwDiff = (fw >= 600 && pfw <= 500);
        const tdDiff = cs.textDecorationLine !== ps.textDecorationLine && cs.textDecorationLine !== 'none';
        if (bgDiff >= 30 || fwDiff || tdDiff) {
          const r = e.getBoundingClientRect();
          out.push({ tag: e.tagName.toLowerCase(), text: txt, bg: cs.backgroundColor, parentEffBg: `rgb(${pb.r},${pb.g},${pb.b})`, bgDiff, fontWeight: cs.fontWeight, parentFontWeight: ps.fontWeight, textDecoration: cs.textDecorationLine, w: r.width, h: r.height, parentTag: parent.tagName.toLowerCase() });
        }
      }
      return out;
    });
  }

  const visibleOnce = async (t) => { const n = await noteCard(t).count(); const h = await titleHeadings(t).count(); let vis = false; if (n === 1) vis = await noteCard(t).isVisible(); return { cards: n, headings: h, visible: vis }; };

  if (scenario === 'autosave_on_close' || scenario === 'persist_after_reload') {
    const auto = scenario === 'autosave_on_close';
    const title = (auto ? 'New note ' : 'Persistent note ') + hex();
    const lines = auto ? ['First line', 'Second line'] : ['Saved personal content'];
    log(`isolated title "${title}"`);
    const gone = await createNote(title, lines);
    await page.waitForTimeout(500);
    await shot(page, 'after-close');
    setOb('K22-O1', gone && !(await page.getByRole('dialog', { name: 'New note' }).isVisible()), gone ? 'editor dialog "New note" hidden after the Close click' : 'editor dialog still visible 6s after Close');
    const api1 = await getApi();
    const v = await visibleOnce(title);
    const apiN = activeApiWithTitle(api1, title).length;
    setOb('K22-O2', v.cards === 1 && v.headings === 1 && v.visible && apiN === 1, `visible note cards with title: ${v.cards} (headings ${v.headings}); active API notes with title: ${apiN}`);
    if (auto) {
      const titleVis = v.cards === 1 && await noteCard(title).getByText(title, { exact: true }).isVisible();
      setOb('K22-O3', titleVis, titleVis ? 'exact title text visible inside the note card' : 'title not visible in a single note card');
      if (v.cards >= 1) {
        const card = noteCard(title).first();
        await card.screenshot({ path: path.join(OUT, 'note-card.png') }); log('screenshot note-card.png (zoomed note)');
        const li = await linesInfo(card, 'First line', 'Second line');
        const ok = li.a && li.b && li.a.h > 0 && li.b.h > 0 && li.b.top >= li.a.bottom - 1 && await card.getByText('First line').isVisible() && await card.getByText('Second line').isVisible();
        setOb('K22-O4', ok, `First line rect ${JSON.stringify(li.a)}, Second line rect ${JSON.stringify(li.b)}; Second line starts below First line: ${!!ok}; innerText=${JSON.stringify(li.innerText.split('\n').slice(0, 4))}`);
      } else setOb('K22-O4', false, 'no note card with the title to show content lines');
      setOb('K22-O5', true, 'only the editor\'s "Close" button was used to dismiss the editor; no Save control was clicked (see actions.log)');
    } else {
      await page.reload(); log('reload page'); await page.getByRole('button', { name: /take a note/i }).waitFor();
      await page.waitForTimeout(800);
      await shot(page, 'after-reload');
      const v2 = await visibleOnce(title);
      let content = false;
      if (v2.cards === 1) content = await noteCard(title).getByText('Saved personal content', { exact: true }).isVisible();
      setOb('K22-O6', v2.cards === 1 && v2.visible && content, `after reload: note cards with title ${v2.cards}; "Saved personal content" visible in it: ${content}; active API notes with title: ${activeApiWithTitle(await getApi(), title).length}`);
    }
  } else if (scenario === 'search_title_content_highlight') {
    const sfx = hex();
    const notes = [['Study schedule ' + sfx, 'Math on Monday'], ['Reading plan ' + sfx, 'Read a story'], ['Ocean memo ' + sfx, 'Calm blue waves']];
    for (const [t, c] of notes) { const ok = await createNote(t, [c]); if (!ok) throw new Error('prerequisite: editor did not close for ' + t); await noteCard(t).waitFor({ timeout: 5000 }); }
    const sb = page.getByRole('searchbox', { name: 'Search notes' });
    await sb.click(); log('click searchbox "Search notes" in banner search landmark');
    await page.keyboard.type('st'); log('type "st"');
    await page.waitForTimeout(800);
    await shot(page, 'search-st');
    const [s, r, o] = notes.map(n => n[0]);
    const vs = await visibleOnce(s), vr = await visibleOnce(r), vo = await visibleOnce(o);
    const oceanText = await main.getByText(o).count();
    setOb('K41-O1', vs.cards === 1 && vs.visible, `Study schedule cards visible: ${vs.cards} (headings ${vs.headings})`);
    setOb('K41-O2', vr.cards === 1 && vr.visible, `Reading plan cards visible: ${vr.cards} (headings ${vr.headings})`);
    setOb('K41-O3', vo.cards === 0 && oceanText === 0, `Ocean memo cards: ${vo.cards}, text occurrences in main: ${oceanText}`);
    const hlRes = {};
    let okHL = true; const reasons = [];
    for (const [t] of [notes[0], notes[1]]) {
      const card = noteCard(t);
      if (await card.count() !== 1) { okHL = false; reasons.push(`${t.split(' ')[0]}: no single card`); continue; }
      await card.screenshot({ path: path.join(OUT, `hl-${t.split(' ')[0]}.png`) }); log(`screenshot hl-${t.split(' ')[0]}.png (zoomed note)`);
      const h = await highlights(card); hlRes[t] = h;
      const good = h.length >= 1 && h.every(x => x.text.toLowerCase() === 'st' && x.w > 0 && x.h > 0);
      if (!good) okHL = false;
      reasons.push(`${t.split(' ')[0]}: ${h.length} highlighted fragment(s) ${JSON.stringify(h.map(x => ({ text: x.text, tag: x.tag, bg: x.bg, vs: x.parentEffBg, d: x.bgDiff })))}`);
    }
    fs.writeFileSync(path.join(OUT, 'highlights.json'), JSON.stringify(hlRes, null, 2));
    setOb('K41-O4', okHL, reasons.join('; '));
    // clear and Notes
    const clear = page.getByRole('button', { name: 'Clear search' });
    await sb.click(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Backspace'); log('click searchbox, select all, Backspace (search emptied by typing)');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Notes', exact: true }).click(); log('click button "Notes" in navigation "Main navigation"');
    await page.waitForTimeout(800);
    await shot(page, 'cleared-notes');
    const sbVal = await sb.inputValue();
    let all = true; const rs = [];
    for (const [t, c] of notes) { const v = await visibleOnce(t); const cv = v.cards === 1 ? await noteCard(t).getByText(c, { exact: true }).isVisible() : false; if (!(v.cards === 1 && v.visible && cv)) all = false; rs.push(`${t.split(' ')[0]}: cards ${v.cards}, content visible ${cv}`); }
    setOb('K41-O5', all, rs.join('; ') + `; search value "${sbVal}"; clear-control present: ${await clear.count()}`);
  } else if (scenario === 'suggested_label_filter') {
    const sfx = hex();
    const rem = 'Call dentist existing ' + sfx, mov = 'Movie list ' + sfx;
    let p1 = true;
    if (!(await createNote(rem, ['Reminder content'], { reminders: true }))) p1 = false;
    if (!(await createNote(mov, ['Unlabeled content']))) throw new Error('prerequisite: editor did not close for movie note');
    await page.waitForTimeout(500);
    const apiP = await getApi();
    const remApi = activeApiWithTitle(apiP, rem);
    const tagVis = (await noteCard(rem).count()) === 1 ? await noteCard(rem).getByText('Reminders', { exact: true }).isVisible() : false;
    p1 = p1 && remApi.length === 1 && (remApi[0].labels || []).length === 1 && tagVis;
    await shot(page, 'prereq-created');
    setOb('K41-P1', p1, `reminder note API labels ${JSON.stringify(remApi.map(n => n.labels))}; "Reminders" tag visible on the card: ${tagVis}`);
    const sb = page.getByRole('searchbox', { name: 'Search notes' });
    await sb.click(); log('click (focus) searchbox "Search notes"');
    await page.waitForTimeout(600);
    await shot(page, 'search-focused');
    const panel = main.getByRole('region', { name: 'Filter by label' });
    const panelVis = (await panel.count()) === 1 && await panel.isVisible();
    setOb('K41-O6', panelVis, panelVis ? 'on focus a panel with visible heading "Filter by label" containing label choices appears (suggested-filter meaning)' : 'no suggestion panel visible after focus');
    if (!panelVis) throw new Error('suggested panel missing');
    await panel.getByRole('button', { name: 'Reminders' }).click(); log('click button "Reminders" inside the "Filter by label" panel (not the sidebar)');
    await page.waitForTimeout(800);
    await shot(page, 'reminders-chosen');
    const vr = await visibleOnce(rem), vm = await visibleOnce(mov);
    const rc = vr.cards === 1 ? await noteCard(rem).getByText('Reminder content', { exact: true }).isVisible() : false;
    const allCards = await main.getByRole('article').count();
    setOb('K41-O7', vr.cards === 1 && rc && vm.cards === 0, `reminder note cards ${vr.cards} (content visible ${rc}); Movie list cards ${vm.cards}; total cards shown ${allCards}`);
    const clear = page.getByRole('button', { name: 'Clear search' });
    if (await clear.count() && await clear.isVisible()) { await clear.click(); log('click button "Clear search" in search landmark'); }
    else { await sb.click(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Backspace'); await page.keyboard.press('Escape'); log('no visible clear control; emptied searchbox and pressed Escape'); }
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Notes', exact: true }).click(); log('click button "Notes" in navigation "Main navigation"');
    await page.waitForTimeout(800);
    await shot(page, 'cleared-notes');
    const v1 = await visibleOnce(rem), v2 = await visibleOnce(mov);
    const c1 = v1.cards === 1 ? await noteCard(rem).getByText('Reminder content', { exact: true }).isVisible() : false;
    const c2 = v2.cards === 1 ? await noteCard(mov).getByText('Unlabeled content', { exact: true }).isVisible() : false;
    setOb('K41-O8', v1.cards === 1 && v2.cards === 1 && c1 && c2, `reminder note cards ${v1.cards} content ${c1}; Movie list cards ${v2.cards} content ${c2}`);
  } else throw new Error('unknown scenario ' + scenario);
} catch (e) {
  crashed = String(e && e.stack || e);
  log('ERROR ' + crashed);
} finally {
  try { fs.writeFileSync(path.join(OUT, 'api-after.json'), JSON.stringify(await getApi(), null, 2)); } catch (e) { log('api-after failed ' + e); }
  if (browser) await browser.close();
  srv.kill(); log(`stopped server pid ${srv.pid}`);
  log(`page errors: ${JSON.stringify(pageErrors)}`);
  fs.writeFileSync(path.join(OUT, 'actions.log'), logLines.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, 'obligations.json'), JSON.stringify({ variant, scenario, rep: Number(rep), obligations: ob, error: crashed, pageErrors }, null, 2));
  console.log(JSON.stringify({ variant, scenario, rep, ob: Object.fromEntries(Object.entries(ob).map(([k, v]) => [k, v.holds])), error: crashed ? crashed.split('\n')[0] : null, pageErrors: pageErrors.length }));
}
