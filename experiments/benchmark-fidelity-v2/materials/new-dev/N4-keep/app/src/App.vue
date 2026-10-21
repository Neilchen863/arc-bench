<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Menu as MenuIcon, Search, Setting, Grid, List, Opportunity, Bell, PriceTag, EditPen, Box, Delete, Close,
} from '@element-plus/icons-vue';
import { api } from './api.js';
import { matchesKeyword } from './highlight.js';
import NoteRow from './components/NoteRow.vue';
import NoteEditor from './components/NoteEditor.vue';
import LabelChooser from './components/LabelChooser.vue';
import EditLabelsDialog from './components/EditLabelsDialog.vue';

// ---- server state -------------------------------------------------------
const notes = ref([]);
const labels = ref([]);
const businessNow = ref(null);
const loading = ref(true);

async function loadAll() {
  const [n, l, now] = await Promise.all([api.list('notes'), api.list('labels'), api.now()]);
  notes.value = n;
  labels.value = l;
  businessNow.value = now;
  loading.value = false;
}
onMounted(() => loadAll().catch(e => ElMessage.error(String(e.message || e))));

const sortedLabels = computed(() => {
  const builtin = labels.value.filter(l => l.builtin);
  const user = labels.value.filter(l => !l.builtin).sort((a, b) => a.name.localeCompare(b.name));
  return [...builtin, ...user];
});
const userLabels = computed(() => sortedLabels.value.filter(l => !l.builtin));

// ---- navigation / view state -------------------------------------------
const sidebarOpen = ref(true);
const view = ref({ kind: 'notes' }); // notes | label(id) | archive | trash
const layout = ref('grid');

const query = ref('');
const searchActive = ref(false);
const searchLabel = ref(null); // label id chosen from the search suggestions
const searchInput = ref(null);

function selectView(v) {
  view.value = v;
  clearSearch();
}
function isCurrent(v) {
  if (searchActive.value) return false;
  return view.value.kind === v.kind && view.value.id === v.id;
}
function clearSearch() {
  query.value = '';
  searchLabel.value = null;
  searchActive.value = false;
}
function onSearchFocus() { searchActive.value = true; }
function chooseSuggestion(labelId) {
  searchLabel.value = labelId;
  searchActive.value = true;
}
function onSearchKey(e) {
  if (e.key === 'Escape') { clearSearch(); e.target.blur(); }
}

const labelName = id => labels.value.find(l => l.id === id)?.name ?? '';
const showSuggestions = computed(() => searchActive.value && !query.value.trim() && !searchLabel.value);

