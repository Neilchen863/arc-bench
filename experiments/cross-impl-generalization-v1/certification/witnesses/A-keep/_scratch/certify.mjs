// Independent certification driver for A-keep (REQ-2.2, REQ-4.1). Written from checklist-pilot.md.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const [,, build, variant, scenario, rep, port, outRoot] = process.argv;
const out = path.join(outRoot, variant, scenario, `rep${rep}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const log = [];
const act = (s) => { log.push(`${new Date().toISOString()} ${s}`); };
const base = `http://127.0.0.1:${port}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const suffix = crypto.randomBytes(3).toString('hex'); // hex only: cannot contain "st"
let shotN = 0;
const ob = {};
const setOb = (id, holds, reason) => { ob[id] = { holds: !!holds, reason }; act(`OBLIGATION ${id}: ${holds} — ${reason}`); };

async function getJSON(p) { const r = await fetch(base + p); return r.json(); }
async function apiDump() { return { notes: await getJSON('/api/notes'), labels: await getJSON('/api/labels') }; }

// ---- server ----
const srvLog = fs.openSync(path.join(out, 'server.log'), 'w');
const srv = spawn(process.execPath, [path.join(build, 'server/server.mjs')], { cwd: build, env: { ...process.env, PORT: port, APP: 'keep', STATIC_DIR: path.join(build, 'app/dist') }, stdio: ['ignore', srvLog, srvLog] });
act(`server started pid=${srv.pid} port=${port} build=${build}`);
let browser;
const pageErrors = [];
try {
  let ok = false;
  for (let i = 0; i < 100 && !ok; i++) { try { const r = await fetch(base + '/__health'); ok = r.ok; } catch { await sleep(100); } }
  if (!ok) throw new Error('server not healthy');
  await fetch(base + '/__reset', { method: 'POST' }); act('POST /__reset');
  const health = await getJSON('/__health'); act(`GET /__health ${JSON.stringify(health)}`);
  fs.writeFileSync(path.join(out, 'api-before.json'), JSON.stringify(await apiDump(), null, 2));

  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  const page = await ctx.newPage();
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()); });
  const shot = async (label) => { shotN++; const f = `${String(shotN).padStart(2, '0')}-${label}.png`; await page.screenshot({ path: path.join(out, f), fullPage: true }); act(`screenshot ${f}`); };

  await page.goto(base + '/'); act('goto /');
  await page.waitForLoadState('networkidle');

  // ---- helpers that read the screen ----
  const main = page.getByRole('main');
  // visible minimal elements in main whose full text equals title
  const titleCount = (title) => page.evaluate((title) => {
    const m = document.querySelector('main') || document.body;
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[role=dialog]'); };
    const all = [...m.querySelectorAll('*')].filter(e => e.textContent.trim() === title && vis(e));
    return all.filter(e => ![...e.querySelectorAll('*')].some(c => c.textContent.trim() === title)).length;
  }, title);
  // note card info: container of the title (nearest section/article/li/region ancestor)
  const card = (title) => page.evaluate((title) => {
    const m = document.querySelector('main') || document.body;
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const t = [...m.querySelectorAll('*')].filter(e => e.textContent.trim() === title && vis(e) && ![...e.querySelectorAll('*')].some(c => c.textContent.trim() === title));
    if (!t.length) return null;
    const c = t[0].closest('section,article,li,[role=region],[role=article],[role=listitem]');
    return c ? { text: c.innerText, tag: c.tagName, role: c.getAttribute('role'), name: c.getAttribute('aria-label') || (c.getAttribute('aria-labelledby') && document.getElementById(c.getAttribute('aria-labelledby'))?.textContent) } : null;
  }, title);
  // y positions of substrings inside card (distinct visual lines check)
  const linePositions = (title, a, b) => page.evaluate(([title, a, bb]) => {
    const m = document.querySelector('main');
    const t = [...m.querySelectorAll('*')].filter(e => e.textContent.trim() === title && ![...e.querySelectorAll('*')].some(c => c.textContent.trim() === title));
    if (!t.length) return null;
    const c = t[0].closest('section,article,li,[role=region]');
    const find = (s) => { const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.data.indexOf(s); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + s.length); const rr = r.getBoundingClientRect(); return { top: rr.top, bottom: rr.bottom, left: rr.left, h: rr.height }; } } return null; };
    return { a: find(a), b: find(bb) };
  }, [title, a, b]);
  const editorOpen = async () => (await page.getByRole('dialog').filter({ visible: true }).count()) > 0;

  async function createNote(title, content, { reminders = false } = {}) {
    const take = page.getByRole('button', { name: 'Take a note' });
    await take.click(); act('click button "Take a note" (found by role=button, visible label in main)');
    const dlg = page.getByRole('dialog', { name: 'Note editor' });
    await dlg.waitFor(); act('dialog "Note editor" visible');
    await dlg.getByRole('textbox', { name: 'Title' }).click();
    await page.keyboard.type(title); act(`typed into textbox "Title" (by label): ${JSON.stringify(title)}`);
    await dlg.getByRole('textbox', { name: 'Content' }).click();
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) { if (i) { await page.keyboard.press('Enter'); act('pressed Enter in Content'); } await page.keyboard.type(lines[i]); act(`typed into textbox "Content" (by label): ${JSON.stringify(lines[i])}`); }
    if (reminders) {
      await dlg.getByRole('button', { name: 'Change labels' }).click(); act('click button "Change labels" in Note editor');
      const ld = page.getByRole('dialog', { name: 'Note labels' }); await ld.waitFor();
      await ld.getByRole('checkbox', { name: 'Reminders' }).check(); act('checked checkbox "Reminders" in dialog "Note labels"');
      await ld.getByRole('button', { name: 'Done' }).click(); act('click button "Done" in dialog "Note labels"');
    }
    const btns = await dlg.getByRole('button').allInnerTexts();
    const names = await dlg.getByRole('button').evaluateAll(es => es.map(e => e.getAttribute('aria-label') || e.textContent.trim()));
    act(`editor buttons present: ${JSON.stringify(names)}`);
    await dlg.getByRole('button', { name: 'Close', exact: true }).click(); act('click button "Close" in Note editor (no save-like control used)');
    await page.waitForTimeout(800);
    return names;
  }

  if (scenario === 'autosave_on_close' || scenario === 'persist_after_reload') {
    const auto = scenario === 'autosave_on_close';
    const title = auto ? `New note ${suffix}` : `Persistent note ${suffix}`;
    const content = auto ? 'First line\nSecond line' : 'Saved personal content';
    const names = await createNote(title, content);
    const open = await editorOpen();
    setOb('K22-O1', !open, open ? 'a dialog is still visible after Close' : 'no dialog visible after Close');
    await shot('after-close');
    const n = await titleCount(title);
    const api = (await getJSON('/api/notes')).filter(x => x.title === title && !x.trashed && !x.archived);
    setOb('K22-O2', n === 1 && api.length === 1, `visible notes with title=${n}, active API notes with title=${api.length}`);
    if (auto) {
      const c = await card(title);
      setOb('K22-O3', n >= 1 && !!c, c ? `title visible in note card (${c.tag} role=${c.role} name=${c.name})` : 'title not visible in any note');
      const pos = await linePositions(title, 'First line', 'Second line');
      const okLines = !!(pos && pos.a && pos.b && pos.b.top >= pos.a.bottom - 1 && pos.a.h > 0 && pos.b.h > 0);
      setOb('K22-O4', okLines, pos && pos.a && pos.b ? `First line y=[${pos.a.top.toFixed(0)},${pos.a.bottom.toFixed(0)}], Second line y=[${pos.b.top.toFixed(0)},${pos.b.bottom.toFixed(0)}] in card text ${JSON.stringify(c && c.text)}` : `line text not found in card: ${JSON.stringify(pos)} card=${JSON.stringify(c)}`);
      const saveLike = names.filter(x => /save|submit|create|add|ok/i.test(x));
      setOb('K22-O5', true, `only Close was clicked to finish; save-like controls offered by the editor: ${JSON.stringify(saveLike)}`);
      await shot('then-autosave');
    } else {
      await page.reload(); act('page reload'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(500);
      const n2 = await titleCount(title);
      const c = await card(title);
      const ok = n2 === 1 && !!c && c.text.includes('Saved personal content');
      setOb('K22-O6', ok, `after reload visible notes with title=${n2}; card text=${JSON.stringify(c && c.text)}`);
      await shot('then-after-reload');
    }
  } else if (scenario === 'search_title_content_highlight') {
    const notes = [[`Study schedule ${suffix}`, 'Math on Monday'], [`Reading plan ${suffix}`, 'Read a story'], [`Ocean memo ${suffix}`, 'Calm blue waves']];
    for (const [t, c] of notes) await createNote(t, c);
    const search = page.getByRole('searchbox', { name: 'Search' });
    await search.click(); act('click searchbox "Search" in banner');
    await page.keyboard.type('st'); act('typed "st" into Search');
    await page.waitForTimeout(600);
    const n1 = await titleCount(notes[0][0]), n2 = await titleCount(notes[1][0]), n3 = await page.getByText(`Ocean memo ${suffix}`).filter({ visible: true }).count();
    // titles split by highlight elements still produce full textContent on the heading
    setOb('K41-O1', n1 === 1, `Study schedule visible count=${n1}`);
    setOb('K41-O2', n2 === 1, `Reading plan visible count=${n2}`);
    setOb('K41-O3', n3 === 0 && (await titleCount(notes[2][0])) === 0, `Ocean memo visible count=${n3}`);
    const hl = await page.evaluate((titles) => {
      const m = document.querySelector('main');
      const parseRGB = (s) => { const x = s.match(/[\d.]+/g); return x ? x.map(Number) : [0, 0, 0, 0]; };
      const effBg = (e) => { for (let x = e; x; x = x.parentElement) { const c = parseRGB(getComputedStyle(x).backgroundColor); if ((c[3] ?? 1) > 0) return c; } return [255, 255, 255, 1]; };
      const distinguished = (e) => {
        const p = e.parentElement; const ce = getComputedStyle(e), cp = getComputedStyle(p);
        const be = parseRGB(ce.backgroundColor), bp = effBg(p);
        const bgDiff = (be[3] ?? 1) > 0 && [0, 1, 2].some(i => Math.abs(be[i] - bp[i]) >= 30);
        const fw = Number(ce.fontWeight) >= 600 && Number(cp.fontWeight) <= 500;
        const td = ce.textDecorationLine !== cp.textDecorationLine && ce.textDecorationLine !== 'none';
        return { any: bgDiff || fw || td, bgDiff, fw, td, bg: ce.backgroundColor, parentBg: `rgb(${bp.slice(0, 3)})` };
      };
      const res = {};
      for (const t of titles) {
        const te = [...m.querySelectorAll('*')].filter(e => e.textContent.trim() === t && ![...e.querySelectorAll('*')].some(c => c.textContent.trim() === t));
        if (!te.length) { res[t] = null; continue; }
        const card = te[0].closest('section,article,li,[role=region]') ;
        // the card could itself be a region named Highlight; climb to note container
        let c = card; while (c && /^Highlight/.test(c.getAttribute('aria-label') || '')) c = c.parentElement.closest('section,article,li,[role=region]');
        const frags = [];
        for (const e of c.querySelectorAll('*')) {
          if (!/st/i.test(e.textContent)) continue;
          const d = distinguished(e);
          if (!d.any) continue;
          // minimal: no descendant that is also distinguished & contains st
          frags.push({ el: e, text: e.textContent, tag: e.tagName, role: e.getAttribute('role'), name: e.getAttribute('aria-label'), ...d });
        }
        const minimal = frags.filter(f => !frags.some(g => g.el !== f.el && f.el.contains(g.el)));
        res[t] = minimal.map(({ el, ...r }) => r);
      }
      return res;
    }, [notes[0][0], notes[1][0]]);
    act(`highlight inspection: ${JSON.stringify(hl)}`);
    const okHL = [notes[0][0], notes[1][0]].every(t => hl[t] && hl[t].length >= 1 && hl[t].every(f => f.text.toLowerCase() === 'st'));
    setOb('K41-O4', okHL, `distinguished fragments containing "st" per match: ${[notes[0][0], notes[1][0]].map(t => `${t.split(' ')[0]}=${JSON.stringify((hl[t] || []).map(f => f.text + (f.bgDiff ? '(bg ' + f.bg + ' vs ' + f.parentBg + ')' : '')))}`).join('; ')}`);
    await shot('then-search-st');
    // clear search like a user: select all + delete
    await search.click(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Backspace'); act('cleared Search by select-all + Backspace');
    await page.getByRole('navigation').getByRole('button', { name: 'Notes', exact: true }).click(); act('click button "Notes" in navigation "Sidebar"');
    await page.waitForTimeout(500);
    const parts = [];
    let all = true;
    for (const [t, c] of notes) { const k = await titleCount(t); const cd = await card(t); const ok = k === 1 && cd && cd.text.includes(c); all = all && ok; parts.push(`${t.split(' ')[0]} n=${k} content=${!!(cd && cd.text.includes(c))}`); }
    setOb('K41-O5', all, parts.join('; '));
    await shot('then-cleared');
  } else if (scenario === 'suggested_label_filter') {
    const rem = [`Call dentist existing ${suffix}`, 'Reminder content'], mov = [`Movie list ${suffix}`, 'Unlabeled content'];
    await createNote(rem[0], rem[1], { reminders: true });
    await createNote(mov[0], mov[1]);
    const apiN = (await getJSON('/api/notes')).find(x => x.title === rem[0]);
    const labels = await getJSON('/api/labels');
    const remId = (labels.find(l => l.name === 'Reminders') || {}).id;
    const p1 = !!(apiN && (apiN.labels || []).includes(remId));
    setOb('K41-P1', p1, `API note labels=${JSON.stringify(apiN && apiN.labels)}, Reminders id=${remId}`);
    const search = page.getByRole('searchbox', { name: 'Search' });
    await search.focus(); act('focused searchbox "Search" (keyboard focus)');
    await page.waitForTimeout(400);
    const panelByName = page.getByRole('region', { name: 'Suggested filters' }).filter({ visible: true });
    const panelByText = page.getByText('Suggested filters', { exact: false }).filter({ visible: true });
    const pc = await panelByName.count(), tc = await panelByText.count();
    setOb('K41-O6', pc + tc > 0, `visible region named Suggested filters=${pc}, visible text Suggested filters=${tc}`);
    await shot('then-suggested-panel');
    let o7 = false, why = 'panel absent';
    if (pc > 0) {
      await panelByName.first().getByRole('button', { name: 'Reminders' }).click(); act('click button "Reminders" inside region "Suggested filters"');
      await page.waitForTimeout(500);
      const nr = await titleCount(rem[0]), cr = await card(rem[0]), nm = await titleCount(mov[0]);
      o7 = nr === 1 && cr && cr.text.includes(rem[1]) && nm === 0;
      why = `reminder note n=${nr} content=${!!(cr && cr.text.includes(rem[1]))}; Movie list n=${nm}`;
    }
    setOb('K41-O7', o7, why);
    await shot('then-reminders-filter');
    // clear: use the visible clear control if present, else empty the box
    const clear = page.getByRole('button', { name: /clear search/i }).filter({ visible: true });
    if (await clear.count()) { await clear.first().click(); act('click button "Clear search" in banner'); }
    else { await search.click(); await page.keyboard.press('ControlOrMeta+a'); await page.keyboard.press('Backspace'); act('cleared Search by keyboard'); }
    await page.getByRole('navigation').getByRole('button', { name: 'Notes', exact: true }).click(); act('click button "Notes" in navigation "Sidebar"');
    await page.waitForTimeout(500);
    const parts = []; let all = true;
    for (const [t, c] of [rem, mov]) { const k = await titleCount(t); const cd = await card(t); const ok = k === 1 && cd && cd.text.includes(c); all = all && ok; parts.push(`${t.split(' ')[0]} n=${k} content=${!!(cd && cd.text.includes(c))}`); }
    setOb('K41-O8', all, parts.join('; '));
    await shot('then-cleared');
  }
  fs.writeFileSync(path.join(out, 'api-after.json'), JSON.stringify(await apiDump(), null, 2));
} catch (e) {
  act('ERROR ' + (e.stack || e));
  ob._error = { holds: false, reason: String(e).slice(0, 300) };
} finally {
  if (pageErrors.length) act('PAGE ERRORS: ' + JSON.stringify(pageErrors));
  ob._page_errors = pageErrors;
  if (browser) await browser.close();
  srv.kill('SIGTERM'); act(`server pid=${srv.pid} stopped`);
  fs.writeFileSync(path.join(out, 'obligations.json'), JSON.stringify(ob, null, 2));
  fs.writeFileSync(path.join(out, 'actions.log'), log.join('\n') + '\n');
  console.log(JSON.stringify({ variant, scenario, rep, ob: Object.fromEntries(Object.entries(ob).filter(([k]) => !k.startsWith('_page')).map(([k, v]) => [k, v.holds])), errs: pageErrors.length }));
}
