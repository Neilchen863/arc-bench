// Independent certifier script for bookstack REQ-6.4 (sealed pilot materials). Usage: node certify.mjs <material> <variant> <scenario> <rep> <port>
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const EXP = '/Users/chenjiahao/Desktop/research/FYP/arc-bench/experiments/cross-impl-generalization-v1';
const [material, variant, scenario, rep, port] = process.argv.slice(2);
const build = fs.readdirSync(path.join(EXP, 'builds')).filter(d => d.startsWith(`${material}--${variant}--`) && !d.endsWith('.tmp')).map(d => path.join(EXP, 'builds', d))[0];
const out = path.join(EXP, 'certification/witnesses', material, variant, scenario, `rep${rep}`);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const base = `http://127.0.0.1:${port}`;
const logLines = []; const log = (s) => { logLines.push(s); };
const obl = {}; const set = (id, holds, reason) => { obl[id] = { holds, reason }; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const getJSON = async (u, m = 'GET') => { const r = await fetch(base + u, { method: m }); const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const srvLog = fs.openSync(path.join(out, 'server.log'), 'w');
const srv = spawn(process.execPath, ['server/server.mjs'], { cwd: build, env: { ...process.env, PORT: port, APP: 'bookstack', STATIC_DIR: path.join(build, 'app/dist') }, stdio: ['ignore', srvLog, srvLog] });
setTimeout(() => { try { srv.kill('SIGKILL'); } catch {} ; console.log('WATCHDOG'); process.exit(3); }, 120000).unref?.();
let browser; let shot = 0; let exitCode = 0;
const tag = `${material[0]}${variant.replace(/\W/g, '')}${scenario === 'read_selected_page' ? 'r' : 'e'}${rep}`;
const num = scenario === 'read_selected_page' ? '6.4.1' : '6.4.2';
try {
  let ok = false; for (let i = 0; i < 100 && !ok; i++) { try { await getJSON('/__health'); ok = true; } catch { await sleep(100); } }
  if (!ok) throw new Error('server not healthy');
  await getJSON('/__reset', 'POST'); const health = await getJSON('/__health'); log(`server pid=${srv.pid} build=${path.basename(build)} health=${JSON.stringify(health)}`);
  const apiDump = async () => ({ books: await getJSON('/api/books'), pages: await getJSON('/api/pages') });
  fs.writeFileSync(path.join(out, 'api-before.json'), JSON.stringify(await apiDump(), null, 2));
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', timezoneId: 'UTC' });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  const snap = async (name) => { shot++; const f = `${String(shot).padStart(2, '0')}-${name}`; await p.screenshot({ path: path.join(out, f + '.png'), fullPage: true }); fs.writeFileSync(path.join(out, f + '.aria.txt'), await p.locator('body').ariaSnapshot()); };
  const main = p.getByRole('main');
  const settle = async () => { await p.waitForLoadState('networkidle').catch(() => {}); await sleep(300); };
  // ---- setup (logged out, UI only)
  await p.goto(base + '/'); await settle(); log('goto / (fresh anonymous context)');
  await p.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Books', exact: true }).click(); await settle(); log('click link "Books" in navigation "Main" (role=link, exact visible name)');
  await main.getByRole('button', { name: 'Create New Book', exact: true }).click(); await settle(); log('click button "Create New Book" (role=button)');
  const book = `Book ${num} [CERT-${tag}]`;
  await main.getByRole('textbox', { name: 'Name', exact: true }).click(); await p.keyboard.type(book); log(`type "${book}" into textbox "Name" (role=textbox by label)`);
  await main.getByRole('textbox', { name: 'Description', exact: true }).click(); await p.keyboard.type(`Certification book for ${num}.`); log(`type description into textbox "Description"`);
  await main.getByRole('textbox', { name: /^Tags/ }).click(); await p.keyboard.type('certification, reading'); log('type "certification, reading" into textbox whose name starts with "Tags"');
  await main.getByRole('button', { name: 'Save Book', exact: true }).click(); await settle(); log('click button "Save Book"');
  await main.getByRole('heading', { level: 1, name: book, exact: true }).waitFor({ timeout: 8000 }); log('book details heading visible');
  const pagesSpec = ['A', 'B', 'C'].map(x => ({ x, title: `Page ${x} ${num} [CERT-${tag}]`, body: `Reading content for Page ${x} ${num}.` }));
  const pageList = () => main.getByRole('region', { name: /^(Page list|Pages)$/ });
  const entry = (t) => pageList().getByRole('button', { name: t, exact: true }).or(pageList().getByRole('link', { name: t, exact: true }));
  for (const pg of pagesSpec) {
    await main.getByRole('button', { name: 'New Page', exact: true }).click(); await settle(); log('click button "New Page"');
    const titleBox = main.getByRole('textbox', { name: /^(Page title|Title)$/ });
    const bodyBox = main.getByRole('textbox', { name: /^(Write your page content here\.\.\.|Page content)$/ });
    await titleBox.click(); await p.keyboard.type(pg.title); log(`type "${pg.title}" into page title textbox (accessible name "${await titleBox.getAttribute('aria-label') ?? (await titleBox.evaluate(e => e.labels?.[0]?.innerText || ''))}")`);
    await bodyBox.click(); await p.keyboard.type(pg.body); log(`type "${pg.body}" into page body textbox`);
    await main.getByRole('button', { name: /^Save page$/i }).click(); await settle(); log('click save-page button (name matching /^Save page$/i)');
    await main.getByRole('heading', { level: 1, name: book, exact: true }).waitFor({ timeout: 8000 }); log('back on book details');
  }
  await snap('book-with-pages');
  const counts = []; for (const pg of pagesSpec) counts.push(await entry(pg.title).count());
  const api1 = await apiDump(); const bk = (api1.books.items || api1.books).find?.(b => (b.name || b.title) === book);
  const apiPages = (api1.pages.items || api1.pages).filter?.(x => bk && x.bookId === bk.id) || [];
  const apiOk = pagesSpec.every(pg => apiPages.filter(x => x.title === pg.title).length === 1);
  set('B64-P1', counts.every(c => c === 1) && apiOk, `page-list entry counts A/B/C = ${counts.join('/')}; API pages in book with each title exactly once: ${apiOk}`);
  const target = pagesSpec[1]; const others = [pagesSpec[0], pagesSpec[2]];
  log(`page list visible order: ${JSON.stringify(await pageList().innerText())}`);
  await entry(target.title).click(); await settle(); log(`click Page list entry named exactly "${target.title}" (button or link inside the page-list region)`);
  const h1s = await main.getByRole('heading', { level: 1 }).allInnerTexts();
  const mainText = await main.innerText();
  const o1 = h1s.length >= 1 && h1s.map(s => s.trim()).includes(target.title) && !others.some(o => h1s.map(s => s.trim()).includes(o.title));
  set('B64-O1', o1, `level-1 headings on opened view: ${JSON.stringify(h1s)}`);
  await snap('opened-page');
  if (scenario === 'read_selected_page') {
    const bodyVis = await main.getByText(target.body, { exact: false }).first().isVisible().catch(() => false);
    set('B64-O2', bodyVis, `target body "${target.body}" visible: ${bodyVis}`);
    const leaked = others.filter(o => mainText.includes(o.body) || mainText.includes(o.title)).map(o => o.x);
    set('B64-O3', leaked.length === 0 && o1, leaked.length ? `other pages shown: ${leaked.join(',')}` : (o1 ? 'no other page title/body shown in main' : 'opened page is not the target'));
  } else {
    const editBtn = main.getByRole('button', { name: /^Edit( page)?$/ }).or(main.getByRole('link', { name: /^Edit( page)?$/ }));
    log(`edit control found: ${JSON.stringify(await editBtn.allInnerTexts())}`);
    await editBtn.first().click(); await settle(); log('click edit control (role=button, name matching /^Edit( page)?$/)');
    const titleBox = main.getByRole('textbox', { name: /^(Page title|Title)$/ });
    const bodyBox = main.getByRole('textbox', { name: /^(Write your page content here\.\.\.|Page content)$/ });
    await titleBox.waitFor({ timeout: 8000 }); await sleep(500);
    const tv = await titleBox.inputValue();
    set('B64-O4', tv === target.title, `title field value: ${JSON.stringify(tv)}`);
    await snap('editor-title');
    const bv = (await bodyBox.evaluate(e => ('value' in e && e.tagName !== 'DIV') ? e.value : e.innerText)).trim();
    set('B64-O5', bv === target.body, `body field value: ${JSON.stringify(bv)}`);
    await snap('editor-body');
    const save = main.getByRole('button', { name: /^Save page$/i });
    const sv = await save.isVisible().catch(() => false);
    set('B64-O6', sv, `save-page button visible: ${sv} (${JSON.stringify(await save.allInnerTexts())})`);
    await snap('editor-save');
  }
  fs.writeFileSync(path.join(out, 'api-after.json'), JSON.stringify(await apiDump(), null, 2));
  log(`page errors: ${JSON.stringify(errors)}`);
  if (errors.length) set('_no_page_errors', false, errors.join(' | ')); else set('_no_page_errors', true, 'no uncaught page errors');
} catch (e) {
  log('ERROR ' + (e.stack || e)); set('_run_error', false, String(e).slice(0, 300)); exitCode = 2;
} finally {
  if (browser) await browser.close();
  srv.kill('SIGTERM'); await sleep(300);
  fs.writeFileSync(path.join(out, 'actions.log'), logLines.join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'obligations.json'), JSON.stringify(obl, null, 2));
  console.log(JSON.stringify({ material, variant, scenario, rep, obl: Object.fromEntries(Object.entries(obl).map(([k, v]) => [k, v.holds])) }));
  process.exit(exitCode);
}
