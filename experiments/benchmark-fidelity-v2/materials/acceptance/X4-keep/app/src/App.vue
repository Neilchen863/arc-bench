<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import AppIcon from './components/AppIcon.vue'
import AppSidebar from './components/AppSidebar.vue'
import NoteCard from './components/NoteCard.vue'
import NoteEditor from './components/NoteEditor.vue'
import LabelPicker from './components/LabelPicker.vue'
import EditLabelsDialog from './components/EditLabelsDialog.vue'
import {
  store, loadAll, orderedNotes, createNote, updateNote, isActive, matchesQuery, labelName, REMINDERS_ID,
} from './store'

const LAYOUT_KEY = 'notes.layout'
function readLayout() {
  try { return localStorage.getItem(LAYOUT_KEY) === 'list' ? 'list' : 'grid' } catch { return 'grid' }
}

const sidebarExpanded = ref(true)
const layout = ref(readLayout())
const view = ref({ kind: 'notes' })
const search = reactive({ active: false, query: '', labelId: null })
const editor = reactive({ open: false, noteId: null, initialLabels: [] })
const pickerNoteId = ref(null)
const editLabelsOpen = ref(false)
const searchInput = ref(null)

onMounted(loadAll)
watch(layout, v => { try { localStorage.setItem(LAYOUT_KEY, v) } catch { /* per-viewer preference only */ } })

const notes = computed(() => orderedNotes())
const activeNotes = computed(() => notes.value.filter(isActive))
const pinnedNotes = computed(() => activeNotes.value.filter(n => n.pinned))
const otherNotes = computed(() => activeNotes.value.filter(n => !n.pinned))
const labelNotes = computed(() => activeNotes.value.filter(n => (n.labels || []).includes(view.value.labelId)))
const archivedNotes = computed(() => notes.value.filter(n => n.archived && !n.trashed))
const trashedNotes = computed(() => notes.value.filter(n => n.trashed))

const showSuggestions = computed(() => search.active && !search.query.trim() && !search.labelId)
const searchResults = computed(() =>
  activeNotes.value
    .filter(n => !search.labelId || (n.labels || []).includes(search.labelId))
    .filter(n => matchesQuery(n, search.query)),
)
const suggestedLabels = computed(() => [
  ...store.labels.filter(l => l.id === REMINDERS_ID),
  ...store.labels.filter(l => l.id !== REMINDERS_ID).sort((a, b) => a.name.localeCompare(b.name)),
])

const viewTitle = computed(() => {
  if (search.active) return 'Search'
  if (view.value.kind === 'label') return labelName(view.value.labelId) || 'Label'
  return { notes: 'Notes', archive: 'Archived', trash: 'Trash' }[view.value.kind]
})
const editingNote = computed(() => store.notes.find(n => n.id === editor.noteId) || null)
const pickerNote = computed(() => store.notes.find(n => n.id === pickerNoteId.value) || null)
const canCompose = computed(() => !search.active && (view.value.kind === 'notes' || view.value.kind === 'label'))

watch(() => store.labels.map(l => l.id), ids => {
  if (view.value.kind === 'label' && !ids.includes(view.value.labelId)) view.value = { kind: 'notes' }
  if (search.labelId && !ids.includes(search.labelId)) search.labelId = null
})

function exitSearch() {
  search.active = false
  search.query = ''
  search.labelId = null
}
function selectView(next) {
  exitSearch()
  view.value = next
}
function onSearchFocus() {
  search.active = true
}
function clearSearch() {
  exitSearch()
  searchInput.value?.blur()
}
function onSearchKeydown(e) {
  if (e.key === 'Escape') { e.preventDefault(); clearSearch() }
  if (e.key === 'Backspace' && !search.query && search.labelId) search.labelId = null
}
function chooseFilter(labelId) {
  search.active = true
  search.labelId = labelId
}

function openNewNote() {
  editor.noteId = null
  editor.initialLabels = view.value.kind === 'label' ? [view.value.labelId] : []
  editor.open = true
}
function openNote(note) {
  if (note.pending) return
  editor.noteId = note.id
  editor.initialLabels = []
  editor.open = true
}
function onEditorClose(draft) {
  const existing = editingNote.value
  editor.open = false
  editor.noteId = null
  if (existing) {
    const changed = ['title', 'content', 'pinned', 'color'].some(k => (existing[k] ?? null) !== (draft[k] ?? null))
      || JSON.stringify(existing.labels || []) !== JSON.stringify(draft.labels)
    if (changed) updateNote(existing.id, draft)
  } else if (draft.title || draft.content.trim()) {
    createNote(draft)
  }
}
function togglePin(note) {
  if (!note.pending) updateNote(note.id, { pinned: !note.pinned })
}
function openPicker(note) {
  if (!note.pending) pickerNoteId.value = note.id
}
function onPickerDone(ids) {
  const note = pickerNote.value
  pickerNoteId.value = null
  if (note && JSON.stringify(note.labels || []) !== JSON.stringify(ids)) updateNote(note.id, { labels: ids })
}
</script>

