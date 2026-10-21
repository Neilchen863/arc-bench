// Throwaway self-check of the in-scope scenarios (my own script; not the hidden acceptance tests).
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://127.0.0.1:39061'
const results = []
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); }
const sfx = ' ' + Math.random().toString(36).slice(2, 6).replace(/st/g, 'x')

await fetch(BASE + '/__reset', { method: 'POST' })
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', e => ok('no page error', false, String(e)))
await page.goto(BASE)

// REQ-1.1
const nav = page.getByRole('navigation', { name: 'Sidebar' })
const toggle = page.getByRole('button', { name: 'Toggle sidebar' })
ok('sidebar visible', await nav.isVisible())
ok('toggle expanded=true', (await toggle.getAttribute('aria-expanded')) === 'true')
ok('Notes current', (await nav.getByRole('button', { name: 'Notes' }).getAttribute('aria-current')) === 'true')
for (const n of ['Reminders', 'Edit Labels', 'Archived', 'Trash']) ok(`sidebar ${n}`, await nav.getByRole('button', { name: n, exact: true }).isVisible())
ok('searchbox', await page.getByRole('searchbox').isVisible())
ok('new note btn', await page.getByRole('button', { name: 'New note', exact: true }).isVisible())
ok('list view btn', await page.getByRole('button', { name: 'List view' }).isVisible())
await toggle.click()
ok('collapsed expanded=false', (await toggle.getAttribute('aria-expanded')) === 'false')
ok('Notes text hidden', !(await nav.getByText('Notes', { exact: true }).isVisible()))
ok('Notes still visible as action', await nav.getByRole('button', { name: 'Notes' }).isVisible())
await toggle.click()
ok('re-expanded', (await toggle.getAttribute('aria-expanded')) === 'true' && await nav.getByText('Notes', { exact: true }).isVisible())

async function createNote(title, content, { pin = false, labels = [], typeBody = false } = {}) {
  await page.getByRole('button', { name: 'New note', exact: true }).click()
  const dlg = page.getByRole('dialog', { name: 'New note', exact: true })
  await dlg.getByRole('textbox', { name: 'Title' }).fill(title)
  const body = dlg.getByRole('textbox', { name: 'Note text' })
  if (typeBody) {
    await body.click()
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) { if (i) await page.keyboard.press('Enter'); await page.keyboard.type(lines[i]) }
  } else await body.fill(content)
  if (pin) await dlg.getByRole('button', { name: 'Pin note' }).click()
  if (labels.length) {
    await dlg.getByRole('button', { name: 'Change labels' }).click()
    const picker = page.getByRole('dialog', { name: 'Note labels' })
    for (const l of labels) await picker.getByRole('checkbox', { name: l }).check()
    await picker.getByRole('button', { name: 'Done' }).click()
  }
  await dlg.getByRole('button', { name: 'Close' }).click()
  await dlg.waitFor({ state: 'hidden' })
}
const card = t => page.getByRole('article', { name: t, exact: true })

// REQ-2.2 typed multi-line
const t1 = 'New note' + sfx
await createNote(t1, 'First line\nSecond line', { typeBody: true })
ok('2.2 one card', (await card(t1).count()) === 1)
const txt = await card(t1).innerText()
ok('2.2 two lines', /First line\nSecond line/.test(txt), JSON.stringify(txt))
// filled multi-line
const t1b = 'Filled note' + sfx
await createNote(t1b, 'First line\nSecond line')
ok('2.2 fill() multi-line', /First line\nSecond line/.test(await card(t1b).innerText()), JSON.stringify(await card(t1b).innerText()))
const t2 = 'Persistent note' + sfx
await createNote(t2, 'Saved personal content')
await page.waitForTimeout(300)
await page.reload()
ok('2.2 persists after reload', (await card(t2).count()) === 1 && (await card(t2).innerText()).includes('Saved personal content'))
ok('2.2 typed persists', /First line\nSecond line/.test(await card(t1).innerText()))

