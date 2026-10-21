import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { COLORS, colorValue } from './colors.js';
import { formatDate } from './dates.js';
import LabelChooser from './LabelChooser.jsx';

// "Note editor" dialog used both for new notes and for editing existing ones.
// There is no Save button: Close (or Escape / clicking outside) autosaves.
export default function NoteEditor({ initial, labels, onClose }) {
  const [draft, setDraft] = useState(initial);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (initial.id) contentRef.current?.focus();
    else titleRef.current?.focus();
  }, [initial.id]);

  const update = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const close = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await onClose(draft);
    } catch (e) {
      setError('Could not save the note. Please try again.');
      setSaving(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (paletteOpen) setPaletteOpen(false);
      else close();
    }
  };

  const assigned = labels.filter((l) => (draft.labels || []).includes(l.id));

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        className="dialog editor"
        role="dialog"
        aria-modal="true"
        aria-label="Note editor"
        style={{ background: colorValue(draft.color) }}
        onKeyDown={onKeyDown}
      >
        <div className="editor__head">
          <input
            ref={titleRef}
            className="editor__title"
            type="text"
            aria-label="Title"
            placeholder="Title"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
          />
          <button
            type="button"
            className={`icon-button${draft.pinned ? ' is-on' : ''}`}
            aria-label="Pin note"
            aria-pressed={draft.pinned ? 'true' : 'false'}
            title={draft.pinned ? 'Unpin note' : 'Pin note'}
            onClick={() => update({ pinned: !draft.pinned })}
          >
            <Icon name="pin" />
          </button>
        </div>
        <textarea
          ref={contentRef}
          className="editor__content"
          aria-label="Content"
          placeholder="Take a note…"
          rows={5}
          value={draft.content}
          onChange={(e) => update({ content: e.target.value })}
        />
        {assigned.length > 0 && (
          <ul className="chips" aria-label="Labels">
            {assigned.map((l) => (
              <li key={l.id} className="chip">{l.name}</li>
            ))}
          </ul>
        )}
        {draft.editedAt && <p className="editor__meta">Edited {formatDate(draft.editedAt)}</p>}
        {error && <p className="editor__error" role="alert">{error}</p>}
        <div className="editor__toolbar">
          <div className="toolbar__group">
            <button
              type="button"
              className="icon-button"
              aria-label="Background color"
              aria-expanded={paletteOpen ? 'true' : 'false'}
              title="Background color"
              onClick={() => setPaletteOpen((o) => !o)}
            >
              <Icon name="palette" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Change labels"
              title="Change labels"
              onClick={() => setChooserOpen(true)}
            >
              <Icon name="label" />
            </button>
          </div>
          <button type="button" className="text-button" onClick={close} disabled={saving}>
            Close
          </button>
        </div>
        {paletteOpen && (
          <div className="palette" role="group" aria-label="Background colors">
            {COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`swatch${draft.color === c.id ? ' is-selected' : ''}`}
                style={{ background: c.value }}
                aria-label={c.name}
                aria-pressed={draft.color === c.id ? 'true' : 'false'}
                title={c.name}
                onClick={() => {
                  update({ color: c.id });
                  setPaletteOpen(false);
                }}
              />
            ))}
          </div>
        )}
      </div>
      {chooserOpen && (
        <LabelChooser
          labels={labels}
          selected={draft.labels || []}
          onDone={(ids) => {
            update({ labels: ids });
            setChooserOpen(false);
          }}
        />
      )}
    </div>
  );
}
