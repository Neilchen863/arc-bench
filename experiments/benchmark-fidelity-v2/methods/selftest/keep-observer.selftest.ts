// EVALUATOR SELF-TEST (plan §5.3): distractor fixtures for the keep observation layer and drivers.
// These are evaluator tests, not product defects. Each fixture states the expected RAW observation.
// Run against a method's assembled lib (tools/selftest.py) so B and D are checked by the same fixtures.
import { test, expect } from '@playwright/test';
import { note, highlights } from '../tests/lib/observe';
import { editingState } from '../tests/lib/editing-obs';
import * as O from '../tests/lib/oracle';

const CARD = (t: string, c: string, extra = '') => `<article class="card"><h3>${t}</h3><p>${c}</p>${extra}</article>`;
const GRID = (cards: string) => `<main><div class="grid" style="display:grid;grid-template-columns:repeat(3,200px)">${cards}</div></main>`;

test('same text elsewhere on the page (toast) is not a second note', async ({ page }) => {
  await page.setContent(`<div role="status">Saved <span>Alpha</span></div><div role="status"><b>Alpha</b></div>` + GRID(CARD('Alpha', 'Body A') + CARD('Beta', 'Body B')));
  const n = await note(page, 'Alpha');
  expect.soft(n.matches, `observed: ${JSON.stringify(n)}`).toBe(1);
});

test('hidden template holding the full answer is not a note', async ({ page }) => {
  await page.setContent(`<template>${CARD('Gamma', 'First line\nSecond line')}</template>` +
    `<div style="display:none">${CARD('Gamma', 'First line<br>Second line')}</div>` + GRID(CARD('Delta', 'x')));
  const n = await note(page, 'Gamma');
  expect.soft(n.visible, `observed: ${JSON.stringify(n)}`).toBe(false);
});

test('note copy behind a modal (aria-hidden) is not counted twice', async ({ page }) => {
  await page.setContent(`<div aria-hidden="true">${GRID(CARD('Eps', 'c1'))}</div>` + GRID(CARD('Eps', 'c1')));
  const n = await note(page, 'Eps');
  expect.soft(n.matches, `observed: ${JSON.stringify(n)}`).toBe(1);
});

test('text inside an inline editor is not a saved note', async ({ page }) => {
  await page.setContent(`<div class="editor"><div contenteditable="true" aria-label="Title">Zeta</div><div contenteditable="true" aria-label="Note text">body</div></div>` + GRID(CARD('Other', 'y')));
  const n = await note(page, 'Zeta');
  expect.soft(n.matches, `observed: ${JSON.stringify(n)}`).toBe(0);
});

test('highlight in an adjacent note is not attributed to this note', async ({ page }) => {
  await page.setContent(`<style>mark{background:#ff0}</style>` + GRID(CARD('Study plan', 'Math') + CARD('Reading', 'Read a <mark>st</mark>ory')));
  const hs = await highlights(page, 'Study plan', 'st');
  expect.soft(hs.filter(h => h.vhl), `observed: ${JSON.stringify(hs)}`).toHaveLength(0);
});

test('highlight with only a class name but no visual difference fails V-HL', async ({ page }) => {
  await page.setContent(GRID(CARD('<span class="highlight">St</span>udy', 'x')));
  const hs = await highlights(page, 'Study', 'st');
  expect.soft(hs.some(h => h.vhl), `observed: ${JSON.stringify(hs)}`).toBe(false);
});

test('editor shell kept, active controls closed -> closed', async ({ page }) => {
  await page.setContent(`<section class="composer"><input placeholder="Take a note…" value=""></section>` + GRID(CARD('Eta', 'Saved body')));
  const e = await editingState(page, page.locator('section.composer'), 'Eta', 'Saved body');
  expect.soft(() => O.editorClosed('X', e)).not.toThrow();
});

test('editor shell kept but title still in an editable field -> still open', async ({ page }) => {
  await page.setContent(`<section class="composer"><input aria-label="Title" value="Eta"><textarea aria-label="Note text">Saved body</textarea></section>`);
  const e = await editingState(page, page.locator('section.composer'), 'Eta', 'Saved body');
  expect.soft(() => O.editorClosed('X', e)).toThrow(/editor still active/);
});

test('modal editor dialog still shown with cleared fields -> still open', async ({ page }) => {
  await page.setContent(`<div role="dialog" aria-label="New note"><input aria-label="Title" value=""><button>Close</button></div>`);
  const e = await editingState(page, page.getByRole('dialog'), 'Eta', 'Saved body');
  expect.soft(() => O.editorClosed('X', e)).toThrow(/dialog still shown/);
});

test('table-row note: cells are distinct lines (title cell, content cell)', async ({ page }) => {
  await page.setContent(`<table><thead><tr><th>Title</th><th>Note</th></tr></thead><tbody>
    <tr><th scope="row">Theta</th><td style="white-space:pre-wrap">First line\nSecond line</td><td><button aria-label="Pin Theta">📌</button></td></tr>
    <tr><th scope="row">Iota</th><td>x</td><td></td></tr></tbody></table>`);
  const n = await note(page, 'Theta');
  expect.soft(() => { O.exactlyOneVisible('X', n); O.showsTitle('X', n); O.showsLines('X', n, 'First line\nSecond line'); }, JSON.stringify(n)).not.toThrow();
});

test('table-row note: lines joined in one cell are still one line (A-K22-1 negative)', async ({ page }) => {
  await page.setContent(`<table><tbody><tr><th scope="row">Kappa</th><td>First line Second line</td></tr><tr><th>Other</th><td>y</td></tr></tbody></table>`);
  const n = await note(page, 'Kappa');
  expect.soft(() => O.showsLines('X', n, 'First line\nSecond line')).toThrow();
});
