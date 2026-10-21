// SCENARIO INPUTS (read-only, shared by M0L and all revision methods). Same values as the upstream scenarios.
import { createHash } from 'node:crypto';
import type { TestInfo } from '@playwright/test';

export const benchmarkNow = '2026-07-21T12:00:00.000Z';
// Same isolation scheme as upstream: hex-only suffix, so it cannot introduce the keyword "st".
export function identity(info: TestInfo, example: string): string {
  const run = process.env.KEEP_RUN_ID;
  if (!run) throw new Error('KEEP_RUN_ID must be supplied by the evaluator');
  const caseId = createHash('sha256').update(info.title).digest('hex').slice(0, 10);
  const runId = createHash('sha256').update(run).digest('hex').slice(0, 10);
  return `${example} [${runId}-w${info.workerIndex}-${caseId}]`;
}
export const K22 = {
  autosave: { base: 'New note', content: 'First line\nSecond line' },
  persist: { base: 'Persistent note', content: 'Saved personal content' },
};
export const K41 = {
  keyword: 'st',
  titleMatch: { base: 'Study schedule', content: 'Math on Monday' },
  contentMatch: { base: 'Reading plan', content: 'Read a story' },
  other: { base: 'Ocean memo', content: 'Calm blue waves' },
  labeled: { base: 'Call dentist existing', content: 'Reminder content', label: 'Reminders' },
  unlabeled: { base: 'Movie list', content: 'Unlabeled content' },
};
