// Thin REST client for the shared runtime store. All business data lives on the server.
async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  list: col => req('GET', `/api/${col}`),
  get: (col, id) => req('GET', `/api/${col}/${encodeURIComponent(id)}`),
  create: (col, doc) => req('POST', `/api/${col}`, doc),
  patch: (col, id, doc) => req('PATCH', `/api/${col}/${encodeURIComponent(id)}`, doc),
};

let nowPromise;
/** Business "now" from the server (never the machine clock). */
export function businessNow() {
  nowPromise ||= req('GET', '/api/now').then(r => r.now);
  return nowPromise;
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function parseTags(text) {
  return text.split(',').map(t => t.trim()).filter(Boolean);
}