// Newest first, like a notebook stack.
const sortedNotes = computed(() => [...notes.value].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
const activeNotes = computed(() => sortedNotes.value.filter(n => !n.archived && !n.trashed));
const visibleNotes = computed(() => {
  if (searchActive.value) {
    let r = activeNotes.value;
    if (searchLabel.value) r = r.filter(n => (n.labels || []).includes(searchLabel.value));
    if (query.value.trim()) r = r.filter(n => matchesKeyword(n, query.value));
    return r;
  }
  const v = view.value;
  if (v.kind === 'label') return activeNotes.value.filter(n => (n.labels || []).includes(v.id));
  if (v.kind === 'archive') return sortedNotes.value.filter(n => n.archived && !n.trashed);
  if (v.kind === 'trash') return sortedNotes.value.filter(n => n.trashed);
  return activeNotes.value;
});
const readonlyView = computed(() => !searchActive.value && (view.value.kind === 'archive' || view.value.kind === 'trash'));
const pinnedNotes = computed(() => (readonlyView.value ? [] : visibleNotes.value.filter(n => n.pinned)));
const otherNotes = computed(() => (readonlyView.value ? visibleNotes.value : visibleNotes.value.filter(n => !n.pinned)));
const keyword = computed(() => (searchActive.value ? query.value.trim() : ''));

const viewHeading = computed(() => {
  if (searchActive.value) {
    if (searchLabel.value) return `Search: ${labelName(searchLabel.value)}`;
    return query.value.trim() ? 'Search results' : 'Search';
  }
  const v = view.value;
  if (v.kind === 'label') return labelName(v.id);
  if (v.kind === 'archive') return 'Archive';
  if (v.kind === 'trash') return 'Trash';
  return 'Notes';
});
const emptyText = computed(() => {
  if (searchActive.value) return 'No matching notes';
  const k = view.value.kind;
  if (k === 'archive') return 'Your archived notes appear here';
  if (k === 'trash') return 'No notes in Trash';
  if (k === 'label') return 'No notes with this label yet';
  return 'Notes you add appear here';
});

// ---- editor ---------------------------------------------------------------
const editorOpen = ref(false);
const editingNote = ref(null);

const newNoteLabels = ref([]);
function openNewNote() {
  editingNote.value = null;
  // Creating a note while a label is selected pre-assigns that label (it stays visible in this view).
  newNoteLabels.value = view.value.kind === 'label' ? [view.value.id] : [];
  editorOpen.value = true;
}
function openNote(note) {
  editingNote.value = note;
  editorOpen.value = true;
}
async function refreshNow() {
  try { businessNow.value = await api.now(); } catch { /* keep last known business date */ }
  return businessNow.value;
}

// Autosave: called whenever the editor closes, by any route.
async function saveFromEditor(draft) {
  const existing = editingNote.value;
  const fields = {
    title: draft.title.trim(),
    content: draft.content,
    pinned: draft.pinned,
    color: draft.color,
    labels: draft.labels,
  };
  try {
    if (!existing) {
      if (!fields.title && !fields.content.trim()) return; // nothing typed: nothing to keep
      const now = await refreshNow();
      const created = await api.create('notes', { ...fields, archived: false, trashed: false, editedAt: now });
      notes.value = [...notes.value, created];
    } else {
      const changed = Object.keys(fields).some(k => JSON.stringify(fields[k]) !== JSON.stringify(existing[k] ?? (k === 'labels' ? [] : k === 'pinned' ? false : null)));
      if (!changed) return;
      const now = await refreshNow();
      await patchNote(existing, { ...fields, editedAt: now });
    }
  } catch (e) {
    ElMessage.error(`Could not save note: ${e.message || e}`);
    throw e; // keep the editor open so the typed text is not lost
  }
}

async function patchNote(note, changes) {
  const updated = await api.patch('notes', note.id, changes);
  notes.value = notes.value.map(n => (n.id === note.id ? updated : n));
  return updated;
}

// ---- note card actions ---------------------------------------------------
const chooserNote = ref(null);
const chooserOpen = ref(false);
function openChooserFor(note) {
  chooserNote.value = note;
  chooserOpen.value = true;
}
async function saveChooser(ids) {
  const note = chooserNote.value;
  if (!note) return;
  try { await patchNote(note, { labels: ids }); } catch (e) { ElMessage.error(String(e.message || e)); }
}
async function togglePin(note) {
  try { await patchNote(note, { pinned: !note.pinned }); } catch (e) { ElMessage.error(String(e.message || e)); }
}
async function archiveNote(note) {
  try {
    await patchNote(note, { archived: true, pinned: false });
    ElMessage({ message: 'Note archived', type: 'info' });
  } catch (e) { ElMessage.error(String(e.message || e)); }
}
async function trashNote(note) {
  try {
    const now = await refreshNow();
    await patchNote(note, { trashed: true, deletedAt: now, pinned: false });
    ElMessage({ message: 'Note moved to Trash', type: 'info' });
  } catch (e) { ElMessage.error(String(e.message || e)); }
}
async function restoreNote(note) {
  try { await patchNote(note, note.trashed ? { trashed: false, deletedAt: null } : { archived: false }); } catch (e) { ElMessage.error(String(e.message || e)); }
}

// ---- label management ----------------------------------------------------
const editLabelsOpen = ref(false);
async function createLabel(name) {
  try {
    const created = await api.create('labels', { name });
    labels.value = [...labels.value, created];
  } catch (e) { ElMessage.error(String(e.message || e)); }
}
async function renameLabel(label, name) {
  try {
    const updated = await api.patch('labels', label.id, { name });
    labels.value = labels.value.map(l => (l.id === label.id ? updated : l));
  } catch (e) { ElMessage.error(String(e.message || e)); }
}
async function deleteLabel(label) {
  try {
    await api.remove('labels', label.id);
    labels.value = labels.value.filter(l => l.id !== label.id);
    for (const n of notes.value.filter(n => (n.labels || []).includes(label.id))) {
      await patchNote(n, { labels: n.labels.filter(id => id !== label.id) });
    }
    if (view.value.kind === 'label' && view.value.id === label.id) view.value = { kind: 'notes' };
  } catch (e) { ElMessage.error(String(e.message || e)); }
}

// ---- header ------------------------------------------------------------------
function onSettings(cmd) {
  if (cmd === 'refresh') loadAll();
  if (cmd === 'labels') editLabelsOpen.value = true;
}
async function focusSearch() {
  await nextTick();
  searchInput.value?.focus();
}
</script>

<template>
  <div class="shell" :class="{ collapsed: !sidebarOpen }">
    <header class="topbar">
      <el-button text circle class="menu-btn" aria-label="Main menu" title="Main menu" aria-controls="sidebar"
        :aria-expanded="String(sidebarOpen)" @click="sidebarOpen = !sidebarOpen">
        <el-icon :size="20"><MenuIcon /></el-icon>
      </el-button>
      <h1 class="brand">Keep</h1>
      <div class="search" role="search">
        <el-input ref="searchInput" v-model="query" type="search" placeholder="Search" aria-label="Search notes"
          :prefix-icon="Search" @focus="onSearchFocus" @keydown="onSearchKey">
          <template #suffix>
            <el-button v-if="searchActive" text circle size="small" :icon="Close" aria-label="Clear search"
              title="Clear search" @click="clearSearch" />
          </template>
        </el-input>
      </div>
      <div class="top-actions">
        <el-button text circle :aria-label="layout === 'grid' ? 'List view' : 'Grid view'"
          :title="layout === 'grid' ? 'Switch to list view' : 'Switch to grid view'"
          @click="layout = layout === 'grid' ? 'list' : 'grid'">
          <el-icon :size="20"><List v-if="layout === 'grid'" /><Grid v-else /></el-icon>
        </el-button>
        <el-dropdown trigger="click" @command="onSettings">
          <el-button text circle aria-label="Settings" title="Settings">
            <el-icon :size="20"><Setting /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="labels">Edit labels</el-dropdown-item>
              <el-dropdown-item command="refresh">Refresh notes</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <nav id="sidebar" class="sidebar" aria-label="Main navigation">
      <ul>
        <li>
          <button type="button" class="nav-item" :aria-current="isCurrent({ kind: 'notes' }) ? 'page' : undefined"
            title="Notes" :aria-label="sidebarOpen ? undefined : 'Notes'" @click="selectView({ kind: 'notes' })">
            <el-icon :size="20"><Opportunity /></el-icon><span class="nav-text">Notes</span>
          </button>
        </li>
        <li v-for="l in sortedLabels" :key="l.id">
          <button type="button" class="nav-item"
            :aria-current="isCurrent({ kind: 'label', id: l.id }) ? 'page' : undefined" :title="l.name"
            :aria-label="sidebarOpen ? undefined : l.name" @click="selectView({ kind: 'label', id: l.id })">
            <el-icon :size="20"><Bell v-if="l.builtin" /><PriceTag v-else /></el-icon><span class="nav-text">{{ l.name }}</span>
          </button>
        </li>
        <li>
          <button type="button" class="nav-item" title="Edit labels" :aria-label="sidebarOpen ? undefined : 'Edit labels'" @click="editLabelsOpen = true">
            <el-icon :size="20"><EditPen /></el-icon><span class="nav-text">Edit labels</span>
          </button>
        </li>
        <li>
          <button type="button" class="nav-item" :aria-current="isCurrent({ kind: 'archive' }) ? 'page' : undefined"
            title="Archive" :aria-label="sidebarOpen ? undefined : 'Archive'" @click="selectView({ kind: 'archive' })">
            <el-icon :size="20"><Box /></el-icon><span class="nav-text">Archive</span>
          </button>
        </li>
        <li>
          <button type="button" class="nav-item" :aria-current="isCurrent({ kind: 'trash' }) ? 'page' : undefined"
            title="Trash" :aria-label="sidebarOpen ? undefined : 'Trash'" @click="selectView({ kind: 'trash' })">
            <el-icon :size="20"><Delete /></el-icon><span class="nav-text">Trash</span>
          </button>
        </li>
      </ul>
    </nav>

    <main class="main">
      <h2 class="view-heading">{{ viewHeading }}</h2>

      <section v-if="showSuggestions" class="suggestions" aria-labelledby="suggestions-heading">
        <h3 id="suggestions-heading">Filter by label</h3>
        <div class="suggestion-grid">
          <el-button v-for="l in sortedLabels" :key="l.id" class="suggestion" @click="chooseSuggestion(l.id)">
            <el-icon :size="22"><Bell v-if="l.builtin" /><PriceTag v-else /></el-icon>
            <span>{{ l.name }}</span>
          </el-button>
        </div>
      </section>

      <div v-if="searchActive && searchLabel" class="active-filter">
        <el-tag type="warning" disable-transitions>Label: {{ labelName(searchLabel) }}</el-tag>
        <el-button text size="small" @click="searchLabel = null; focusSearch()">Remove filter</el-button>
      </div>

      <div v-if="!searchActive && (view.kind === 'notes' || view.kind === 'label')" class="composer">
        <button type="button" class="take-note" @click="openNewNote">Take a note…</button>
      </div>

      <p v-if="loading" class="empty">Loading…</p>
      <template v-else>
        <p v-if="!visibleNotes.length && !showSuggestions" class="empty">{{ emptyText }}</p>
        <section v-if="pinnedNotes.length" class="note-section" aria-labelledby="pinned-heading">
          <h3 id="pinned-heading" class="section-heading">Pinned</h3>
          <table class="notes-table">
            <thead><tr><th scope="col">Title</th><th scope="col">Note</th><th scope="col">Labels</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>
              <NoteRow v-for="n in pinnedNotes" :key="n.id" :note="n" :labels="labels" :keyword="keyword"
              @open="openNote" @toggle-pin="togglePin" @change-labels="openChooserFor" @archive="archiveNote"
              @trash="trashNote" />
            </tbody>
          </table>
        </section>
        <section v-if="otherNotes.length" class="note-section" aria-labelledby="others-heading">
          <h3 id="others-heading" class="section-heading" :class="{ 'sr-only': !pinnedNotes.length }">Others</h3>
          <table class="notes-table">
            <thead><tr><th scope="col">Title</th><th scope="col">Note</th><th scope="col">Labels</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>
              <NoteRow v-for="n in otherNotes" :key="n.id" :note="n" :labels="labels" :keyword="keyword"
              :readonly="readonlyView" @open="openNote" @toggle-pin="togglePin" @change-labels="openChooserFor"
              @archive="archiveNote" @trash="trashNote" @restore="restoreNote" />
            </tbody>
          </table>
        </section>
      </template>
    </main>

    <NoteEditor v-model="editorOpen" :note="editingNote" :initial-labels="newNoteLabels" :labels="sortedLabels" :save="saveFromEditor" />
    <LabelChooser v-model="chooserOpen" :labels="sortedLabels" :selected="chooserNote?.labels || []"
      :note-title="chooserNote?.title || ''" :save="saveChooser" />
    <EditLabelsDialog v-model="editLabelsOpen" :labels="userLabels" @create="createLabel" @rename="renameLabel"
      @delete="deleteLabel" />
  </div>
</template>
