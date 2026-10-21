import { useEffect, useRef, useState } from 'react';

// "Note labels" dialog: one checkbox per available label, Done keeps the selection.
export default function LabelChooser({ labels, selected, onDone }) {
  const [checked, setChecked] = useState(() => new Set(selected));
  const [busy, setBusy] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const toggle = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    // Keep label order stable (as listed), independent of click order.
    await onDone(labels.filter((l) => checked.has(l.id)).map((l) => l.id));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      finish();
    }
  };

  return (
    <div className="backdrop backdrop--top" onMouseDown={(e) => e.target === e.currentTarget && finish()}>
      <div className="dialog chooser" role="dialog" aria-modal="true" aria-label="Note labels" onKeyDown={onKeyDown}>
        <h2 className="dialog__title">Label note</h2>
        <ul className="chooser__list">
          {labels.map((label, i) => (
            <li key={label.id}>
              <label className="chooser__item">
                <input
                  ref={i === 0 ? firstRef : undefined}
                  type="checkbox"
                  checked={checked.has(label.id)}
                  onChange={() => toggle(label.id)}
                />
                <span>{label.name}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="dialog__actions">
          <button type="button" className="text-button" onClick={finish} disabled={busy}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
