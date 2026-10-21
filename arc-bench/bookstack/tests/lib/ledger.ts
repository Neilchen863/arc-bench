// COMMON LOG INTERFACE (shared verbatim by every method; hashed in the protocol).
// Records, per test case, every obligation check with its last raw observation and provenance, and every
// operation the method performed (intent, target object, actual control, how, before/after evidence).
// The runner reads the 'arc-ledger' attachment from the Playwright JSON report.
import { test } from '@playwright/test';

type Status = 'PASS' | 'FAIL' | 'UNKNOWN';
interface Check { obligation: string; status: Status; detail: string; observed: unknown; at: string; step: string }
interface Action { at: string; intent: string; target?: string; control?: string; how?: string; before?: unknown; after?: unknown; note?: string }

const state = { checks: [] as Check[], actions: [] as Action[], step: 'start', steps: [] as string[] };

const now = () => new Date().toISOString();
const trunc = (v: unknown) => {
  let s: string;
  try {
    s = JSON.stringify(v ?? null, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) && x.constructor && !['Object'].includes(x.constructor.name)) ? `[${x.constructor.name}]` : x);
  } catch (e) { s = `[unserializable: ${e}]`; }
  return s && s.length > 4000 ? s.slice(0, 4000) + '…' : s;
};

export function step(name: string) { state.step = name; state.steps.push(name); }
export function act(a: Omit<Action, 'at'>) { state.actions.push({ at: now(), ...a }); }

function classify(e: unknown): Status {
  const m = String((e as Error)?.message ?? e);
  if (m.startsWith('OBLIGATION_FAIL')) return 'FAIL';
  return 'UNKNOWN';
}

// Poll observe() and judge() until judge passes or the window expires; record the last raw observation.
// A failure thrown by the observer itself (cannot locate/extract) is recorded as UNKNOWN, never as FAIL.
export async function ob<T>(obligation: string, observe: () => Promise<T> | T, judge: (o: T) => void, timeout = 10_000): Promise<T> {
  const deadline = Date.now() + timeout;
  let last: T | undefined;
  while (true) {
    try {
      last = await observe();
      judge(last);
      state.checks.push({ obligation, status: 'PASS', detail: '', observed: trunc(last), at: now(), step: state.step });
      return last;
    } catch (e) {
      if (Date.now() >= deadline) {
        state.checks.push({ obligation, status: classify(e), detail: String((e as Error)?.message ?? e).slice(0, 2000), observed: trunc(last), at: now(), step: state.step });
        throw e;
      }
      await new Promise(r => setTimeout(r, 250));
    }
  }
}

// Mark the obligations the current case is about to check, so unreached ones show as NOT_REACHED.
export function plan(ids: string[]) { (state as any).planned = ids; }

test.beforeEach(() => { state.checks = []; state.actions = []; state.step = 'start'; state.steps = []; (state as any).planned = []; });
test.afterEach(async ({}, info) => {
  const planned: string[] = (state as any).planned || [];
  const byOb: Record<string, Status | 'NOT_REACHED'> = {};
  for (const id of planned) byOb[id] = 'NOT_REACHED';
  for (const c of state.checks) {
    const prev = byOb[c.obligation];
    byOb[c.obligation] = prev === 'FAIL' || c.status === 'FAIL' ? 'FAIL' : prev === 'UNKNOWN' || c.status === 'UNKNOWN' ? 'UNKNOWN' : 'PASS';
  }
  await info.attach('arc-ledger', {
    body: JSON.stringify({ obligations: byOb, checks: state.checks, actions: state.actions, last_step: state.step, steps: state.steps }),
    contentType: 'application/json',
  });
});
