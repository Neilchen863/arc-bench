import { reactive } from 'vue'
import { api } from './api'

export const REMINDERS_ID = 'reminders'

export const store = reactive({
  notes: [],
  labels: [],
  now: null, // business date from GET /api/now
  loaded: false,
  error: '',
})

let tempSeq = 0

function report(err, message) {
  console.error(err)
  store.error = message
}

export async function loadAll() {
  try {
    const [notes, labels, now] = await Promise.all([api.list('notes'), api.list('labels'), api.now()])
    store.notes = notes
    store.labels = labels
    store.now = now
  } catch (err) {
    report(err, 'Could not load your notes. Check the connection and reload.')
  } finally {
    store.loaded = true
  }
}

/** Newest first, as the server keeps insertion order. */
export function orderedNotes() {
  return [...store.notes].reverse()
}

export async function createNote(draft) {
  const doc = {
    title: draft.title,
    content: draft.content,
    pinned: !!draft.pinned,
    color: draft.color || null,
    labels: [...(draft.labels || [])],
    archived: false,
    trashed: false,
    editedAt: store.now,
  }
  // Optimistic: show immediately, then replace with the server copy.
  const temp = { ...doc, id: `pending-${++tempSeq}`, pending: true }
  store.notes.push(temp)
  try {
    const saved = await api.create('notes', doc)
    const i = store.notes.findIndex(n => n.id === temp.id)
    if (i >= 0) store.notes.splice(i, 1, saved)
  } catch (err) {
    report(err, 'Your note could not be saved. It will be lost on reload.')
  }
}

export async function updateNote(id, changes) {
  const note = store.notes.find(n => n.id === id)
  if (!note) return
  const patch = { ...changes, editedAt: store.now }
  Object.assign(note, patch)
  try {
    await api.patch('notes', id, patch)
  } catch (err) {
    report(err, 'Your change could not be saved.')
  }
}

export async function createLabel(name) {
  try {
    const saved = await api.create('labels', { name, builtin: false })
    store.labels.push(saved)
    return saved
  } catch (err) {
    report(err, 'The label could not be created.')
    return null
  }
}

export async function deleteLabel(id) {
  try {
    await api.remove('labels', id)
    store.labels = store.labels.filter(l => l.id !== id)
    const affected = store.notes.filter(n => (n.labels || []).includes(id))
    await Promise.all(affected.map(n => updateNote(n.id, { labels: n.labels.filter(x => x !== id) })))
  } catch (err) {
    report(err, 'The label could not be deleted.')
  }
}

export function labelName(id) {
  return store.labels.find(l => l.id === id)?.name
}

export function isActive(note) {
  return !note.archived && !note.trashed
}

export function matchesQuery(note, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (note.title || '').toLowerCase().includes(q) || (note.content || '').toLowerCase().includes(q)
}

export function formatDate(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso))
}
