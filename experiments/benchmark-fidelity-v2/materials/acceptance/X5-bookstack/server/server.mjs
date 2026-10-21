// Shared runtime base for all implementation families (disclosed common component, plan §4.2).
// Zero-dependency Node server: static SPA hosting + generic JSON document store + lifecycle endpoints.
// Business state lives here (server side), so "survives reload" is real persistence, not a test stub.
//
// Env: PORT (required), STATIC_DIR (built frontend), APP (keep|bookstack), DATA_FILE (optional JSON snapshot),
//      BENCHMARK_NOW (ISO string; default per APP).
// Lifecycle (environment management only; never used by tests to create business state):
//   GET  /__health  -> { ok, app, build_hash }
//   POST /__reset   -> wipes all collections and re-applies the fixed seed
// Store (used by frontends):
//   GET /api/now ; GET|POST /api/:collection ; GET|PUT|PATCH|DELETE /api/:collection/:id
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT);
if (!PORT) throw new Error('PORT is required');
const APP = process.env.APP;
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || 'dist');
const DATA_FILE = process.env.DATA_FILE || '';
const NOW = process.env.BENCHMARK_NOW || ({ keep: '2026-07-21T12:00:00.000Z', bookstack: '2026-10-06T12:00:00Z' })[APP];

const SEEDS = {
  keep: () => ({
    labels: [{ id: 'reminders', name: 'Reminders', builtin: true, createdAt: NOW }],
    notes: [
      { id: 'hist-expired', title: 'Expired seven-day note', content: 'Historical expired content', trashed: true, deletedAt: '2026-07-14T12:00:00.000Z', archived: false, pinned: false, labels: [], color: null, createdAt: '2026-07-01T12:00:00.000Z' },
      { id: 'hist-recent', title: 'Recent six-day note', content: 'Historical retained content', trashed: true, deletedAt: '2026-07-15T12:00:00.000Z', archived: false, pinned: false, labels: [], color: null, createdAt: '2026-07-01T12:00:00.000Z' },
    ],
  }),
  bookstack: () => ({
    accounts: [{ id: 'acct-1', nickname: 'BookStack User', email: 'bookstack_user@example.com', password: 'Password123!' }],
    shelves: [{ id: 'shelf-bootstrap', name: 'Benchmark Bootstrap Shelf', description: 'Entry shelf for the New Shelf creation action.', tags: [], books: [], createdAt: NOW }],
    books: [], pages: [], chapters: [],
  }),
};
if (!SEEDS[APP]) throw new Error(`APP must be one of ${Object.keys(SEEDS)}`);

let db;
const persist = () => { if (DATA_FILE) fs.writeFileSync(DATA_FILE, JSON.stringify(db)); };
const reset = () => { db = SEEDS[APP](); persist(); };
if (DATA_FILE && fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); else reset();

function buildHash(dir) {
  const h = crypto.createHash('sha256');
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else { h.update(path.relative(dir, p)); h.update(fs.readFileSync(p)); }
  });
  if (fs.existsSync(dir)) walk(dir);
  return h.digest('hex');
}
const BUILD_HASH = buildHash(STATIC_DIR);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};
const readBody = req => new Promise((ok, fail) => {
  let s = ''; req.on('data', c => (s += c)); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { fail(e); } });
});

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/__health') return send(res, 200, { ok: true, app: APP, build_hash: BUILD_HASH });
    if (url.pathname === '/__reset' && req.method === 'POST') { reset(); return send(res, 200, { ok: true }); }
    if (parts[0] === 'api') {
      if (parts[1] === 'now') return send(res, 200, { now: NOW });
      const col = parts[1];
      if (!col || !/^[a-z]+$/.test(col)) return send(res, 404, { error: 'unknown collection' });
      db[col] ||= [];
      const list = db[col];
      if (parts.length === 2) {
        if (req.method === 'GET') return send(res, 200, list);
        if (req.method === 'POST') {
          const doc = { ...(await readBody(req)), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
          list.push(doc); persist(); return send(res, 201, doc);
        }
      } else {
        const i = list.findIndex(d => d.id === parts[2]);
        if (i < 0) return send(res, 404, { error: 'not found' });
        if (req.method === 'GET') return send(res, 200, list[i]);
        if (req.method === 'PUT') { list[i] = { ...(await readBody(req)), id: list[i].id, createdAt: list[i].createdAt }; persist(); return send(res, 200, list[i]); }
        if (req.method === 'PATCH') { list[i] = { ...list[i], ...(await readBody(req)), id: list[i].id }; persist(); return send(res, 200, list[i]); }
        if (req.method === 'DELETE') { list.splice(i, 1); persist(); res.writeHead(204); return res.end(); }
      }
      return send(res, 405, { error: 'method' });
    }
    // Static SPA hosting with history fallback.
    let file = path.join(STATIC_DIR, decodeURIComponent(url.pathname));
    if (!file.startsWith(STATIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(STATIC_DIR, 'index.html');
    if (!fs.existsSync(file)) return send(res, 503, 'frontend not built', 'text/plain');
    return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
  } catch (e) {
    send(res, 500, { error: String(e) });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`[${APP}] listening on ${PORT} build ${BUILD_HASH.slice(0, 12)}`));
