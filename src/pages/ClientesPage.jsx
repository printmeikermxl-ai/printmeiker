import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusBadge } from '../components/StatusBadge';
import { FieldHelp } from '../components/FieldHelp';

// ── Etiquetas predefinidas (no se pueden eliminar) ────────────────────────────
export const ETIQUETAS_BASE = {
  vip:      { label: '⭐ VIP',      color: '#FFF3CD', text: '#856404' },
  empresa:  { label: '🏢 Empresa',  color: '#CCE5FF', text: '#004085' },
  regular:  { label: '👤 Regular',  color: '#E2E3E5', text: '#383D41' },
  nuevo:    { label: '✨ Nuevo',    color: '#D4EDDA', text: '#155724' },
  inactivo: { label: '😴 Inactivo', color: '#F8D7DA', text: '#721C24' },
};

// Colores predefinidos para etiquetas personalizadas
const COLORES_DISPONIBLES = [
  { bg: '#E8D5FF', text: '#6B21A8', label: 'Morado' },
  { bg: '#D1FAE5', text: '#065F46', label: 'Verde' },
  { bg: '#FEE2E2', text: '#991B1B', label: 'Rojo' },
  { bg: '#FEF9C3', text: '#854D0E', label: 'Amarillo' },
  { bg: '#DBEAFE', text: '#1E40AF', label: 'Azul' },
  { bg: '#FCE7F3', text: '#9D174D', label: 'Rosa' },
  { bg: '#F3F4F6', text: '#374151', label: 'Gris' },
  { bg: '#ECFDF5', text: '#166534', label: 'Menta' },
];

const EMOJIS_DISPONIBLES = ['🏷️','💼','🎨','🚀','⚡','🌟','💎','🔑','📦','🎯','🛒','🏆','💡','🎪','🌈'];

// ── EtiquetaBadge (usa base + personalizadas) ─────────────────────────────────
export const EtiquetaBadge = ({ etiqueta, etiquetasPersonalizadas = [] }) => {
  const base = ETIQUETAS_BASE[etiqueta];
  if (base) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
        background: base.color, color: base.text, whiteSpace: 'nowrap',
      }}>
        {base.label}
      </span>
    );
  }
  const custom = etiquetasPersonalizadas.find(e => e.id === etiqueta || e.nombre === etiqueta);
  if (custom) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
        background: custom.color, color: custom.text, whiteSpace: 'nowrap',
      }}>
        {custom.emoji || '🏷️'} {custom.nombre}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: '#E2E3E5', color: '#383D41', whiteSpace: 'nowrap',
    }}>
      👤 {etiqueta || 'Regular'}
    </span>
  );
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ nombre, size = 40 }) => {
  const initials = nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  const colors = [
    'linear-gradient(135deg,#c9506b,#e07a5f)',
    'linear-gradient(135deg,#219ebc,#023047)',
    'linear-gradient(135deg,#8ecae6,#219ebc)',
    'linear-gradient(135deg,#ffb703,#fb8500)',
    'linear-gradient(135deg,#6c63ff,#a855f7)',
    'linear-gradient(135deg,#10b981,#059669)',
  ];
  const bg = colors[nombre.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: size >= 60 ? 16 : 10,
      background: bg, display: 'grid', placeItems: 'center',
      color: 'white', fontWeight: 700, fontSize: size >= 60 ? 22 : 14,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

// ── Form vacío ────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  nombre: '', telefono: '', email: '',
  direccion: '', ciudad: '', estado: '',
  etiqueta: 'nuevo', notas: '',
});

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

