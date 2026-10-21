import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { colorValue } from './colors.js';
import Highlighted from './Highlighted.jsx';

// One note, exposed as a region named by its visible title.
export default function NoteCard({ note, labels, query, mode, onOpen, onChangeLabels, onDelete, onRestore }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const moreRef = useRef(null);
  const title = note.title || '';
  const name = title || 'Untitled note';
  const noteLabels = labels.filter((l) => (note.labels || []).includes(l.id));
  const active = mode === 'active';

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !moreRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const onMenuKey = (e) => {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      setMenuOpen(false);
      moreRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    }
  };

  const choose = (fn) => {
    setMenuOpen(false);
    fn();
  };

  return (
    <section
      className="note"
      aria-label={name}
      style={{ background: colorValue(note.color) }}
      onClick={(e) => {
        if (active && !e.target.closest('button, [role="menu"]')) onOpen(note);
      }}
    >
      {title && (
        <h3 className="note__title">
          <Highlighted text={title} query={query} />
        </h3>
      )}
      {note.content && (
        <p className="note__content">
          <Highlighted text={note.content} query={query} />
        </p>
      )}
      {noteLabels.length > 0 && (
        <ul className="chips" aria-label={`Labels of ${name}`}>
          {noteLabels.map((l) => (
            <li key={l.id} className="chip">{l.name}</li>
          ))}
        </ul>
      )}
      <div className="note__actions">
        {active ? (
          <>
            <button type="button" className="icon-button icon-button--small" aria-label={`Open ${name}`} title="Open note" onClick={() => onOpen(note)}>
              <Icon name="edit" size={18} />
            </button>
            <span className="note__menu-wrap">
              <button
                ref={moreRef}
                type="button"
                className="icon-button icon-button--small"
                aria-label={`More options ${name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen ? 'true' : 'false'}
                title="More options"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <Icon name="more" size={18} />
              </button>
              {menuOpen && (
                <div ref={menuRef} className="menu" role="menu" aria-label={`Options for ${name}`} onKeyDown={onMenuKey}>
                  <button type="button" role="menuitem" className="menu__item" onClick={() => choose(() => onDelete(note))}>
                    Delete Note
                  </button>
                  <button type="button" role="menuitem" className="menu__item" onClick={() => choose(() => onChangeLabels(note))}>
                    Change labels
                  </button>
                </div>
              )}
            </span>
          </>
        ) : mode === 'trash' ? (
          <button type="button" className="icon-button icon-button--small" aria-label={`Restore ${name}`} title="Restore" onClick={() => onRestore(note)}>
            <Icon name="restore" size={18} />
          </button>
        ) : mode === 'archive' ? (
          <button type="button" className="icon-button icon-button--small" aria-label={`Unarchive ${name}`} title="Unarchive" onClick={() => onRestore(note)}>
            <Icon name="archive" size={18} />
          </button>
        ) : null}
      </div>
    </section>
  );
}