// Escape also saves
await page.getByRole('button', { name: 'New note', exact: true }).click()
await page.getByRole('textbox', { name: 'Title' }).fill('Escaped' + sfx)
await page.keyboard.press('Escape')
ok('Escape closes+saves', (await card('Escaped' + sfx).count()) === 1)

// REQ-2.1 pinned
const sg = 'Sprint goals' + sfx, gr = 'Groceries' + sfx
await createNote(sg, 'Finish the sprint', { pin: true })
await createNote(gr, 'Milk and bread')
const pinned = page.getByRole('region', { name: 'Pinned notes' }), others = page.getByRole('region', { name: 'Other notes' })
ok('2.1 regions once', (await pinned.count()) === 1 && (await others.count()) === 1)
ok('2.1 placement', (await pinned.getByRole('article', { name: sg }).count()) === 1 && (await others.getByRole('article', { name: sg }).count()) === 0 && (await others.getByRole('article', { name: gr }).count()) === 1)

// Edit Labels
const work = 'Work' + sfx, personal = 'Personal' + sfx
await page.getByRole('navigation', { name: 'Sidebar' }).getByRole('button', { name: 'Edit Labels' }).click()
const el = page.getByRole('dialog', { name: 'Edit labels' })
for (const l of [work, personal]) { await el.getByRole('textbox', { name: 'New label' }).fill(l); await el.getByRole('button', { name: 'Create label' }).click(); await page.waitForTimeout(150) }
await el.getByRole('button', { name: 'Done' }).click()
ok('labels in sidebar', await nav.getByRole('button', { name: work }).isVisible() && await nav.getByRole('button', { name: personal }).isVisible())

// REQ-2.8 assign via More options
const tr = 'Team retro add label' + sfx
await createNote(tr, 'Retro decisions')
await card(tr).getByRole('button', { name: 'More options' }).click()
await page.getByRole('menuitem', { name: 'Change labels' }).click()
const picker = page.getByRole('dialog', { name: 'Note labels' })
await picker.getByRole('checkbox', { name: work }).check()
await picker.getByRole('checkbox', { name: personal }).check()
await picker.getByRole('button', { name: 'Done' }).click()
await page.waitForTimeout(300)
await page.reload()
ok('2.8 chips after reload', (await card(tr).innerText()).includes(work) && (await card(tr).innerText()).includes(personal))
for (const l of [work, personal]) {
  await nav.getByRole('button', { name: l }).click()
  ok(`2.8 filter ${l}`, (await page.getByRole('article').count()) === 1 && (await card(tr).innerText()).includes('Retro decisions'))
}
// remove
await nav.getByRole('button', { name: 'Notes' }).click()
const rm = 'Team retro remove label' + sfx, ow = 'Other Work note' + sfx
await createNote(rm, 'Remove membership', { labels: [work] })
await createNote(ow, 'Keep membership', { labels: [work] })
await card(rm).getByRole('button', { name: rm }).click()
await page.getByRole('dialog', { name: 'Edit note' }).getByRole('button', { name: 'Change labels' }).click()
await picker.getByRole('checkbox', { name: work }).uncheck()
await picker.getByRole('button', { name: 'Done' }).click()
await page.getByRole('dialog', { name: 'Edit note' }).getByRole('button', { name: 'Close' }).click()
await page.waitForTimeout(300)
await page.reload()
ok('2.8 removed chip', !(await card(rm).innerText()).includes(work))
await nav.getByRole('button', { name: work }).click()
ok('2.8 work filter', (await card(rm).count()) === 0 && (await card(ow).count()) === 1 && (await card(tr).count()) === 1)
// reminders
await nav.getByRole('button', { name: 'Notes' }).click()
const cd = 'Call dentist created' + sfx
await createNote(cd, 'Arrange the appointment', { labels: ['Reminders'] })
ok('2.8 reminders chip', (await card(cd).innerText()).includes('Reminders'))
await nav.getByRole('button', { name: 'Reminders' }).click()
ok('2.8 reminders filter', (await card(cd).count()) === 1 && (await page.getByRole('article').count()) === 1)

