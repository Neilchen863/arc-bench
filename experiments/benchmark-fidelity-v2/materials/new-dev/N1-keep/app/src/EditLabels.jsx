import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';

function LabelRow({ label, onSave, onDelete }) {
  const [value, setValue] = useState(label.name);
  useEffect(() => setValue(label.name), [label.name]);
  return (
    <li className="edit-labels__row">
      <button type="button" className="icon-button icon-button--small" aria-label={`Delete label ${label.name}`} title="Delete label" onClick={() => onDelete(label)}>
        <Icon name="trash" size={18} />
      </button>
      <input
        type="text"
        className="edit-labels__input"
        aria-label={`Label name ${label.name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSave(label, value.trim())}
      />
      <button
        type="button"
        className="icon-button icon-button--small"
        aria-label={`Save label ${label.name}`}
        title="Save label"
        onClick={() => value.trim() && onSave(label, value.trim())}
      >
        <Icon name="check" size={18} />
      </button>
    </li>
  );
}

// "Edit Labels" management dialog for user labels (the default Reminders label is not editable).
export default function EditLabels({ labels, onCreate, onSave, onDelete, onDone }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.focus(), []);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onCreate(trimmed);
      setName('');
    } finally {
      setBusy(false);
    }
  };

  const userLabels = labels.filter((l) => !l.builtin);

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onDone()}>
      <div
        className="dialog edit-labels"
        role="dialog"
        aria-modal="true"
        aria-label="Edit Labels"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onDone();
          }
        }}
      >
        <h2 className="dialog__title">Edit labels</h2>
        <div className="edit-labels__row">
          <span className="icon-button icon-button--small" aria-hidden="true">
            <Icon name="plus" size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="edit-labels__input"
            aria-label="New label"
            placeholder="Create new label"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button type="button" className="icon-button icon-button--small" aria-label="Create label" title="Create label" onClick={create} disabled={busy}>
            <Icon name="check" size={18} />
          </button>
        </div>
        <ul className="edit-labels__list">
          {userLabels.map((l) => (
            <LabelRow key={l.id} label={l} onSave={onSave} onDelete={onDelete} />
          ))}
        </ul>
        <div className="dialog__actions">
          <button type="button" className="text-button" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
