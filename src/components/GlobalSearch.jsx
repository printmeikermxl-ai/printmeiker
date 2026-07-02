import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export const GlobalSearch = ({ open, onClose }) => {
  const { pedidos, cotizaciones, clientes, productos } = useStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef();
  const listRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const q = query.toLowerCase().trim();

  const results = q.length < 1 ? [] : [
    ...pedidos
      .filter(p =>
        p.cliente?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.estado?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map(p => ({
        type: 'pedido', icon: '📦',
        label: p.cliente,
        sub: `${p.id} · ${(p.estado || '').replace('_', ' ')} · ${fmt(p.total || 0)}`,
        color: '#f59e0b',
        action: () => { navigate('/pedidos'); onClose(); },
      })),
    ...cotizaciones
      .filter(c =>
        c.cliente?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.estado?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map(c => ({
        type: 'cotizacion', icon: '📋',
        label: c.cliente,
        sub: `${c.id} · ${c.estado} · ${fmt(c.total || 0)}`,
        color: '#10b981',
        action: () => { navigate('/cotizaciones'); onClose(); },
      })),
    ...clientes
      .filter(c =>
        c.nombre?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map(c => ({
        type: 'cliente', icon: '👤',
        label: c.nombre,
        sub: [c.telefono, c.email].filter(Boolean).join(' · ') || 'Sin contacto',
        color: '#6366f1',
        action: () => { navigate('/clientes'); onClose(); },
      })),
    ...productos
      .filter(p =>
        p.nombre?.toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map(p => ({
        type: 'producto', icon: '🏷️',
        label: p.nombre,
        sub: `Catálogo · ${fmt(p.precio || 0)}`,
        color: '#ec4899',
        action: () => { navigate('/catalogo'); onClose(); },
      })),
  ];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[selected]) { results[selected].action(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selected, onClose]);

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[selected];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  if (!open) return null;

  const SECTION_LABELS = {
    pedido: '📦 Pedidos',
    cotizacion: '📋 Cotizaciones',
    cliente: '👤 Clientes',
    producto: '🏷️ Catálogo',
  };

  let globalIdx = 0;
  const grouped = {};
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = [];
    grouped[r.type].push({ ...r, idx: globalIdx++ });
  }

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-panel" onClick={e => e.stopPropagation()}>
        <div className="global-search-input-row">
          <span className="global-search-icon">🔍</span>
          <input
            ref={inputRef}
            className="global-search-input"
            placeholder="Buscar pedidos, cotizaciones, clientes, productos..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button className="global-search-clear" onClick={() => setQuery('')}>✕</button>
          )}
          <kbd className="global-search-esc">ESC</kbd>
        </div>

        {q.length > 0 && (
          <div className="global-search-results" ref={listRef}>
            {results.length === 0 ? (
              <div className="global-search-empty">
                <span style={{ fontSize: 36 }}>🔎</span>
                <p>Sin resultados para <strong>"{query}"</strong></p>
                <p style={{ fontSize: 12, opacity: 0.6 }}>Intenta buscar por nombre, ID o estado</p>
              </div>
            ) : (
              Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <div className="global-search-section-label">{SECTION_LABELS[type]}</div>
                  {items.map((item) => (
                    <button
                      key={item.idx}
                      className={`global-search-item${item.idx === selected ? ' selected' : ''}`}
                      onClick={item.action}
                      onMouseEnter={() => setSelected(item.idx)}
                    >
                      <span className="global-search-item-icon" style={{ background: `${item.color}1a`, color: item.color }}>
                        {item.icon}
                      </span>
                      <div className="global-search-item-content">
                        <div className="global-search-item-label">{item.label}</div>
                        <div className="global-search-item-sub">{item.sub}</div>
                      </div>
                      <span className="global-search-item-arrow" style={{ color: item.color }}>→</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {q.length === 0 && (
          <div className="global-search-hints">
            {[
              { icon: '📦', label: 'Pedidos', hint: 'busca por cliente o ID' },
              { icon: '📋', label: 'Cotizaciones', hint: 'busca por cliente o estado' },
              { icon: '👤', label: 'Clientes', hint: 'busca por nombre, teléfono o email' },
              { icon: '🏷️', label: 'Catálogo', hint: 'busca por nombre de producto' },
            ].map(h => (
              <div key={h.label} className="global-search-hint-item">
                <span style={{ fontSize: 18 }}>{h.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{h.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{h.hint}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="global-search-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd>Esc</kbd> cerrar</span>
          {results.length > 0 && (
            <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 11 }}>
              {results.length} resultado{results.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
