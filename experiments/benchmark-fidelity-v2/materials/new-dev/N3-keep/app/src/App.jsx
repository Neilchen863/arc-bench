import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import { hasLabel, matchesKeyword } from './search.js';
import { isRetained } from './dates.js';
import NoteCard from './NoteCard.jsx';
import NoteEditor from './NoteEditor.jsx';
import LabelChooser from './LabelChooser.jsx';
import EditLabels from './EditLabels.jsx';

const EMPTY_DRAFT = { title: '', content: '', pinned: false, color: null, labels: [] };

function SidebarButton({ label, icon, current, onClick }) {
  return (
    <li>
      <button
        type="button"
        className={`nav__item${current ? ' is-current' : ''}`}
        aria-label={label}
        aria-current={current ? 'true' : undefined}
        title={label}
        onClick={onClick}
      >
        <Icon name={icon} />
        <span className="nav__text">{label}</span>
      </button>
    </li>
  );
}

function SettingsMenu({ dark, onToggleDark }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    wrapRef.current?.querySelector('[role="menuitemcheckbox"]')?.focus();
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <span className="menu-wrap" ref={wrapRef} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        className="icon-button"
        aria-label="Settings menu"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        title="Settings"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="settings" />
      </button>
      {open && (
        <div className="menu menu--right" role="menu" aria-label="Settings">
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={dark ? 'true' : 'false'}
            className="menu__item"
            onClick={() => {
              onToggleDark();
              setOpen(false);
            }}
          >
            Dark theme
          </button>
        </div>
      )}
    </span>
  );
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [labels, setLabels] = useState([]);
  const [now, setNow] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState({ type: 'notes' });
  const [query, setQuery] = useState('');
  const [searchLabel, setSearchLabel] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [layout, setLayout] = useState('grid');
  const [dark, setDark] = useState(false);
  const [editor, setEditor] = useState(null); // { initial }
  const [chooserNote, setChooserNote] = useState(null);
  const [editLabelsOpen, setEditLabelsOpen] = useState(false);
  const [notice, setNotice] = useState(null); // { text, undo? }
  const takeNoteRef = useRef(null);
  const noticeTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const [n, l, t] = await Promise.all([api.listNotes(), api.listLabels(), api.now()]);
      setNotes(n);
      setLabels(l);
      setNow(t);
      setLoaded(true);
    } catch (e) {
      setLoadError('Could not load your notes.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Business time comes from the server; refresh it before stamping data.
  const businessNow = async () => {
    try {
      const t = await api.now();
      setNow(t);
      return t;
    } catch {
      return now;
    }
  };

  const showNotice = (text, undo) => {
    clearTimeout(noticeTimer.current);
    setNotice({ text, undo });
    noticeTimer.current = setTimeout(() => setNotice(null), 8000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const replaceNote = (doc) => setNotes((list) => list.map((n) => (n.id === doc.id ? doc : n)));

  // ----- sidebar navigation -----
  const selectView = (next) => {
    setView(next);
    if (next.type === 'notes') {
      setQuery('');
      setSearchLabel(null);
    }
  };

  // ----- note editor -----
  const openNew = () => {
    const preset = view.type === 'label' ? [view.labelId] : [];
    setEditor({ initial: { ...EMPTY_DRAFT, labels: preset } });
  };
  const openExisting = (note) => {
    setEditor({
      initial: {
        id: note.id,
        title: note.title || '',
        content: note.content || '',
        pinned: !!note.pinned,
        color: note.color ?? null,
        labels: note.labels || [],
        editedAt: note.editedAt,
      },
    });
  };

  const closeEditor = async (draft) => {
    const t = await businessNow();
    if (draft.id) {
      const patch = { title: draft.title, content: draft.content, pinned: draft.pinned, color: draft.color, labels: draft.labels, editedAt: t };
      const doc = await api.updateNote(draft.id, patch);
      replaceNote(doc);
    } else if (draft.title.trim() || draft.content.trim()) {
      const doc = await api.createNote({
        title: draft.title,
        content: draft.content,
        pinned: draft.pinned,
        color: draft.color,
        labels: draft.labels,
        archived: false,
        trashed: false,
        deletedAt: null,
        createdOn: t,
        editedAt: t,
      });
      setNotes((list) => [...list, doc]);
    }
    setEditor(null);
    requestAnimationFrame(() => takeNoteRef.current?.focus());
  };

  // ----- note actions -----
  const deleteNote = async (note) => {
    const t = await businessNow();
    const doc = await api.updateNote(note.id, { trashed: true, deletedAt: t });
    replaceNote(doc);
    showNotice('Note deleted', async () => {
      const back = await api.updateNote(note.id, { trashed: false, deletedAt: null });
      replaceNote(back);
      showNotice('Action undone');
    });
  };
  const restoreNote = async (note) => {
    const patch = note.trashed ? { trashed: false, deletedAt: null } : { archived: false };
    replaceNote(await api.updateNote(note.id, patch));
  };
  const saveNoteLabels = async (ids) => {
    const doc = await api.updateNote(chooserNote.id, { labels: ids });
    replaceNote(doc);
    setChooserNote(null);
  };
  const emptyTrash = async () => {
    const trashed = notes.filter((n) => n.trashed);
    await Promise.all(trashed.map((n) => api.removeNote(n.id)));
    setNotes((list) => list.filter((n) => !n.trashed));
  };

  // ----- label management -----
  const createLabel = async (name) => {
    const t = await businessNow();
    const doc = await api.createLabel({ name, builtin: false, createdOn: t });
    setLabels((list) => [...list, doc]);
  };
  const renameLabel = async (label, name) => {
    const doc = await api.updateLabel(label.id, { name });
    setLabels((list) => list.map((l) => (l.id === doc.id ? doc : l)));
  };
  const deleteLabel = async (label) => {
    const affected = notes.filter((n) => hasLabel(n, label.id));
    const updated = await Promise.all(
      affected.map((n) => api.updateNote(n.id, { labels: n.labels.filter((id) => id !== label.id) }))
    );
    await api.removeLabel(label.id);
    setNotes((list) => list.map((n) => updated.find((u) => u.id === n.id) || n));
    setLabels((list) => list.filter((l) => l.id !== label.id));
    if (view.type === 'label' && view.labelId === label.id) setView({ type: 'notes' });
  };

  // ----- derived lists -----
  const reminders = labels.find((l) => l.builtin) || labels.find((l) => l.name === 'Reminders');
  const userLabels = labels.filter((l) => l !== reminders);
  const orderedLabels = reminders ? [reminders, ...userLabels] : userLabels;
  const searching = query.trim() !== '' || searchLabel !== null;

  const visibleActive = useMemo(() => {
    let list = notes.filter((n) => !n.trashed && !n.archived);
    if (view.type === 'label') list = list.filter((n) => hasLabel(n, view.labelId));
    if (searchLabel) list = list.filter((n) => hasLabel(n, searchLabel));
    if (query.trim()) list = list.filter((n) => matchesKeyword(n, query));
    return list;
  }, [notes, view, searchLabel, query]);

  const archived = notes.filter((n) => n.archived && !n.trashed);
  const trashed = notes.filter((n) => n.trashed && isRetained(n, now));

  const chooseSuggested = (labelId) => {
    setView({ type: 'notes' });
    setSearchLabel(labelId);
    setSearchFocused(false);
  };
  const clearSearch = () => {
    setQuery('');
    setSearchLabel(null);
  };

  const showSuggestions = searchFocused && !query.trim() && searchLabel === null;
  const searchLabelName = labels.find((l) => l.id === searchLabel)?.name;

  const cardProps = {
    labels: orderedLabels,
    query: query.trim(),
    onOpen: openExisting,
    onChangeLabels: setChooserNote,
    onDelete: deleteNote,
    onRestore: restoreNote,
  };

  const renderNotesView = () => {
    const pinned = visibleActive.filter((n) => n.pinned);
    const others = visibleActive.filter((n) => !n.pinned);
    return (
      <>
        {!searching && (
          <div className="composer">
            <button type="button" ref={takeNoteRef} className="composer__button" onClick={openNew}>
              Take a note
            </button>
          </div>
        )}
        {searching && (
          <p className="results-summary">
            {visibleActive.length === 1 ? '1 matching note' : `${visibleActive.length} matching notes`}
          </p>
        )}
        <section className="note-group" aria-label="Pinned notes">
          <h2 className="note-group__title">Pinned</h2>
          {pinned.length === 0 ? (
            <p className="empty">No pinned notes</p>
          ) : (
            <div className="notes">{pinned.map((n) => <NoteCard key={n.id} note={n} mode="active" {...cardProps} />)}</div>
          )}
        </section>
        <section className="note-group" aria-label="Other notes">
          <h2 className="note-group__title">Others</h2>
          {others.length === 0 ? (
            <p className="empty">{searching ? 'No matching notes' : 'Notes you add appear here'}</p>
          ) : (
            <div className="notes">{others.map((n) => <NoteCard key={n.id} note={n} mode="active" {...cardProps} />)}</div>
          )}
        </section>
      </>
    );
  };

  const renderArchive = () => (
    <section className="note-group" aria-label="Archived notes">
      <h2 className="note-group__title">Archived</h2>
      {archived.length === 0 ? (
        <p className="empty">Your archived notes appear here</p>
      ) : (
        <div className="notes">{archived.map((n) => <NoteCard key={n.id} note={n} mode="archive" {...cardProps} query="" />)}</div>
      )}
    </section>
  );

  const renderTrash = () => (
    <>
      <div className="trash-bar">
        <p>Notes in Trash are deleted after 7 days.</p>
        <button type="button" className="text-button" onClick={emptyTrash} disabled={trashed.length === 0}>
          Empty Trash
        </button>
      </div>
      <section className="note-group" aria-label="Deleted notes">
        <h2 className="note-group__title">Trash</h2>
        {trashed.length === 0 ? (
          <p className="empty">No notes in Trash</p>
        ) : (
          <div className="notes">{trashed.map((n) => <NoteCard key={n.id} note={n} mode="trash" {...cardProps} query="" />)}</div>
        )}
      </section>
    </>
  );

  const isCurrent = (type, labelId) => view.type === type && (type !== 'label' || view.labelId === labelId);

  return (
    <div className={`app${sidebarExpanded ? '' : ' app--collapsed'}${dark ? ' app--dark' : ''}`}>
      <header className="topbar">
        <button
          type="button"
          className="icon-button"
          aria-label="Toggle sidebar"
          aria-expanded={sidebarExpanded ? 'true' : 'false'}
          aria-controls="sidebar"
          title="Main menu"
          onClick={() => setSidebarExpanded((x) => !x)}
        >
          <Icon name="menu" />
        </button>
        <h1 className="brand">
          <span className="brand__logo" aria-hidden="true" />
          Keep
        </h1>
        <div
          className={`search${searchFocused ? ' is-focused' : ''}`}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setSearchFocused(false);
          }}
        >
          <Icon name="search" />
          {searchLabelName && (
            <span className="chip chip--search">
              {searchLabelName}
            </span>
          )}
          <input
            type="search"
            className="search__input"
            aria-label="Search"
            placeholder="Search"
            value={query}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchFocused(false);
            }}
          />
          {searching && (
            <button type="button" className="icon-button icon-button--small" aria-label="Clear search" title="Clear search" onClick={clearSearch}>
              <Icon name="close" size={18} />
            </button>
          )}
          {showSuggestions && (
            <section className="suggestions" aria-label="Suggested filters" onMouseDown={(e) => e.preventDefault()}>
              <h2 className="suggestions__title">Labels</h2>
              <div className="suggestions__grid">
                {orderedLabels.map((l) => (
                  <button key={l.id} type="button" className="suggestion" onClick={() => chooseSuggested(l.id)}>
                    <Icon name={l === reminders ? 'bell' : 'label'} size={32} />
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="topbar__actions">
          <button
            type="button"
            className="icon-button"
            aria-label={layout === 'grid' ? 'List view' : 'Grid view'}
            title={layout === 'grid' ? 'List view' : 'Grid view'}
            onClick={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
          >
            <Icon name={layout === 'grid' ? 'list' : 'grid'} />
          </button>
          <SettingsMenu dark={dark} onToggleDark={() => setDark((d) => !d)} />
        </div>
      </header>

      <div className="body">
        <nav id="sidebar" className="sidebar" aria-label="Sidebar">
          <ul className="nav">
            <SidebarButton label="Notes" icon="bulb" current={isCurrent('notes')} onClick={() => selectView({ type: 'notes' })} />
            {reminders && (
              <SidebarButton
                label={reminders.name}
                icon="bell"
                current={isCurrent('label', reminders.id)}
                onClick={() => selectView({ type: 'label', labelId: reminders.id })}
              />
            )}
            {userLabels.map((l) => (
              <SidebarButton key={l.id} label={l.name} icon="label" current={isCurrent('label', l.id)} onClick={() => selectView({ type: 'label', labelId: l.id })} />
            ))}
            <SidebarButton label="Edit Labels" icon="pencil" current={false} onClick={() => setEditLabelsOpen(true)} />
            <SidebarButton label="Archived" icon="archive" current={isCurrent('archive')} onClick={() => selectView({ type: 'archive' })} />
            <SidebarButton label="Trash" icon="trash" current={isCurrent('trash')} onClick={() => selectView({ type: 'trash' })} />
          </ul>
        </nav>

        <main className={`main main--${layout}`}>
          {loadError && <p role="alert" className="empty">{loadError}</p>}
          {loaded && view.type !== 'archive' && view.type !== 'trash' && renderNotesView()}
          {loaded && view.type === 'archive' && renderArchive()}
          {loaded && view.type === 'trash' && renderTrash()}
        </main>
      </div>

      <div className="toast-area">
        <div role="status" aria-live="polite" aria-label={notice ? notice.text : undefined} className={notice ? 'toast' : 'toast toast--empty'}>
          {notice && (
            <>
              <span>{notice.text}</span>
              {notice.undo && (
                <button type="button" className="text-button text-button--light" onClick={notice.undo}>
                  Undo
                </button>
              )}
              <button type="button" className="icon-button icon-button--small" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
                <Icon name="close" size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {editor && <NoteEditor initial={editor.initial} labels={orderedLabels} onClose={closeEditor} />}
      {chooserNote && <LabelChooser labels={orderedLabels} selected={chooserNote.labels || []} onDone={saveNoteLabels} />}
      {editLabelsOpen && (
        <EditLabels labels={labels} onCreate={createLabel} onSave={renameLabel} onDelete={deleteLabel} onDone={() => setEditLabelsOpen(false)} />
      )}
    </div>
  );
}