// REQ-4.1 search
await nav.getByRole('button', { name: 'Notes' }).click()
const ss = 'Study schedule' + sfx, rp = 'Reading plan' + sfx, om = 'Ocean memo' + sfx
await createNote(ss, 'Math on Monday'); await createNote(rp, 'Read a story'); await createNote(om, 'Calm blue waves')
const sb = page.getByRole('searchbox')
await sb.click()
ok('4.1 panel on focus', await page.getByRole('region', { name: 'Filter by label' }).isVisible())
await sb.fill('st')
ok('4.1 study shown', (await card(ss).count()) === 1)
ok('4.1 reading shown', (await card(rp).count()) === 1)
ok('4.1 ocean hidden', (await card(om).count()) === 0)
const marks = await card(rp).locator('mark').allInnerTexts()
ok('4.1 reading highlight st', marks.length >= 1 && marks.every(m => m.toLowerCase() === 'st'), JSON.stringify(marks))
const marks2 = await card(ss).locator('mark').allInnerTexts()
ok('4.1 study highlight St', marks2.length >= 1 && marks2.every(m => m.toLowerCase() === 'st'), JSON.stringify(marks2))
const bg = await card(ss).locator('mark').first().evaluate(e => getComputedStyle(e).backgroundColor)
ok('4.1 highlight visible bg', bg !== 'rgba(0, 0, 0, 0)', bg)
await page.getByRole('button', { name: 'Clear search' }).click()
await nav.getByRole('button', { name: 'Notes' }).click()
ok('4.1 restored', (await card(ss).count()) === 1 && (await card(rp).count()) === 1 && (await card(om).count()) === 1 && (await card(om).innerText()).includes('Calm blue waves'))
// suggested filter
const ce = 'Call dentist existing' + sfx, ml = 'Movie list' + sfx
await createNote(ce, 'Reminder content', { labels: ['Reminders'] })
await createNote(ml, 'Unlabeled content')
await sb.focus()
const panel = page.getByRole('region', { name: 'Filter by label' })
ok('4.1 panel visible', await panel.isVisible())
await panel.getByRole('button', { name: 'Reminders' }).click()
ok('4.1 reminders only', (await card(ce).count()) === 1 && (await card(ml).count()) === 0 && (await card(cd).count()) === 1 && (await card(om).count()) === 0)
await page.getByRole('button', { name: 'Clear search' }).click()
await nav.getByRole('button', { name: 'Notes' }).click()
ok('4.1 both restored', (await card(ce).count()) === 1 && (await card(ml).count()) === 1 && (await card(ml).innerText()).includes('Unlabeled content'))

// Trash view shows seeds
await nav.getByRole('button', { name: 'Trash' }).click()
ok('trash seeds', (await page.getByRole('article').count()) === 2)

// keyboard: open editor and close with keyboard only
await nav.getByRole('button', { name: 'Notes' }).click()
await page.getByRole('button', { name: 'New note', exact: true }).focus()
await page.keyboard.press('Enter')
await page.keyboard.type('Keyboard' + sfx)
await page.keyboard.press('Enter')
await page.keyboard.type('Typed by keys')
for (let i = 0; i < 3; i++) await page.keyboard.press('Tab')
const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() || document.activeElement?.getAttribute('aria-label'))
await page.keyboard.press('Enter')
ok('keyboard create', (await card('Keyboard' + sfx).count()) === 1, 'focused=' + focused)

const apiNotes = await (await fetch(BASE + '/api/notes')).json()
ok('server has notes', apiNotes.some(n => n.title === t1 && n.content === 'First line\nSecond line'), JSON.stringify(apiNotes.find(n => n.title === t1)))
await page.screenshot({ path: new URL('./tmp/notes.png', import.meta.url).pathname, fullPage: true })
await browser.close()
for (const r of results) console.log(r.join(' | '))
console.log(results.filter(r => r[0] === 'FAIL').length, 'failures of', results.length)
