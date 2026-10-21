// Independent certifier driver for bookstack.REQ-6.4 (checklist-pilot.md scenarios 5 and 6).
// Usage: node certify.mjs <materialName> <variant> <buildDir> <scenario> <rep> <port> <outDir>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [,, material, variant, build, scenario, repS, portS, outDir] = process.argv;
const rep = Number(repS), port = Number(portS);
fs.mkdirSync(outDir, { recursive: true });
const base = `http://127.0.0.1:${port}`;

// Names read from each implementation's own screen (accessibility tree), see actions.log.
const UI = {
  'A-bookstack': { createBook: ['button', 'Create New Book'], saveBook: ['button', 'Save Book'], newPage: ['button', 'New Page'],
    titleField: 'Page title', bodyField: 'Write your page content here...', savePage: ['button', 'Save Page'],
    pageList: 'Page list', entryRole: 'button', edit: ['button', 'Edit'] },
  'B-bookstack': { createBook: ['button', 'New book'], saveBook: ['button', 'Save book'], newPage: ['button', 'New page'],
    titleField: 'Title', bodyField: 'Content', savePage: ['button', 'Save page'],
    pageList: 'Pages', entryRole: 'link', edit: ['button', 'Edit'] },
}[material];

const log = [];
const L = (s) => { log.push(`[${new Date().toISOString()}] ${s}`); };
const ob = {};
const setOb = (id, holds, reason) => { ob[id] = { holds, reason }; L(`OBLIGATION ${id}: ${holds} — ${reason}`); };
const crashes = [];

async function http(p, method = 'GET') {
  const r = await fetch(base + p, { method });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}
async function apiDump(file) {
  const d = { books: await http('/api/books'), pages: await http('/api/pages') };
  fs.writeFileSync(path.join(outDir, file), JSON.stringify(d, null, 2));
  return d;
}

