import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Shelves() {
  const [shelves, setShelves] = useState(null);
  useEffect(() => {
    api.list('shelves').then(setShelves).catch(() => setShelves([]));
  }, []);
  return (
    <div className="card">
      <h1>Shelves</h1>
      <section aria-label="Shelf list" className="entity-list">
        {shelves === null ? (
          <p className="muted">Loading…</p>
        ) : shelves.length === 0 ? (
          <p className="muted">No shelves have been created.</p>
        ) : (
          <ul>
            {shelves.map((s) => (
              <li key={s.id} className="entity shelf">
                <span className="entity-name">{s.name}</span>
                {s.description && <p className="entity-desc">{s.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
