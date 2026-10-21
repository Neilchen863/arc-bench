// Independent certification driver for keep REQ-2.2 / REQ-4.1 (written from checklist-pilot.md).
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import crypto from 'crypto';

const [material, variant, build, scenario, rep, port, outRoot] = process.argv.slice(2);
const CFG = {
  'Cpilot-keep': { entry: 'Take a note…', title: 'Title', content: 'Note text', close: 'Close', labelBtn: 'Add label', chooser: 'Label note', done: 'Done', search: 'Search notes', clear: 'Clear search', nav: 'Main navigation', notes: 'Notes', panel: 'Filter by label', reminders: 'Reminders' },
  'Dpilot-keep': { entry: 'New note', title: 'Title', content: 'Note text', close: 'Close', labelBtn: 'Change labels', chooser: 'Note labels', done: 'Done', search: 'Search notes', clear: 'Clear search', nav: 'Sidebar', notes: 'Notes', panel: 'Filter by label', reminders: 'Reminders' },
}[material];
const dir = `${outRoot}/${material}/${variant}/${scenario}/rep${rep}`;
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const log = []; const L = (s) => { log.push(s); };
const obl = {}; const O = (id, holds, reason) => { if (id in obl && obl[id].holds === false) return; obl[id] = { holds: !!holds, reason }; };
const base = `http://127.0.0.1:${port}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const api = async (c) => (await fetch(`${base}/api/${c}`)).json();
const hex = () => crypto.randomBytes(3).toString('hex'); // 0-9a-f only: cannot introduce "st"

const srvLog = fs.openSync(`${dir}/server.log`, 'w');
const srv = spawn('node', ['server/server.mjs'], { cwd: build, env: { ...process.env, PORT: port, APP: 'keep', STATIC_DIR: `${build}/app/dist` }, stdio: ['ignore', srvLog, srvLog] });
L(`server pid ${srv.pid} port ${port} build ${build}`);
let healthy = false;
for (let i = 0; i < 150; i++) { try { const r = await fetch(base + '/__health'); if (r.ok) { healthy = true; break; } } catch {} await sleep(100); }
const result = { material, variant, scenario, rep: +rep, started: healthy, errors: [], pageErrors: [] };
let browser;
try {
  if (!healthy) throw new Error('server not healthy');
  await fetch(base + '/__reset', { method: 'POST' });
  fs.writeFileSync(`${dir}/api-before.json`, JSON.stringify({ notes: await api('notes'), labels: await api('labels') }, null, 1));
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  const page = await ctx.newPage();
  page.on('pageerror', e => result.pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') result.pageErrors.push('console: ' + m.text()); });
  let shot = 0; const snap = async (name) => { await page.screenshot({ path: `${dir}/${String(++shot).padStart(2, '0')}-${name}.png` }); };
  await page.goto(base + '/'); await page.waitForLoadState('networkidle'); await sleep(400);
  L(`open ${base}/`);

  const editor = () => page.getByRole('dialog').filter({ has: page.getByRole('textbox', { name: CFG.title, exact: true }) });
  const noteCards = (t) => page.getByRole('main').getByRole('article', { name: t, exact: true });
  const visibleCount = async (loc) => { let n = 0; for (const el of await loc.all()) if (await el.isVisible()) n++; return n; };
  const s0 = {};
  async function createNote(title, lines, withReminders = false) {
    const entry = page.getByRole('button', { name: CFG.entry, exact: true });
    await entry.click(); L(`click button "${CFG.entry}" (creation entry, found by role=button + visible text in main)`);
    await editor().waitFor({ state: 'visible', timeout: 5000 });
    s0.dialogNoteEditor = await page.getByRole('dialog', { name: 'Note editor', exact: true }).count();
    s0.textboxTitle = await editor().getByRole('textbox', { name: 'Title', exact: true }).count();
    s0.textboxContent = await editor().getByRole('textbox', { name: 'Content', exact: true }).count();
    s0.buttonClose = await editor().getByRole('button', { name: 'Close', exact: true }).count();
    s0.saveLikeButtonsInEditor = await editor().getByRole('button', { name: /save/i }).count();
    await editor().getByRole('textbox', { name: CFG.title, exact: true }).click();
    await page.keyboard.type(title); L(`click textbox "${CFG.title}" in editor dialog; type "${title}"`);
    await editor().getByRole('textbox', { name: CFG.content, exact: true }).click();
    L(`click textbox "${CFG.content}" in editor dialog`);
    for (let i = 0; i < lines.length; i++) { if (i) { await page.keyboard.press('Enter'); L('press Enter'); } await page.keyboard.type(lines[i]); L(`type "${lines[i]}"`); }
    if (withReminders) {
      await editor().getByRole('button', { name: CFG.labelBtn, exact: true }).click(); L(`click button "${CFG.labelBtn}" in editor (label chooser)`);
      const ch = page.getByRole('dialog', { name: CFG.chooser, exact: true });
      await ch.waitFor({ state: 'visible', timeout: 5000 });
      await ch.getByRole('checkbox', { name: CFG.reminders, exact: true }).check(); L(`check checkbox "${CFG.reminders}" in dialog "${CFG.chooser}"`);
      await ch.getByRole('button', { name: CFG.done, exact: true }).click(); L(`click button "${CFG.done}" in dialog "${CFG.chooser}"`);
      await ch.waitFor({ state: 'hidden', timeout: 5000 });
    }
    await editor().getByRole('button', { name: CFG.close, exact: true }).click(); L(`click button "${CFG.close}" in editor dialog (close action; no save action used)`);
    await sleep(700);
  }
  async function apiActiveCount(title, wait = 3000) {
    let n = 0; const t0 = Date.now();
    do { n = (await api('notes')).filter(x => x.title === title && !x.trashed && !x.archived).length; if (n >= 1) break; await sleep(200); } while (Date.now() - t0 < wait);
    return n;
  }
  async function cardShows(title, text) {
    const c = noteCards(title).first();
    if (!(await c.count())) return false;
    return await c.getByText(text, { exact: false }).first().isVisible().catch(() => false);
  }
  async function clearAndNotes() {
    await page.getByRole('button', { name: CFG.clear, exact: true }).click(); L(`click button "${CFG.clear}" in search bar`);
    await sleep(300);
    const sv = await page.getByRole('searchbox', { name: CFG.search }).inputValue();
    await page.getByRole('navigation', { name: CFG.nav }).getByRole('button', { name: CFG.notes, exact: true }).click(); L(`click button "${CFG.notes}" in navigation "${CFG.nav}"`);
    await sleep(500);
    return sv;
  }

  if (scenario === 'autosave_on_close' || scenario === 'persist_after_reload') {
    s0.buttonTakeANote = await page.getByRole('button', { name: 'Take a note', exact: true }).count();
    const auto = scenario === 'autosave_on_close';
    const title = auto ? `New note [CERT-${hex()}]` : `Persistent note [CERT-${hex()}]`;
    const lines = auto ? ['First line', 'Second line'] : ['Saved personal content'];
    await createNote(title, lines);
    const edVisible = await editor().isVisible().catch(() => false);
    const anyDialog = await visibleCount(page.getByRole('dialog'));
    O('K22-O1', !edVisible && anyDialog === 0, `editor visible=${edVisible}, visible dialogs=${anyDialog}`);
    await snap('after-close');
    const ui = await visibleCount(noteCards(title)); const apiN = await apiActiveCount(title);
    O('K22-O2', ui === 1 && apiN === 1, `visible note cards with title=${ui}, API active notes with title=${apiN}`);
    s0.regionByTitle = await page.getByRole('region', { name: title, exact: true }).count();
    if (auto) {
      const titleVis = ui >= 1 && await noteCards(title).first().getByText(title, { exact: true }).first().isVisible().catch(() => false);
      O('K22-O3', titleVis, `title text visible inside the note card: ${titleVis}`);
      let geo = null;
      if (ui >= 1) {
        await noteCards(title).first().screenshot({ path: `${dir}/${String(++shot).padStart(2, '0')}-note-card.png` });
        geo = await noteCards(title).first().evaluate((el) => {
          const find = (s) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf(s); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + s.length); const b = r.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, h: b.height }; } } return null; };
          return { a: find('First line'), b: find('Second line') };
        });
      }
      const ok4 = !!(geo && geo.a && geo.b && geo.a.h > 0 && geo.b.h > 0 && geo.b.top >= geo.a.bottom - 2);
      O('K22-O4', ok4, `line boxes: ${JSON.stringify(geo)} (second line must start below first)`);
      O('K22-O5', true, `only the editor's "${CFG.close}" button was used; save-like buttons present in editor: ${s0.saveLikeButtonsInEditor}`);
    } else {
      await page.reload(); await page.waitForLoadState('networkidle'); await sleep(700); L('reload page');
      const ui2 = await visibleCount(noteCards(title)); const shows = ui2 >= 1 && await cardShows(title, 'Saved personal content');
      O('K22-O6', ui2 === 1 && shows, `after reload visible note cards with title=${ui2}, content visible=${shows}`);
      await snap('after-reload');
    }
  } else if (scenario === 'search_title_content_highlight') {
    const h = hex();
    const N = [[`Study schedule [${h}]`, 'Math on Monday'], [`Reading plan [${h}]`, 'Read a story'], [`Ocean memo [${h}]`, 'Calm blue waves']];
    for (const [t, c] of N) await createNote(t, [c]);
    const created = []; for (const [t] of N) created.push(await visibleCount(noteCards(t)));
    L(`precondition: created note cards visible = ${created.join(',')}`);
    const sb = page.getByRole('searchbox', { name: CFG.search, exact: true });
    await sb.click(); await page.keyboard.type('st'); L(`click searchbox "${CFG.search}"; type "st"`);
    await sleep(700);
    s0.searchboxSearch = await page.getByRole('searchbox', { name: 'Search', exact: true }).count();
    s0.regionHighlightSt = await page.getByRole('region', { name: 'Highlight st', exact: true }).count();
    const c = []; for (const [t] of N) c.push(await visibleCount(noteCards(t)));
    O('K41-O1', c[0] === 1, `Study schedule visible cards=${c[0]}`);
    O('K41-O2', c[1] === 1, `Reading plan visible cards=${c[1]}`);
    O('K41-O3', c[2] === 0 && !(await page.getByText(N[2][0]).first().isVisible().catch(() => false)), `Ocean memo visible cards=${c[2]}`);
    await snap('search-st');
    const hl = [];
    for (const [i, where] of [[0, 'title'], [1, 'content']]) {
      if (!c[i]) { hl.push({ note: N[i][0], ok: false, why: 'note not shown' }); continue; }
      const card = noteCards(N[i][0]).first();
      await card.screenshot({ path: `${dir}/${String(++shot).padStart(2, '0')}-highlight-${i}.png` });
      hl.push({ note: N[i][0], where, ...(await card.evaluate((el, args) => {
        const [titleText, contentText] = args;
        const parseRGB = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
        const effBg = (e) => { while (e) { const c = parseRGB(getComputedStyle(e).backgroundColor); if (c && c.a > 0) return c; e = e.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; };
        const vhl = (e) => {
          const cs = getComputedStyle(e), ps = getComputedStyle(e.parentElement);
          const bg = parseRGB(cs.backgroundColor), pbg = effBg(e.parentElement);
          const bgDiff = !!(bg && bg.a > 0 && Math.max(Math.abs(bg.r - pbg.r), Math.abs(bg.g - pbg.g), Math.abs(bg.b - pbg.b)) >= 30);
          const fw = parseInt(cs.fontWeight) >= 600 && parseInt(ps.fontWeight) <= 500;
          const td = cs.textDecorationLine !== ps.textDecorationLine;
          return { bgDiff, fw, td, bg: cs.backgroundColor, parentBg: `rgb(${pbg.r},${pbg.g},${pbg.b})`, w: cs.fontWeight, pw: ps.fontWeight, pass: bgDiff || fw || td };
        };
        // Candidate highlight fragments: elements whose own whole text is st (case-insensitive) and that pass V-HL.
        const all = [...el.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.length > 0 && e.getBoundingClientRect().width > 0);
        const styled = all.map(e => ({ e, t: e.textContent, v: vhl(e) })).filter(x => x.v.pass);
        const cand = styled.filter(x => x.t.trim().toLowerCase() === 'st');
        const others = styled.filter(x => x.t.trim().toLowerCase() !== 'st' && x.e.tagName === (cand[0] && cand[0].e.tagName) && x.e.className === (cand[0] && cand[0].e.className));
        const inTitle = cand.filter(x => x.e.closest('h1,h2,h3,h4,h5,h6'));
        const inBody = cand.filter(x => !x.e.closest('h1,h2,h3,h4,h5,h6'));
        return { candidates: cand.map(x => ({ text: x.t, tag: x.e.tagName, v: x.v })), sameKindNonSt: others.map(x => x.t), inTitle: inTitle.map(x => x.t), inBody: inBody.map(x => x.t) };
      }, [N[i][0], N[i][1]])) });
    }
    const ok4 = hl.length === 2 && hl[0].candidates && hl[0].inTitle.includes('St') && hl[1].candidates && hl[1].inBody.includes('st') && hl.every(x => x.sameKindNonSt && x.sameKindNonSt.length === 0);
    O('K41-O4', ok4, `highlights: ${JSON.stringify(hl.map(x => ({ note: x.note.split(' [')[0], inTitle: x.inTitle, inBody: x.inBody, nonSt: x.sameKindNonSt, v: x.candidates && x.candidates[0] && x.candidates[0].v, why: x.why })))}`);
    fs.writeFileSync(`${dir}/highlight-evidence.json`, JSON.stringify(hl, null, 1));
    const sv = await clearAndNotes();
    const r = []; for (const [t, ct] of N) r.push({ n: await visibleCount(noteCards(t)), content: await cardShows(t, ct) });
    O('K41-O5', sv === '' && r.every(x => x.n === 1 && x.content), `search value after clear="${sv}", per note [count,contentVisible]=${JSON.stringify(r)}`);
    await snap('restored');
  } else if (scenario === 'suggested_label_filter') {
    const h = hex();
    const A = [`Call dentist existing [${h}]`, 'Reminder content'], B = [`Movie list [${h}]`, 'Unlabeled content'];
    await createNote(A[0], [A[1]], true);
    await createNote(B[0], [B[1]]);
    const apiNotes = await api('notes'); const an = apiNotes.find(x => x.title === A[0]);
    const chip = await cardShows(A[0], CFG.reminders);
    O('K41-P1', !!an && (an.labels || []).includes('reminders') && chip, `API note labels=${JSON.stringify(an && an.labels)}, Reminders shown on card=${chip}`);
    await snap('created');
    await page.getByRole('searchbox', { name: CFG.search, exact: true }).click(); L(`click (focus) searchbox "${CFG.search}"`);
    await sleep(500);
    const panel = page.getByRole('region', { name: CFG.panel, exact: true });
    const pv = await panel.isVisible().catch(() => false);
    s0.regionSuggestedFilters = await page.getByRole('region', { name: 'Suggested filters', exact: true }).count();
    s0.searchboxSearch = await page.getByRole('searchbox', { name: 'Search', exact: true }).count();
    O('K41-O6', pv, `suggestion panel (region "${CFG.panel}", identified by its heading) visible on focus: ${pv}`);
    await snap('focus-panel');
    s0.buttonRemindersInSuggested = pv ? await panel.getByRole('button', { name: 'Reminders', exact: true }).count() : 0;
    if (pv) { await panel.getByRole('button', { name: CFG.reminders, exact: true }).click(); L(`click button "${CFG.reminders}" in region "${CFG.panel}"`); }
    await sleep(600);
    const a = await visibleCount(noteCards(A[0])), ac = await cardShows(A[0], A[1]), b = await visibleCount(noteCards(B[0]));
    O('K41-O7', pv && a === 1 && ac && b === 0, `reminder note cards=${a} (content visible=${ac}), unlabeled note cards=${b}`);
    await snap('reminders-filter');
    const sv = await clearAndNotes();
    const r = []; for (const [t, ct] of [A, B]) r.push({ n: await visibleCount(noteCards(t)), content: await cardShows(t, ct) });
    O('K41-O8', sv === '' && r.every(x => x.n === 1 && x.content), `search value after clear="${sv}", [count,contentVisible]=${JSON.stringify(r)}`);
    await snap('restored');
  }
  fs.writeFileSync(`${dir}/s0.json`, JSON.stringify(s0, null, 1));
  fs.writeFileSync(`${dir}/api-after.json`, JSON.stringify({ notes: await api('notes'), labels: await api('labels') }, null, 1));
} catch (e) {
  result.errors.push(String(e && e.stack || e)); L('ERROR ' + String(e));
  try { fs.writeFileSync(`${dir}/api-after.json`, JSON.stringify({ notes: await api('notes'), labels: await api('labels') }, null, 1)); } catch {}
} finally {
  if (browser) await browser.close();
  srv.kill('SIGTERM'); L(`stopped server pid ${srv.pid}`);
  await sleep(300);
  fs.writeFileSync(`${dir}/actions.log`, log.join('\n') + '\n');
  fs.writeFileSync(`${dir}/obligations.json`, JSON.stringify(obl, null, 1));
  result.obligations = obl;
  fs.writeFileSync(`${dir}/result.json`, JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ material, variant, scenario, rep, errors: result.errors.map(x => x.slice(0, 200)), pageErrors: result.pageErrors.slice(0, 3), obl: Object.fromEntries(Object.entries(obl).map(([k, v]) => [k, v.holds])) }));
}
