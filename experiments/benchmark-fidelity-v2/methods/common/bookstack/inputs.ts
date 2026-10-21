// SCENARIO INPUTS (read-only, shared by M0L and all revision methods).
// Input-coverage change vs upstream (ledger M0->M0L): three pages A, TARGET(B), C so that TARGET is never the first
// entry under creation, reverse-creation or alphabetical order (spec-audit A-B64-3).
import type { TestInfo } from '@playwright/test';

export function identity(info: TestInfo): string {
  const run = process.env.BOOKSTACK_RUN_ID;
  if (!run || !/^[A-Za-z0-9_-]{1,40}$/.test(run)) throw new Error('Supply BOOKSTACK_RUN_ID');
  return `${run}-w${info.workerIndex}-${info.title.replace(/[^A-Za-z0-9]+/g, '-')}`;
}
export const named = (id: string, base: string) => `${base} [${id}]`;
export const book = (n: string) => ({ base: `Book 6.4.${n}`, description: 'Reference book description.', tags: 'manual, handbook' });
export const pages = (n: string) => [
  { key: 'A', base: `Page A 6.4.${n}`, body: `Reading content for Page A 6.4.${n}.` },
  { key: 'TARGET', base: `Page B 6.4.${n}`, body: `Reading content for Page B 6.4.${n}.` },
  { key: 'C', base: `Page C 6.4.${n}`, body: `Reading content for Page C 6.4.${n}.` },
];
