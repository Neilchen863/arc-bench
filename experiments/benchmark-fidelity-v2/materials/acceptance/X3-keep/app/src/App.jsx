import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Toolbar, Typography,
} from '@mui/material';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import NoteGrid from './components/NoteGrid.jsx';
import NoteEditor from './components/NoteEditor.jsx';
import LabelChooser from './components/LabelChooser.jsx';
import EditLabelsDialog from './components/EditLabelsDialog.jsx';
import SearchFilters from './components/SearchFilters.jsx';
import { api } from './api.js';
import { hasLabel, isActive, matchesKeyword, matchesSearchLabel, normalizeQuery } from './search.js';

const visuallyHidden = {
  position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
};
const EMPTY_SEARCH = { active: false, query: '', labelId: null };

export default function App() {
  const [notes, setNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [now, setNow] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [layout, setLayout] = useState('grid');
  const [view, setView] = useState({ type: 'notes' });
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [editor, setEditor] = useState(null); // { note } ; note null => new note
  const [labelTarget, setLabelTarget] = useState(null);
  const [editLabelsOpen, setEditLabelsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchInputRef = useRef(null);

  const fail = useCallback((e) => setError(e.message || String(e)), []);

  useEffect(() => {
    Promise.all([api.now(), api.listNotes(), api.listLabels()])
      .then(([n, ns, ls]) => { setNow(n); setNotes(ns); setLabels(ls); setLoaded(true); })
      .catch(fail);
  }, [fail]);

  const patchNote = useCallback((note, patch) => {
    setNotes((ns) => ns.map((n) => (n.id === note.id ? { ...n, ...patch } : n)));
    api.updateNote(note.id, patch).catch(fail);
  }, [fail]);

  // ---- editor (autosave on close) ----
  const handleEditorClose = (draft) => {
    const original = editor?.note;
    setEditor(null);
    const editedAt = now;
    if (!original) {
      if (!draft.title.trim() && !draft.content.trim()) return; // nothing typed: discard
      const note = { ...draft, archived: false, trashed: false, deletedAt: null, editedAt };
      const tempId = `pending-${Date.now()}`;
      setNotes((ns) => [...ns, { ...note, id: tempId }]);
      api.createNote(note)
        .then((saved) => setNotes((ns) => ns.map((n) => (n.id === tempId ? saved : n))))
        .catch(fail);
      return;
    }
    const changed = ['title', 'content', 'pinned', 'color'].some((k) => (original[k] ?? null) !== (draft[k] ?? null))
      || JSON.stringify(original.labels || []) !== JSON.stringify(draft.labels);
    if (changed) patchNote(original, { ...draft, editedAt });
  };

  // ---- labels ----
  const createLabel = (name) => api.createLabel({ name }).then((l) => setLabels((ls) => [...ls, l])).catch(fail);
  const renameLabel = (label, name) => {
    setLabels((ls) => ls.map((l) => (l.id === label.id ? { ...l, name } : l)));
    api.updateLabel(label.id, { name }).catch(fail);
  };
  const deleteLabel = (label) => {
    setLabels((ls) => ls.filter((l) => l.id !== label.id));
    notes.filter((n) => hasLabel(n, label.id)).forEach((n) => patchNote(n, { labels: n.labels.filter((x) => x !== label.id) }));
    api.deleteLabel(label.id).catch(fail);
    if (view.type === 'label' && view.labelId === label.id) setView({ type: 'notes' });
  };

  // ---- navigation & search ----
  const selectView = (v) => { setView(v); setSearch(EMPTY_SEARCH); };
  const clearSearch = () => { setSearch(EMPTY_SEARCH); searchInputRef.current?.blur(); };

  const cardHandlers = {
    labels,
    onOpen: (note) => setEditor({ note }),
    onTogglePin: (note) => patchNote(note, { pinned: !note.pinned }),
    onChangeLabels: (note) => setLabelTarget(note),
    onArchive: (note) => patchNote(note, { archived: !note.archived }),
    onTrash: (note) => patchNote(note, { trashed: true, deletedAt: now }),
    onRestore: (note) => patchNote(note, { trashed: false, deletedAt: null }),
    onDeleteForever: (note) => { setNotes((ns) => ns.filter((n) => n.id !== note.id)); api.deleteNote(note.id).catch(fail); },
  };

  const currentLabel = labels.find((l) => l.id === (search.active ? search.labelId : view.labelId));

  const { heading, visibleNotes, emptyText, mode } = useMemo(() => {
    if (search.active) {
      return {
        heading: 'Search',
        visibleNotes: notes.filter((n) => isActive(n) && matchesKeyword(n, search.query) && matchesSearchLabel(n, search.labelId)),
        emptyText: 'No matching results',
        mode: 'search',
      };
    }
    switch (view.type) {
      case 'label':
        return { heading: currentLabel?.name || 'Label', visibleNotes: notes.filter((n) => isActive(n) && hasLabel(n, view.labelId)), emptyText: 'No notes with this label yet', mode: 'label' };
      case 'archive':
        return { heading: 'Archive', visibleNotes: notes.filter((n) => n.archived && !n.trashed), emptyText: 'Your archived notes appear here', mode: 'archive' };
      case 'trash':
        return { heading: 'Trash', visibleNotes: notes.filter((n) => n.trashed), emptyText: 'No notes in Trash', mode: 'trash' };
      default:
        return { heading: 'Notes', visibleNotes: notes.filter(isActive), emptyText: 'Notes you add appear here', mode: 'notes' };
    }
  }, [notes, search, view, currentLabel]);

  const showFilters = search.active && !normalizeQuery(search.query) && !search.labelId;
  const canCreate = !search.active && (view.type === 'notes' || view.type === 'label');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fff' }}>
      <TopBar
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={() => setSidebarExpanded((e) => !e)}
        search={search}
        labels={labels}
        searchInputRef={searchInputRef}
        onSearchFocus={() => setSearch((s) => ({ ...s, active: true }))}
        onQueryChange={(query) => setSearch((s) => ({ ...s, active: true, query }))}
        onClearLabelFilter={() => setSearch((s) => ({ ...s, labelId: null }))}
        onClearSearch={clearSearch}
        layout={layout}
        onToggleLayout={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <Sidebar
        expanded={sidebarExpanded}
        labels={labels}
        view={view}
        searching={search.active}
        onSelect={selectView}
        onEditLabels={() => setEditLabelsOpen(true)}
      />
      <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 4 }, pb: 6 }}>
        <Toolbar />
        <Typography component="h1" variant="h6" sx={mode === 'notes' || mode === 'search' ? visuallyHidden : { mt: 2, mb: 1 }}>
          {heading}
        </Typography>
        {canCreate && (
          <ButtonBase
            onClick={() => setEditor({ note: null })}
            sx={{
              display: 'flex', justifyContent: 'flex-start', width: '100%', maxWidth: 600, mx: 'auto', my: 4, px: 2, py: 1.5,
              borderRadius: 2, boxShadow: 2, color: 'text.secondary', fontSize: 16, fontWeight: 500,
            }}
          >
            Take a note…
          </ButtonBase>
        )}
        {search.active && <Box sx={{ mt: 4 }} />}
        {!loaded ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>Loading…</Typography>
        ) : showFilters ? (
          <SearchFilters labels={labels} onChoose={(labelId) => setSearch((s) => ({ ...s, labelId }))} />
        ) : (
          <NoteGrid
            notes={visibleNotes}
            emptyText={emptyText}
            splitPinned={mode === 'notes' || mode === 'label' || mode === 'search'}
            layout={layout}
            query={search.active ? search.query : ''}
            mode={mode}
            {...cardHandlers}
          />
        )}
      </Box>

      {editor && (
        <NoteEditor
          note={editor.note}
          labels={labels}
          initialLabels={view.type === 'label' && !search.active ? [view.labelId] : []}
          onClose={handleEditorClose}
        />
      )}
      <LabelChooser
        open={Boolean(labelTarget)}
        labels={labels}
        selected={labelTarget?.labels || []}
        onDone={(ids) => { patchNote(labelTarget, { labels: ids }); setLabelTarget(null); }}
      />
      <EditLabelsDialog
        open={editLabelsOpen}
        labels={labels}
        onClose={() => setEditLabelsOpen(false)}
        onCreate={createLabel}
        onRename={renameLabel}
        onDelete={deleteLabel}
      />
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} aria-labelledby="settings-title">
        <DialogTitle id="settings-title">Settings</DialogTitle>
        <DialogContent>
          <Typography>No adjustable settings in this version.</Typography>
        </DialogContent>
        <DialogActions><Button onClick={() => setSettingsOpen(false)}>Close</Button></DialogActions>
      </Dialog>
      <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}