<template>
  <div class="app" :class="layout">
    <header class="topbar">
      <button
        type="button"
        class="icon-btn"
        aria-label="Toggle sidebar"
        title="Main menu"
        aria-controls="sidebar"
        :aria-expanded="sidebarExpanded ? 'true' : 'false'"
        @click="sidebarExpanded = !sidebarExpanded"
      >
        <AppIcon name="menu" />
      </button>
      <span class="brand"><span class="brand-mark" aria-hidden="true"></span>Notes</span>
      <form class="searchbar" role="search" :class="{ focused: search.active }" @submit.prevent>
        <AppIcon name="search" :size="20" />
        <span v-if="search.labelId" class="filter-chip">
          {{ labelName(search.labelId) }}
          <button type="button" class="chip-x" :aria-label="`Remove ${labelName(search.labelId)} filter`" @click="search.labelId = null">
            <AppIcon name="close" :size="14" />
          </button>
        </span>
        <input
          ref="searchInput"
          v-model="search.query"
          type="search"
          aria-label="Search notes"
          placeholder="Search"
          autocomplete="off"
          @focus="onSearchFocus"
          @keydown="onSearchKeydown"
        />
        <button v-if="search.active" type="button" class="icon-btn" aria-label="Clear search" title="Clear search" @click="clearSearch">
          <AppIcon name="close" :size="20" />
        </button>
      </form>
      <button
        type="button"
        class="icon-btn"
        :aria-label="layout === 'grid' ? 'List view' : 'Grid view'"
        :title="layout === 'grid' ? 'List view' : 'Grid view'"
        @click="layout = layout === 'grid' ? 'list' : 'grid'"
      >
        <AppIcon :name="layout === 'grid' ? 'list' : 'grid'" />
      </button>
    </header>

    <div class="body">
      <AppSidebar
        :expanded="sidebarExpanded"
        :view="view"
        :searching="search.active"
        @select="selectView"
        @edit-labels="editLabelsOpen = true"
      />

      <main class="main">
        <h1 class="visually-hidden">{{ viewTitle }}</h1>
        <div v-if="store.error" class="alert" role="alert">
          {{ store.error }}
          <button type="button" class="text-btn" @click="store.error = ''">Dismiss</button>
        </div>

        <p v-if="!store.loaded" class="empty-state" role="status">Loading…</p>

        <template v-else-if="search.active">
          <section v-if="showSuggestions" class="suggestions" aria-labelledby="suggest-heading">
            <h2 id="suggest-heading" class="panel-title">Filter by label</h2>
            <div class="suggestion-grid">
              <button
                v-for="label in suggestedLabels"
                :key="label.id"
                type="button"
                class="suggestion"
                @click="chooseFilter(label.id)"
              >
                <AppIcon :name="label.id === REMINDERS_ID ? 'bell' : 'label'" :size="32" />
                <span>{{ label.name }}</span>
              </button>
            </div>
          </section>
          <section v-else aria-labelledby="results-heading">
            <h2 id="results-heading" class="section-title">
              {{ searchResults.length }} {{ searchResults.length === 1 ? 'result' : 'results' }}
            </h2>
            <div v-if="searchResults.length" class="notes-grid">
              <NoteCard
                v-for="note in searchResults"
                :key="note.id"
                :note="note"
                :query="search.query"
                @open="openNote(note)"
                @toggle-pin="togglePin(note)"
                @change-labels="openPicker(note)"
              />
            </div>
            <p v-else class="empty-state">No matching notes.</p>
          </section>
        </template>

        <template v-else>
          <div v-if="canCompose" class="composer">
            <button type="button" class="composer-btn" @click="openNewNote">
              <AppIcon name="plus" :size="20" />
              <span>New note</span>
            </button>
          </div>

          <template v-if="view.kind === 'notes'">
            <section v-if="pinnedNotes.length" aria-label="Pinned notes">
              <h2 class="section-title">Pinned</h2>
              <div class="notes-grid">
                <NoteCard v-for="note in pinnedNotes" :key="note.id" :note="note"
                  @open="openNote(note)" @toggle-pin="togglePin(note)" @change-labels="openPicker(note)" />
              </div>
            </section>
            <section v-if="otherNotes.length" aria-label="Other notes">
              <h2 v-if="pinnedNotes.length" class="section-title">Others</h2>
              <div class="notes-grid">
                <NoteCard v-for="note in otherNotes" :key="note.id" :note="note"
                  @open="openNote(note)" @toggle-pin="togglePin(note)" @change-labels="openPicker(note)" />
              </div>
            </section>
            <p v-if="!activeNotes.length" class="empty-state">Notes you add appear here.</p>
          </template>

          <section v-else-if="view.kind === 'label'" :aria-label="`Notes labelled ${viewTitle}`">
            <div v-if="labelNotes.length" class="notes-grid">
              <NoteCard v-for="note in labelNotes" :key="note.id" :note="note"
                @open="openNote(note)" @toggle-pin="togglePin(note)" @change-labels="openPicker(note)" />
            </div>
            <p v-else class="empty-state">No notes with the label {{ viewTitle }} yet.</p>
          </section>

          <section v-else-if="view.kind === 'archive'" aria-label="Archived notes">
            <div v-if="archivedNotes.length" class="notes-grid">
              <NoteCard v-for="note in archivedNotes" :key="note.id" :note="note"
                @open="openNote(note)" @toggle-pin="togglePin(note)" @change-labels="openPicker(note)" />
            </div>
            <p v-else class="empty-state">Your archived notes appear here.</p>
          </section>

          <section v-else-if="view.kind === 'trash'" aria-label="Trashed notes">
            <p class="muted small">Notes in Trash are kept for seven days.</p>
            <div v-if="trashedNotes.length" class="notes-grid">
              <NoteCard v-for="note in trashedNotes" :key="note.id" :note="note" readonly />
            </div>
            <p v-else class="empty-state">No notes in Trash.</p>
          </section>
        </template>
      </main>
    </div>

    <NoteEditor
      v-if="editor.open"
      :key="editor.noteId || 'new'"
      :note="editingNote"
      :initial-labels="editor.initialLabels"
      @close="onEditorClose"
    />
    <LabelPicker
      v-if="pickerNote"
      :selected="pickerNote.labels || []"
      :note-title="pickerNote.title"
      @done="onPickerDone"
    />
    <EditLabelsDialog v-if="editLabelsOpen" @close="editLabelsOpen = false" />
  </div>
</template>