// ── Modal para gestionar etiquetas personalizadas ─────────────────────────────
const ModalEtiquetas = ({ etiquetasPersonalizadas, onClose }) => {
  const [nueva, setNueva] = useState({ nombre: '', emoji: '🏷️', color: COLORES_DISPONIBLES[0].bg, text: COLORES_DISPONIBLES[0].text });
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleAgregar = () => {
    if (!nueva.nombre.trim()) return;
    store.addEtiqueta({ nombre: nueva.nombre.trim(), emoji: nueva.emoji, color: nueva.color, text: nueva.text });
    setNueva({ nombre: '', emoji: '🏷️', color: COLORES_DISPONIBLES[0].bg, text: COLORES_DISPONIBLES[0].text });
  };

  const handleEditar = (et) => {
    setEditandoId(et.id);
    setEditForm({ nombre: et.nombre, emoji: et.emoji || '🏷️', color: et.color, text: et.text });
  };

  const handleGuardarEdit = () => {
    if (!editForm.nombre.trim()) return;
    store.updateEtiqueta(editandoId, editForm);
    setEditandoId(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>🏷️ Gestionar categorías</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Categorías base (no editables) */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', marginBottom: 10 }}>
            CATEGORÍAS PREDEFINIDAS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {Object.entries(ETIQUETAS_BASE).map(([k, v]) => (
              <span key={k} style={{
                padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                background: v.color, color: v.text,
              }}>{v.label}</span>
            ))}
          </div>

          <div className="divider" />

          {/* Categorías personalizadas existentes */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', margin: '16px 0 12px' }}>
            MIS CATEGORÍAS ({etiquetasPersonalizadas.length})
          </div>

          {etiquetasPersonalizadas.length === 0 && (
            <div style={{ padding: '12px 0', color: 'hsl(var(--muted))', fontSize: 13, textAlign: 'center' }}>
              Sin categorías personalizadas aún. ¡Crea la primera!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {etiquetasPersonalizadas.map(et => (
              <div key={et.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, background: 'hsl(var(--bg))',
                border: '1px solid hsl(var(--border))',
              }}>
                {editandoId === et.id ? (
                  <>
                    {/* Emoji picker inline */}
                    <select
                      value={editForm.emoji}
                      onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                      style={{ fontSize: 18, border: 'none', background: 'transparent', cursor: 'pointer', width: 40 }}
                    >
                      {EMOJIS_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                    <input
                      className="form-input"
                      style={{ flex: 1, height: 34 }}
                      value={editForm.nombre}
                      onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Nombre de categoría"
                    />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {COLORES_DISPONIBLES.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setEditForm(f => ({ ...f, color: c.bg, text: c.text }))}
                          style={{
                            width: 20, height: 20, borderRadius: 99, background: c.bg,
                            border: editForm.color === c.bg ? `2px solid ${c.text}` : '2px solid transparent',
                            cursor: 'pointer',
                          }}
                          title={c.label}
                        />
                      ))}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleGuardarEdit}>✓</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditandoId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 18 }}>{et.emoji || '🏷️'}</span>
                    <span style={{
                      flex: 1, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                      background: et.color, color: et.text, display: 'inline-block',
                    }}>
                      {et.nombre}
                    </span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEditar(et)}>✏️</button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'hsl(var(--danger))' }}
                      onClick={() => store.deleteEtiqueta(et.id)}
                    >🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Crear nueva etiqueta */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', margin: '16px 0 12px' }}>
            + NUEVA CATEGORÍA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', background: 'hsl(var(--bg))', borderRadius: 10, border: '1px dashed hsl(var(--border))' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={nueva.emoji}
                onChange={e => setNueva(f => ({ ...f, emoji: e.target.value }))}
                style={{ fontSize: 20, border: 'none', background: 'transparent', cursor: 'pointer', width: 44 }}
              >
                {EMOJIS_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={nueva.nombre}
                onChange={e => setNueva(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre de la categoría (ej. Mayorista, Diseñador...)"
                onKeyDown={e => e.key === 'Enter' && handleAgregar()}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>Color:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORES_DISPONIBLES.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setNueva(f => ({ ...f, color: c.bg, text: c.text }))}
                    style={{
                      width: 22, height: 22, borderRadius: 99, background: c.bg,
                      border: nueva.color === c.bg ? `2px solid ${c.text}` : '2px solid transparent',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                    title={c.label}
                  />
                ))}
              </div>
              {/* Preview */}
              {nueva.nombre && (
                <span style={{
                  padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: nueva.color, color: nueva.text,
                }}>
                  {nueva.emoji} {nueva.nombre}
                </span>
              )}
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={handleAgregar}
              disabled={!nueva.nombre.trim()}
            >
              + Agregar categoría
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>✓ Listo</button>
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export const ClientesPage = () => {
  const { clientes, pedidos, cotizaciones, etiquetasPersonalizadas } = useStore();
  const [search, setSearch] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todos');
  const [ordenAlfabetico, setOrdenAlfabetico] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'view' | 'etiquetas'
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [view, setView] = useState('grid'); // 'grid' | 'table'

  // Todas las etiquetas disponibles (base + personalizadas)
  const todasEtiquetas = {
    ...ETIQUETAS_BASE,
    ...Object.fromEntries(
      etiquetasPersonalizadas.map(e => [
        e.id,
        { label: `${e.emoji || '🏷️'} ${e.nombre}`, color: e.color, text: e.text }
      ])
    )
  };

  // ── Filtros ──────────────────────────────────────────────────────────────────
  let filtered = clientes.filter(c => {
    const q = search.toLowerCase();
    const matchSearch =
      c.nombre.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefono?.includes(q) ||
      c.ciudad?.toLowerCase().includes(q);
    const matchEtiqueta = filtroEtiqueta === 'todos' || c.etiqueta === filtroEtiqueta;
    return matchSearch && matchEtiqueta;
  });

  if (ordenAlfabetico) {
    filtered = [...filtered].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  // ── Métricas por cliente ─────────────────────────────────────────────────────
  const getClienteStats = (nombreCliente) => {
    const pedidosCliente = pedidos.filter(p => p.cliente === nombreCliente);
    const cotizacionesCliente = cotizaciones.filter(c => c.cliente === nombreCliente);
    const totalGastado = pedidosCliente
      .filter(p => p.estado === 'completado')
      .reduce((s, p) => s + p.total, 0);
    const ultimoPedido = pedidosCliente
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
    return {
      totalPedidos: pedidosCliente.length,
      totalCotizaciones: cotizacionesCliente.length,
      totalGastado,
      ultimoPedido: ultimoPedido?.fecha || null,
      pedidosActivos: pedidosCliente.filter(p => ['pendiente', 'en_proceso', 'listo'].includes(p.estado)).length,
    };
  };

  // ── Acciones ─────────────────────────────────────────────────────────────────
  const openCreate = () => { setForm(emptyForm()); setEditId(null); setModal('create'); };
  const openEdit = (c) => { setForm({ ...c }); setEditId(c.id); setModal('edit'); };
  const openView = (c) => { setForm({ ...c }); setEditId(c.id); setModal('view'); };

  const handleSave = (e) => {
    e.preventDefault();
    if (editId) store.updateCliente(editId, form);
    else store.addCliente(form);
    setModal(null);
  };

  const handleDelete = (id) => setConfirm({ id });
  const confirmDelete = () => {
    store.deleteCliente(confirm.id);
    setConfirm(null);
    if (modal) setModal(null);
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Stats globales ────────────────────────────────────────────────────────────
  const totalVIP = clientes.filter(c => c.etiqueta === 'vip').length;
  const totalEmpresas = clientes.filter(c => c.etiqueta === 'empresa').length;
  const totalNuevos = clientes.filter(c => c.etiqueta === 'nuevo').length;
  const clienteTopGasto = clientes
    .map(c => ({ ...c, stats: getClienteStats(c.nombre) }))
    .sort((a, b) => b.stats.totalGastado - a.stats.totalGastado)[0];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">👥 Clientes</h2>
          <p className="page-subtitle">{clientes.length} clientes registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`btn ${view === 'grid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('grid')}>⊞ Tarjetas</button>
          <button className={`btn ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('table')}>☰ Lista</button>
          <button className="btn btn-secondary" onClick={() => setModal('etiquetas')} title="Gestionar categorías">🏷️ Categorías</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Nuevo cliente</button>
        </div>
      </div>

      {/* Stat mini-cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{clientes.length}</div>
            <div className="stat-label">Total clientes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <div className="stat-value">{totalVIP}</div>
            <div className="stat-label">Clientes VIP</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <div className="stat-value">{totalEmpresas}</div>
            <div className="stat-label">Empresas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✨</div>
          <div className="stat-info">
            <div className="stat-value">{totalNuevos}</div>
            <div className="stat-label">Nuevos</div>
          </div>
        </div>
        {clienteTopGasto && (
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <div className="stat-value" style={{ fontSize: 14, lineHeight: 1.3 }}>{clienteTopGasto.nombre.split(' ')[0]}</div>
              <div className="stat-label">Mejor cliente</div>
              <div className="stat-change up">{fmt(clienteTopGasto.stats.totalGastado)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span>🔍</span>
          <input
            placeholder="Buscar por nombre, email, ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Orden alfabético */}
          <button
            className={`btn btn-sm ${ordenAlfabetico ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setOrdenAlfabetico(!ordenAlfabetico)}
            title="Ordenar A-Z"
            style={{ fontWeight: 700, fontSize: 13 }}
          >
            A→Z
          </button>
          <div className="tabs">
            <button className={`tab ${filtroEtiqueta === 'todos' ? 'active' : ''}`} onClick={() => setFiltroEtiqueta('todos')}>Todos</button>
            {Object.entries(ETIQUETAS_BASE).map(([k, v]) => (
              <button key={k} className={`tab ${filtroEtiqueta === k ? 'active' : ''}`} onClick={() => setFiltroEtiqueta(k)}>
                {v.label}
              </button>
            ))}
            {etiquetasPersonalizadas.map(et => (
              <button key={et.id} className={`tab ${filtroEtiqueta === et.id ? 'active' : ''}`} onClick={() => setFiltroEtiqueta(et.id)}>
                {et.emoji || '🏷️'} {et.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>Sin clientes</h3>
          <p>Agrega tu primer cliente para llevar un mejor control de tus ventas.</p>
          <button className="btn btn-primary" onClick={openCreate}>Agregar cliente</button>
        </div>
      )}

      {/* ── GRID VIEW ─────────────────────────────────────────────────────────── */}
      {filtered.length > 0 && view === 'grid' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(c => {
            const stats = getClienteStats(c.nombre);
            return (
              <div
                key={c.id}
                className="card"
                style={{
                  padding: 0, overflow: 'hidden', cursor: 'pointer',
                  transition: 'all .2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                onClick={() => openView(c)}
              >
                {/* Card top strip */}
                <div style={{
                  height: 6,
                  background: c.etiqueta === 'vip' ? 'linear-gradient(90deg,#c9506b,#ffb703)'
                    : c.etiqueta === 'empresa' ? 'linear-gradient(90deg,#219ebc,#023047)'
                    : c.etiqueta === 'nuevo' ? 'linear-gradient(90deg,#10b981,#059669)'
                    : 'hsl(var(--primary-light))',
                }} />

                <div style={{ padding: '18px 20px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                    <Avatar nombre={c.nombre} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{c.nombre}</div>
                      <EtiquetaBadge etiqueta={c.etiqueta} etiquetasPersonalizadas={etiquetasPersonalizadas} />
                    </div>
                    {stats.pedidosActivos > 0 && (
                      <span style={{
                        background: 'hsl(var(--primary))', color: 'white',
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                      }}>
                        {stats.pedidosActivos} activo{stats.pedidosActivos > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Contact info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                    {c.telefono && (
                      <div style={{ fontSize: 13, color: 'hsl(var(--muted))', display: 'flex', gap: 6, alignItems: 'center' }}>
                        📱 {c.telefono}
                      </div>
                    )}
                    {c.email && (
                      <div style={{ fontSize: 13, color: 'hsl(var(--muted))', display: 'flex', gap: 6, alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ✉️ {c.email}
                      </div>
                    )}
                    {c.ciudad && (
                      <div style={{ fontSize: 13, color: 'hsl(var(--muted))', display: 'flex', gap: 6, alignItems: 'center' }}>
                        📍 {c.ciudad}{c.estado ? `, ${c.estado}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Stats mini */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8, background: 'hsl(var(--bg))', borderRadius: 8, padding: '10px 12px',
                    marginBottom: 14,
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{stats.totalPedidos}</div>
                      <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginTop: 1 }}>Pedidos</div>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid hsl(var(--border))', borderRight: '1px solid hsl(var(--border))' }}>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{stats.totalCotizaciones}</div>
                      <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginTop: 1 }}>Cotiz.</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: 'hsl(var(--primary))' }}>
                        {stats.totalGastado > 0 ? `$${(stats.totalGastado / 1000).toFixed(1)}k` : '$0'}
                      </div>
                      <div style={{ fontSize: 10, color: 'hsl(var(--muted))', marginTop: 1 }}>Compras</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => openEdit(c)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openView(c)}
                    >
                      👁️ Ver
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDelete(c.id)}
                      style={{ color: 'hsl(var(--danger))' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ────────────────────────────────────────────────────────── */}
      {filtered.length > 0 && view === 'table' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Categoría</th>
                <th>Contacto</th>
                <th>Ciudad</th>
                <th>Pedidos</th>
                <th>Total compras</th>
                <th>Último pedido</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const stats = getClienteStats(c.nombre);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar nombre={c.nombre} size={34} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                          <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>Desde {c.fechaRegistro}</div>
                        </div>
                      </div>
                    </td>
                    <td><EtiquetaBadge etiqueta={c.etiqueta} etiquetasPersonalizadas={etiquetasPersonalizadas} /></td>
                    <td>
                      {c.telefono && <div style={{ fontSize: 13 }}>📱 {c.telefono}</div>}
                      {c.email && <div style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>✉️ {c.email}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{c.ciudad || '—'}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{stats.totalPedidos}</span>
                      {stats.pedidosActivos > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: 'hsl(var(--primary))' }}>
                          ({stats.pedidosActivos} activo)
                        </span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: stats.totalGastado > 0 ? 'hsl(var(--success))' : 'hsl(var(--muted))' }}>
                        {fmt(stats.totalGastado)}
                      </strong>
                    </td>
                    <td style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>
                      {stats.ultimoPedido || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openView(c)}>👁️</button>
                        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(c.id)} style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL CREATE / EDIT ─────────────────────────────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nuevo cliente' : '✏️ Editar cliente'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* Avatar preview */}
                {form.nombre && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', background: 'hsl(var(--bg))', borderRadius: 10 }}>
                    <Avatar nombre={form.nombre || 'C'} size={52} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{form.nombre || 'Nuevo cliente'}</div>
                      <EtiquetaBadge etiqueta={form.etiqueta} etiquetasPersonalizadas={etiquetasPersonalizadas} />
                    </div>
                  </div>
                )}

                {/* Etiqueta/Categoría */}
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="form-label" style={{ margin: 0 }}>Categoría</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => setModal('etiquetas-inline')}
                    >
                      🏷️ Gestionar categorías
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(ETIQUETAS_BASE).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => set('etiqueta', k)}
                        style={{
                          padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                          border: `2px solid ${form.etiqueta === k ? v.text : 'transparent'}`,
                          background: v.color, color: v.text, cursor: 'pointer',
                          transition: 'all .15s ease',
                          transform: form.etiqueta === k ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        {v.label}
                      </button>
                    ))}
                    {etiquetasPersonalizadas.map(et => (
                      <button
                        key={et.id}
                        type="button"
                        onClick={() => set('etiqueta', et.id)}
                        style={{
                          padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                          border: `2px solid ${form.etiqueta === et.id ? et.text : 'transparent'}`,
                          background: et.color, color: et.text, cursor: 'pointer',
                          transition: 'all .15s ease',
                          transform: form.etiqueta === et.id ? 'scale(1.05)' : 'scale(1)',
                        }}
                      >
                        {et.emoji || '🏷️'} {et.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divider" />

                {/* Datos personales */}
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'hsl(var(--muted))' }}>👤 DATOS PERSONALES</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      Nombre completo *
                      <FieldHelp text="Nombre del cliente individual o razón social de la empresa." example="Juan Pérez" />
                    </label>
                    <input className="form-input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del cliente o empresa" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Teléfono
                      <FieldHelp text="Número de contacto del cliente." example="555-123-4567" />
                    </label>
                    <input className="form-input" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="555-0000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Email
                      <FieldHelp text="Correo del cliente para cotizaciones y comprobantes." example="correo@ejemplo.com" />
                    </label>
                    <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
                  </div>
                </div>

                <div className="divider" />

                {/* Dirección */}
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'hsl(var(--muted))' }}>📍 DIRECCIÓN</div>
                <div className="form-group">
                  <label className="form-label">
                    Calle y número
                    <FieldHelp text="Calle, número de local o casa y colonia." example="Av. Juárez 123, Col. Centro" />
                  </label>
                  <input className="form-input" value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Calle, número, colonia" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      Ciudad / Municipio
                      <FieldHelp text="Ciudad, municipio o localidad de residencia del cliente." />
                    </label>
                    <input className="form-input" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} placeholder="" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Estado
                      <FieldHelp text="Estado, provincia o región del cliente." />
                    </label>
                    <input className="form-input" value={form.estado} onChange={e => set('estado', e.target.value)} placeholder="" />
                  </div>
                </div>

                <div className="divider" />

                <div className="form-group">
                  <label className="form-label">📝 Notas internas</label>
                  <textarea
                    className="form-textarea"
                    value={form.notas}
                    onChange={e => set('notas', e.target.value)}
                    placeholder="Observaciones, preferencias, persona de contacto..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                {editId && (
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(editId)} style={{ marginRight: 'auto' }}>
                    🗑️ Eliminar
                  </button>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {modal === 'create' ? '✓ Crear cliente' : '✓ Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL VIEW (perfil completo) ────────────────────────────────────── */}
      {modal === 'view' && (() => {
        const stats = getClienteStats(form.nombre);
        const pedidosCliente = pedidos
          .filter(p => p.cliente === form.nombre)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        const cotizacionesCliente = cotizaciones
          .filter(c => c.cliente === form.nombre)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        return (
          <div className="modal-overlay">
            <div className="modal modal-lg" style={{ maxWidth: 680 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar nombre={form.nombre} size={44} />
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800 }}>{form.nombre}</h2>
                    <EtiquetaBadge etiqueta={form.etiqueta} etiquetasPersonalizadas={etiquetasPersonalizadas} />
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
              </div>

              <div className="modal-body">
                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    { icon: '📦', label: 'Pedidos', value: stats.totalPedidos },
                    { icon: '📋', label: 'Cotizaciones', value: stats.totalCotizaciones },
                    { icon: '💰', label: 'Total compras', value: fmt(stats.totalGastado), primary: true },
                  ].map(m => (
                    <div key={m.label} style={{
                      background: 'hsl(var(--bg))', borderRadius: 10, padding: '14px 16px', textAlign: 'center',
                      border: '1px solid hsl(var(--border))',
                    }}>
                      <div style={{ fontSize: 22 }}>{m.icon}</div>
                      <div style={{ fontSize: m.primary ? 15 : 22, fontWeight: 800, color: m.primary ? 'hsl(var(--primary))' : 'hsl(var(--foreground))', marginTop: 4 }}>
                        {m.value}
                      </div>
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 2 }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Datos de contacto */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header" style={{ paddingTop: 14, paddingBottom: 10 }}>
                    <span>📋</span>
                    <span className="card-title">Información de contacto</span>
                  </div>
                  <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      ['📱 Teléfono', form.telefono || '—'],
                      ['✉️ Email', form.email || '—'],
                      ['📍 Dirección', form.direccion || '—'],
                      ['🏙️ Ciudad', form.ciudad ? `${form.ciudad}${form.estado ? ', ' + form.estado : ''}` : '—'],
                      ['📅 Cliente desde', form.fechaRegistro || '—'],
                      ['🕐 Último pedido', stats.ultimoPedido || 'Sin pedidos'],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: 11, color: 'hsl(var(--muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
                        <div style={{ fontSize: 14, marginTop: 3, fontWeight: 500 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  {form.notas && (
                    <>
                      <div className="divider" style={{ margin: '4px 20px' }} />
                      <div style={{ padding: '8px 20px 16px' }}>
                        <div style={{ fontSize: 11, color: 'hsl(var(--muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>📝 Notas</div>
                        <div style={{ fontSize: 14 }}>{form.notas}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Historial pedidos */}
                {pedidosCliente.length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header" style={{ paddingTop: 14, paddingBottom: 10 }}>
                      <span>📦</span>
                      <span className="card-title">Historial de pedidos</span>
                    </div>
                    <div>
                      {pedidosCliente.slice(0, 4).map(p => (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 20px', borderBottom: '1px solid hsl(var(--border))',
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'hsl(var(--primary-light))', display: 'grid', placeItems: 'center',
                            fontSize: 14, flexShrink: 0,
                          }}>📦</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.id} — {p.fecha}</div>
                            <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                              {p.productos?.map(pr => pr.nombre).join(', ')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{fmt(p.total)}</div>
                            <StatusBadge status={p.estado} />
                          </div>
                        </div>
                      ))}
                      {pedidosCliente.length > 4 && (
                        <div style={{ padding: '10px 20px', fontSize: 13, color: 'hsl(var(--muted))', textAlign: 'center' }}>
                          +{pedidosCliente.length - 4} pedidos más
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Historial cotizaciones */}
                {cotizacionesCliente.length > 0 && (
                  <div className="card">
                    <div className="card-header" style={{ paddingTop: 14, paddingBottom: 10 }}>
                      <span>📋</span>
                      <span className="card-title">Cotizaciones</span>
                    </div>
                    <div>
                      {cotizacionesCliente.slice(0, 3).map(c => (
                        <div key={c.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 20px', borderBottom: '1px solid hsl(var(--border))',
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: '#CCE5FF', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0,
                          }}>📋</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.id} — {c.fecha}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{fmt(c.total)}</div>
                            <StatusBadge status={c.estado} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
                <button className="btn btn-primary" onClick={() => openEdit({ ...form, id: editId })}>✏️ Editar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL ETIQUETAS ─────────────────────────────────────────────────── */}
      {(modal === 'etiquetas' || modal === 'etiquetas-inline') && (
        <ModalEtiquetas
          etiquetasPersonalizadas={etiquetasPersonalizadas}
          onClose={() => {
            if (modal === 'etiquetas-inline') setModal('create');
            else setModal(null);
          }}
        />
      )}

      {/* Confirm delete */}
      {confirm && (
        <ConfirmDialog
          title="¿Eliminar cliente?"
          message="Se eliminará del catálogo. Sus pedidos y cotizaciones se conservarán."
          icon="👥"
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};