// fresh server process
const srvLog = fs.openSync(path.join(outDir, 'server.log'), 'w');
const srv = spawn('node', ['server/server.mjs'], { cwd: build, env: { ...process.env, PORT: String(port), APP: 'bookstack', STATIC_DIR: path.join(build, 'app/dist') }, stdio: ['ignore', srvLog, srvLog] });
let started = false;
for (let i = 0; i < 100 && !started; i++) {
  try { const r = await fetch(base + '/__health'); if (r.ok) started = true; } catch {}
  if (!started) await new Promise(r => setTimeout(r, 100));
}
let browser;
let result = { material, variant, scenario, rep, app_started: started };
try {
  if (!started) throw new Error('server did not become healthy');
  await http('/__reset', 'POST');
  const health = await http('/__health');
  L(`server started on ${port}; POST /__reset; health=${JSON.stringify(health)}`);
  await apiDump('api-before.json');

  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  const p = await ctx.newPage();
  p.on('pageerror', e => { crashes.push(String(e)); L(`PAGEERROR ${e}`); });
  p.on('console', m => { if (m.type() === 'error') { crashes.push('console: ' + m.text()); L(`CONSOLE-ERROR ${m.text()}`); } });
  p.setDefaultTimeout(8000);
  let shot = 0;
  const snap = async (name) => { shot++; const f = `${String(shot).padStart(2, '0')}-${name}.png`; await p.screenshot({ path: path.join(outDir, f), fullPage: true }); L(`screenshot ${f}`); };
  const settle = async () => { await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(250); };

  const tag = crypto.randomBytes(3).toString('hex');
  const id = `CERT-${rep}${tag}`;
  const num = scenario === 'read_selected_page' ? '6.4.1' : '6.4.2';
  const book = { name: `Book ${num} [${id}]`, desc: `Certification book for ${num} [${id}].`, tags: 'cert, reading' };
  const pages = ['A', 'B', 'C'].map(x => ({ key: x, title: `Page ${x} ${num} [${id}]`, body: `Reading content for Page ${x} ${num}.` }));
  const target = pages[1];
  L(`inputs: book=${JSON.stringify(book)} pages=${JSON.stringify(pages)} target=${target.title}`);

  // GIVEN: logged out, Books -> create book
  await p.goto(base + '/'); await settle(); L('goto / (anonymous, fresh context)');
  await p.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Books', exact: true }).click();
  L('click link "Books" in navigation "Main" (getByRole link name=Books)'); await settle();
  await p.getByRole(UI.createBook[0], { name: UI.createBook[1], exact: true }).click();
  L(`click ${UI.createBook[0]} "${UI.createBook[1]}"`); await settle();
  await p.getByRole('textbox', { name: 'Name', exact: true }).fill(book.name); L(`type into textbox "Name": ${book.name}`);
  await p.getByRole('textbox', { name: 'Description', exact: true }).fill(book.desc); L(`type into textbox "Description": ${book.desc}`);
  await p.getByRole('textbox', { name: 'Tags', exact: true }).fill(book.tags); L(`type into textbox "Tags": ${book.tags}`);
  await p.getByRole(UI.saveBook[0], { name: UI.saveBook[1], exact: true }).click(); L(`click ${UI.saveBook[0]} "${UI.saveBook[1]}"`);
  await p.getByRole('heading', { level: 1, name: book.name, exact: true }).waitFor(); await settle();
  L('book details heading shown');

  for (const pg of pages) {
    await p.getByRole(UI.newPage[0], { name: UI.newPage[1], exact: true }).click(); L(`click ${UI.newPage[0]} "${UI.newPage[1]}"`); await settle();
    await p.getByRole('textbox', { name: UI.titleField, exact: true }).fill(pg.title); L(`type into textbox "${UI.titleField}": ${pg.title}`);
    await p.getByRole('textbox', { name: UI.bodyField, exact: true }).fill(pg.body); L(`type into textbox "${UI.bodyField}": ${pg.body}`);
    await p.getByRole(UI.savePage[0], { name: UI.savePage[1], exact: true }).click(); L(`click ${UI.savePage[0]} "${UI.savePage[1]}"`);
    await p.getByRole('heading', { level: 1, name: book.name, exact: true }).waitFor(); await settle();
    L('returned to book details heading');
  }

  // B64-P1: each page once in the book's page list
  const list = p.getByRole('region', { name: UI.pageList, exact: true });
  const counts = {};
  for (const pg of pages) counts[pg.key] = await list.getByRole(UI.entryRole, { name: pg.title, exact: true }).count();
  const apiMid = { pages: await http('/api/pages') };
  const apiCounts = Object.fromEntries(pages.map(pg => [pg.key, (Array.isArray(apiMid.pages) ? apiMid.pages : []).filter(x => x.title === pg.title).length]));
  const order = await list.getByRole(UI.entryRole).allInnerTexts();
  L(`page list region "${UI.pageList}" entries (${UI.entryRole}) in order: ${JSON.stringify(order)}`);
  setOb('B64-P1', Object.values(counts).every(c => c === 1) && Object.values(apiCounts).every(c => c === 1),
    `UI entry counts ${JSON.stringify(counts)}, API page counts ${JSON.stringify(apiCounts)}; target index ${order.indexOf(target.title)}`);
  await snap('book-page-list');

  // WHEN: open TARGET from the page list
  const entry = list.getByRole(UI.entryRole, { name: target.title, exact: true });
  await entry.click(); L(`click ${UI.entryRole} "${target.title}" inside region "${UI.pageList}"`); await settle();
  await p.waitForTimeout(300);
  const h1 = p.getByRole('heading', { level: 1 });
  const h1Texts = (await h1.allInnerTexts()).map(s => s.trim());
  L(`URL ${p.url()}; h1 headings: ${JSON.stringify(h1Texts)}`);
  setOb('B64-O1', h1Texts.length === 1 && h1Texts[0] === target.title, `level-1 heading(s) ${JSON.stringify(h1Texts)} vs target "${target.title}"`);
  const mainText = await p.locator('main').innerText();
  const bodyVisible = await p.getByText(target.body, { exact: true }).first().isVisible().catch(() => false);
  if (scenario === 'read_selected_page') {
    setOb('B64-O2', bodyVisible && mainText.includes(target.body), `target body "${target.body}" visible=${bodyVisible}`);
    const others = pages.filter(x => x !== target).map(x => ({ t: x.title, b: x.body, tIn: mainText.includes(x.title), bIn: mainText.includes(x.body) }));
    setOb('B64-O3', others.every(o => !o.tIn && !o.bIn), `other pages present in main: ${JSON.stringify(others.map(o => ({ title: o.t, titleShown: o.tIn, bodyShown: o.bIn })))}`);
  }
  await snap('page-view');

  if (scenario === 'reopen_page_editor') {
    const ed = p.getByRole(UI.edit[0], { name: UI.edit[1], exact: true });
    const nEdit = await ed.count(); L(`page view: ${nEdit} ${UI.edit[0]}(s) named "${UI.edit[1]}"`);
    await ed.first().click(); L(`click ${UI.edit[0]} "${UI.edit[1]}" on the reading page`); await settle();
    const tf = p.getByRole('textbox', { name: UI.titleField, exact: true });
    const bf = p.getByRole('textbox', { name: UI.bodyField, exact: true });
    await tf.waitFor().catch(() => {});
    await p.waitForTimeout(400);
    const tv = await tf.inputValue().catch(e => `<<${e.message.split('\n')[0]}>>`);
    const bv = await bf.inputValue().catch(e => `<<${e.message.split('\n')[0]}>>`);
    L(`URL ${p.url()}; textbox "${UI.titleField}" value=${JSON.stringify(tv)}; textbox "${UI.bodyField}" value=${JSON.stringify(bv)}`);
    setOb('B64-O4', tv === target.title, `title field value ${JSON.stringify(tv)} vs "${target.title}"`);
    setOb('B64-O5', bv === target.body, `body field value ${JSON.stringify(bv)} vs "${target.body}"`);
    const sv = p.getByRole(UI.savePage[0], { name: UI.savePage[1], exact: true });
    const svVis = await sv.first().isVisible().catch(() => false);
    setOb('B64-O6', svVis, `${UI.savePage[0]} "${UI.savePage[1]}" visible=${svVis} (not clicked)`);
    await snap('editor');
  }
  result.ok = true;
} catch (e) {
  L(`ERROR ${e.stack || e}`);
  result.error = String(e.message || e).split('\n')[0];
} finally {
  try { await apiDump('api-after.json'); } catch {}
  if (browser) await browser.close();
  srv.kill('SIGTERM');
  await new Promise(r => setTimeout(r, 300));
  try { srv.kill('SIGKILL'); } catch {}
  L('browser closed; server stopped');
}
result.obligations = ob; result.crashes = crashes;
fs.writeFileSync(path.join(outDir, 'obligations.json'), JSON.stringify(ob, null, 2));
fs.writeFileSync(path.join(outDir, 'actions.log'), log.join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ material, variant, scenario, rep, err: result.error, crashes: crashes.length, ob: Object.fromEntries(Object.entries(ob).map(([k, v]) => [k, v.holds])) }));
process.exit(0);
