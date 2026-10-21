import { useEffect, useRef, useState } from 'react';

// "Note labels" dialog: one toggle chip per available label (variant N3), Done keeps the selection.
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
        <div className="chooser__chips" role="group" aria-label="Labels">
          {labels.map((label, i) => (
            <button
              key={label.id}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              className={`label-toggle${checked.has(label.id) ? ' is-on' : ''}`}
              aria-pressed={checked.has(label.id) ? 'true' : 'false'}
              onClick={() => toggle(label.id)}
            >
              {checked.has(label.id) ? '✓ ' : ''}{label.name}
            </button>
          ))}
        </div>
        <div className="dialog__actions">
          <button type="button" className="text-button" onClick={finish} disabled={busy}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
