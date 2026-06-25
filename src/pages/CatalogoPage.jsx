import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { ConfirmDialog } from '../components/ConfirmDialog';

// Paleta de colores disponibles para categorías
const PALETA_COLORES = [
  { bg: '#DBEAFE', text: '#1E40AF', label: 'Azul' },
  { bg: '#D1FAE5', text: '#065F46', label: 'Verde' },
  { bg: '#FEE2E2', text: '#991B1B', label: 'Rojo' },
  { bg: '#FCE7F3', text: '#9D174D', label: 'Rosa' },
  { bg: '#E8D5FF', text: '#6B21A8', label: 'Morado' },
  { bg: '#FEF9C3', text: '#854D0E', label: 'Amarillo' },
  { bg: '#F3F4F6', text: '#374151', label: 'Gris' },
  { bg: '#ECFDF5', text: '#166534', label: 'Menta' },
  { bg: '#FFF7ED', text: '#9A3412', label: 'Naranja' },
  { bg: '#F0F9FF', text: '#0C4A6E', label: 'Celeste' },
];

const EMOJIS_DISPONIBLES = [
  '🖨️','🎌','🌡️','🧵','🎨','💻','📦','✂️','🏷️','📐',
  '🎯','🖼️','📸','🧩','⚡','🌟','💎','🔧','🎪','🚀',
  '📱','🛒','🖋️','📋','🗂️','💡','🎭','🏆','🌈','✨',
];

// ── Chip de categoría ─────────────────────────────────────────────────────────
export const CategoriaBadge = ({ nombre, categorias = [] }) => {
  const cat = categorias.find(c => c.nombre === nombre);
  if (!cat) return (
    <span style={{
      padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: '#F3F4F6', color: '#374151',
    }}>📦 {nombre || 'Sin categoría'}</span>
  );
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: cat.color, color: cat.text,
    }}>{cat.emoji} {cat.nombre}</span>
  );
};

// ── Modal de gestión de categorías ───────────────────────────────────────────
const ModalCategorias = ({ categorias, onClose }) => {
  const [nuevaNombre, setNuevaNombre] = useState('');
  const [nuevoEmoji, setNuevoEmoji] = useState('📦');
  const [nuevoColor, setNuevoColor] = useState(PALETA_COLORES[0]);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmReset, setConfirmReset] = useState(false);

  const handleAgregar = () => {
    if (!nuevaNombre.trim()) return;
    store.addCategoriaProducto({
      nombre: nuevaNombre.trim(),
      emoji: nuevoEmoji,
      color: nuevoColor.bg,
      text: nuevoColor.text,
    });
    setNuevaNombre('');
    setNuevoEmoji('📦');
    setNuevoColor(PALETA_COLORES[0]);
  };

  const handleEditar = (cat) => {
    setEditandoId(cat.id);
    const colorMatch = PALETA_COLORES.find(c => c.bg === cat.color) || PALETA_COLORES[0];
    setEditForm({ nombre: cat.nombre, emoji: cat.emoji || '📦', colorObj: colorMatch });
  };

  const handleGuardarEdit = () => {
    if (!editForm.nombre.trim()) return;
    store.updateCategoriaProducto(editandoId, {
      nombre: editForm.nombre.trim(),
      emoji: editForm.emoji,
      color: editForm.colorObj.bg,
      text: editForm.colorObj.text,
    });
    setEditandoId(null);
  };

  const preview = nuevaNombre.trim()
    ? <span style={{ padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: nuevoColor.bg, color: nuevoColor.text }}>{nuevoEmoji} {nuevaNombre}</span>
    : null;

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2>📂 Gestionar categorías de productos</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

          {/* Lista de categorías */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', marginBottom: 12, letterSpacing: '.04em' }}>
            CATEGORÍAS ({categorias.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {categorias.map(cat => (
              <div key={cat.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'hsl(var(--bg))', border: '1px solid hsl(var(--border))',
                transition: 'box-shadow .15s',
              }}>
                {editandoId === cat.id ? (
                  /* ── Modo edición inline ── */
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {/* Emoji picker */}
                      <select
                        value={editForm.emoji}
                        onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                        style={{ fontSize: 20, border: '1px solid hsl(var(--border))', borderRadius: 6, background: 'hsl(var(--card))', padding: '4px 6px', cursor: 'pointer', width: 56 }}
                      >
                        {EMOJIS_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                      <input
                        className="form-input"
                        style={{ flex: 1, height: 38 }}
                        value={editForm.nombre}
                        onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                        placeholder="Nombre de la categoría"
                        onKeyDown={e => e.key === 'Enter' && handleGuardarEdit()}
                        autoFocus
                      />
                    </div>
                    {/* Paleta de colores */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted))', flexShrink: 0 }}>Color:</span>
                      {PALETA_COLORES.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => setEditForm(f => ({ ...f, colorObj: c }))}
                          title={c.label}
                          style={{
                            width: 22, height: 22, borderRadius: '50%', background: c.bg,
                            border: editForm.colorObj?.bg === c.bg ? `3px solid ${c.text}` : '2px solid transparent',
                            cursor: 'pointer', flexShrink: 0,
                          }}
                        />
                      ))}
                      {/* Preview */}
                      {editForm.nombre && (
                        <span style={{
                          padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                          background: editForm.colorObj?.bg, color: editForm.colorObj?.text, marginLeft: 4,
                        }}>
                          {editForm.emoji} {editForm.nombre}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={handleGuardarEdit}>✓ Guardar</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditandoId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  /* ── Modo vista ── */
                  <>
                    <span style={{
                      padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                      background: cat.color, color: cat.text, flex: 1,
                    }}>
                      {cat.emoji} {cat.nombre}
                    </span>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleEditar(cat)}
                      title="Editar"
                    >✏️</button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'hsl(var(--danger))' }}
                      onClick={() => store.deleteCategoriaProducto(cat.id)}
                      title="Eliminar"
                    >🗑️</button>
                  </>
                )}
              </div>
            ))}

            {categorias.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'hsl(var(--muted))', fontSize: 13 }}>
                Sin categorías. ¡Crea la primera o restablece las predefinidas!
              </div>
            )}
          </div>

          {/* ── Crear nueva categoría ── */}
          <div style={{
            padding: '16px', borderRadius: 12,
            border: '2px dashed hsl(var(--border))',
            background: 'hsl(var(--bg))',
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', marginBottom: 12, letterSpacing: '.04em' }}>
              + NUEVA CATEGORÍA
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              {/* Emoji */}
              <select
                value={nuevoEmoji}
                onChange={e => setNuevoEmoji(e.target.value)}
                style={{ fontSize: 20, border: '1px solid hsl(var(--border))', borderRadius: 6, background: 'hsl(var(--card))', padding: '4px 6px', cursor: 'pointer', width: 56 }}
              >
                {EMOJIS_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={nuevaNombre}
                onChange={e => setNuevaNombre(e.target.value)}
                placeholder="Nombre de la categoría (ej. Viniles, Textil...)"
                onKeyDown={e => e.key === 'Enter' && handleAgregar()}
              />
            </div>

            {/* Paleta */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'hsl(var(--muted))', flexShrink: 0 }}>Color:</span>
              {PALETA_COLORES.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setNuevoColor(c)}
                  title={c.label}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c.bg,
                    border: nuevoColor.bg === c.bg ? `3px solid ${c.text}` : '2px solid transparent',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                />
              ))}
              {preview && <span style={{ marginLeft: 6 }}>{preview}</span>}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleAgregar}
              disabled={!nuevaNombre.trim()}
              style={{ opacity: !nuevaNombre.trim() ? 0.5 : 1 }}
            >
              + Agregar categoría
            </button>
          </div>

          {/* ── Restablecer ── */}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12, color: 'hsl(var(--muted))' }}
              onClick={() => setConfirmReset(true)}
            >
              🔄 Restablecer categorías predefinidas
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>✓ Listo</button>
        </div>
      </div>

      {confirmReset && (
        <ConfirmDialog
          title="¿Restablecer categorías?"
          message="Se reemplazarán todas las categorías actuales con las 7 predefinidas (Impresión, Banners, Sublimación, Bordado, Diseño, Digital, Otro). Esta acción no se puede deshacer."
          icon="🔄"
          onConfirm={() => { store.resetCategoriasProducto(); setConfirmReset(false); }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
};

// ── Selector de categoría (usado en el form de producto) ─────────────────────
const SelectorCategoria = ({ value, onChange, categorias, onGestionar }) => {
  const [open, setOpen] = useState(false);
  const cat = categorias.find(c => c.nombre === value);

  return (
    <div style={{ position: 'relative' }}>
      {/* Botón que muestra la categoría seleccionada */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
          border: open ? '2px solid hsl(var(--primary))' : '1.5px solid hsl(var(--border))',
          background: 'hsl(var(--card))', transition: 'border-color .15s',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          {cat ? (
            <span style={{
              padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: cat.color, color: cat.text,
            }}>{cat.emoji} {cat.nombre}</span>
          ) : (
            <span style={{ color: 'hsl(var(--muted))', fontSize: 13 }}>Seleccionar categoría</span>
          )}
        </span>
        <span style={{ fontSize: 10, color: 'hsl(var(--muted))', transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 999, top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'hsl(var(--card))', border: '1.5px solid hsl(var(--border))',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          overflow: 'hidden',
        }}>
          {/* Opciones */}
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {categorias.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.nombre); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left', transition: 'background .1s',
                  borderBottom: '1px solid hsl(var(--border))',
                  background: c.nombre === value ? 'hsl(var(--primary-light))' : 'transparent',
                }}
                onMouseEnter={e => { if (c.nombre !== value) e.currentTarget.style.background = 'hsl(var(--bg))'; }}
                onMouseLeave={e => { if (c.nombre !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: c.color, color: c.text, whiteSpace: 'nowrap',
                }}>
                  {c.emoji} {c.nombre}
                </span>
                {c.nombre === value && <span style={{ marginLeft: 'auto', color: 'hsl(var(--primary))', fontWeight: 700 }}>✓</span>}
              </button>
            ))}
          </div>

          {/* Botón gestionar */}
          <button
            type="button"
            onClick={() => { setOpen(false); onGestionar(); }}
            style={{
              width: '100%', padding: '10px 14px', background: 'hsl(var(--bg))',
              border: 'none', borderTop: '1px solid hsl(var(--border))',
              cursor: 'pointer', fontSize: 12, color: 'hsl(var(--primary))',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ⚙️ Gestionar categorías...
          </button>
        </div>
      )}

      {/* Cerrar al hacer click fuera */}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />}
    </div>
  );
};

const emptyForm = () => ({
  nombre: '', descripcion: '', precio: '',
  categoria: '', activo: true,
  tieneMayoreo: false, mayoreoMinPiezas: '', mayoreo_precio: '',
  costoProd: '',
  foto: '',
});

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

// ── Componente principal ──────────────────────────────────────────────────────
export const CatalogoPage = () => {
  const { productos, categoriasProducto } = useStore();
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'categorias'
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [view, setView] = useState('grid');

  const filtered = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.descripcion?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filtroCategoria === 'todos' || p.categoria === filtroCategoria;
    return matchSearch && matchCat;
  });

  const openCreate = () => {
    setForm({ ...emptyForm(), categoria: categoriasProducto[0]?.nombre || '' });
    setEditId(null);
    setModal('create');
  };
  const openEdit = (p) => {
    setForm({
      ...emptyForm(),
      ...p,
      tieneMayoreo: !!(p.mayoreoMinPiezas && p.mayoreo_precio),
      mayoreoMinPiezas: p.mayoreoMinPiezas ?? '',
      mayoreo_precio: p.mayoreo_precio ?? '',
    });
    setEditId(p.id);
    setModal('edit');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      precio: Number(form.precio),
      costoProd: form.costoProd !== '' ? Number(form.costoProd) : null,
      mayoreoMinPiezas: form.tieneMayoreo && form.mayoreoMinPiezas !== '' ? Number(form.mayoreoMinPiezas) : null,
      mayoreo_precio: form.tieneMayoreo && form.mayoreo_precio !== '' ? Number(form.mayoreo_precio) : null,
    };
    if (editId) store.updateProducto(editId, data);
    else store.addProducto(data);
    setModal(null);
  };

  const handleFotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setForm(f => ({ ...f, foto: canvas.toDataURL('image/jpeg', 0.82) }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const toggleActivo = (p) => store.updateProducto(p.id, { activo: !p.activo });
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Categorías que realmente tienen productos (para los filtros)
  const categoriasUsadas = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">📚 Catálogo</h2>
          <p className="page-subtitle">{productos.length} productos registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`btn ${view === 'grid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('grid')}>⊞ Grid</button>
          <button className={`btn ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('table')}>☰ Lista</button>
          <button className="btn btn-secondary" onClick={() => setModal('categorias')} title="Gestionar categorías">📂 Categorías</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Nuevo producto</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span>🔍</span>
          <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tabs">
          <button className={`tab ${filtroCategoria === 'todos' ? 'active' : ''}`} onClick={() => setFiltroCategoria('todos')}>Todos</button>
          {categoriasUsadas.map(c => {
            const cat = categoriasProducto.find(x => x.nombre === c);
            return (
              <button key={c} className={`tab ${filtroCategoria === c ? 'active' : ''}`} onClick={() => setFiltroCategoria(c)}>
                {cat ? `${cat.emoji} ${cat.nombre}` : c}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>Sin productos</h3>
          <p>Agrega productos a tu catálogo para usarlos en pedidos y cotizaciones.</p>
          <button className="btn btn-primary" onClick={openCreate}>Agregar producto</button>
        </div>
      ) : view === 'grid' ? (

        /* ── GRID VIEW ── */
        <div className="product-grid">
          {filtered.map(p => {
            const cat = categoriasProducto.find(c => c.nombre === p.categoria);
            return (
              <div key={p.id} className="product-card" style={{ opacity: p.activo ? 1 : 0.55 }}>
                {/* Foto del producto */}
                <div style={{ margin: '-16px -16px 12px -16px', overflow: 'hidden', borderRadius: '12px 12px 0 0', height: 140, background: 'hsl(var(--bg))', display: 'grid', placeItems: 'center', borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                  {p.foto ? (
                    <img src={p.foto} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ fontSize: 44, opacity: 0.3 }}>📦</div>
                  )}
                </div>
                <div className="product-card-header">
                  <div>
                    <div className="product-name">{p.nombre}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {cat ? (
                        <span style={{
                          padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: cat.color, color: cat.text,
                        }}>{cat.emoji} {cat.nombre}</span>
                      ) : p.categoria ? (
                        <span className="product-category">{p.categoria}</span>
                      ) : null}
                      {p.tieneMayoreo && p.mayoreoMinPiezas && p.mayoreo_precio && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                          color: '#fff',
                        }}>
                          📦 Mayoreo desde {p.mayoreoMinPiezas} pzs
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <button
                      className={`btn btn-sm ${p.activo ? 'btn-secondary' : 'btn-ghost'}`}
                      onClick={() => toggleActivo(p)}
                      title={p.activo ? 'Desactivar' : 'Activar'}
                    >
                      {p.activo ? '✅' : '⭕'}
                    </button>
                  </div>
                </div>

                {p.descripcion && <p className="product-desc">{p.descripcion}</p>}

                <div style={{ marginTop: 8 }}>
                  <div className="product-price">{fmt(p.precio)}<span style={{ fontSize: 12, fontWeight: 400, color: 'hsl(var(--muted))', marginLeft: 4 }}>/ pieza</span></div>
                  {p.costoProd != null && p.costoProd > 0 && (
                    <div style={{ marginTop: 4, fontSize: 12, color: 'hsl(var(--muted))', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>🛠️ Costo prod:</span>
                      <span style={{ fontWeight: 700, color: 'hsl(var(--danger))' }}>{fmt(p.costoProd)}/pz</span>
                      <span style={{ color: 'hsl(var(--success))' }}>→ ganancia: {fmt(p.precio - p.costoProd)}/pz</span>
                    </div>
                  )}
                  {p.tieneMayoreo && p.mayoreoMinPiezas && p.mayoreo_precio && (
                    <div style={{
                      marginTop: 6, padding: '6px 10px', borderRadius: 8,
                      background: 'hsl(var(--primary-light))', display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    }}>
                      <span style={{ fontSize: 12, color: 'hsl(var(--primary-dark))', fontWeight: 600 }}>📦 Mayoreo (+{p.mayoreoMinPiezas} pzs)</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--primary))' }}>
                        {fmt(p.mayoreo_precio)}<span style={{ fontSize: 11, fontWeight: 400 }}>/pz</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="product-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️ Editar</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ id: p.id })} style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (

        /* ── TABLE VIEW ── */
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Precio unitario</th>
                <th>Mayoreo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const cat = categoriasProducto.find(c => c.nombre === p.categoria);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {p.foto && (
                          <img src={p.foto} alt={p.nombre} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0, border: '1px solid hsl(var(--border))' }} />
                        )}
                        {p.nombre}
                      </div>
                    </td>
                    <td>
                      {cat ? (
                        <span style={{
                          padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                          background: cat.color, color: cat.text,
                        }}>{cat.emoji} {cat.nombre}</span>
                      ) : (
                        <span style={{ fontSize: 12, background: 'hsl(var(--bg))', padding: '2px 8px', borderRadius: 99 }}>
                          {p.categoria || '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>{p.descripcion || '—'}</td>
                    <td><strong style={{ color: 'hsl(var(--primary))' }}>{fmt(p.precio)}</strong></td>
                    <td>
                      {p.tieneMayoreo && p.mayoreoMinPiezas && p.mayoreo_precio ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--primary))' }}>{fmt(p.mayoreo_precio)}/pz</span>
                          <span style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>desde {p.mayoreoMinPiezas} pzs</span>
                        </div>
                      ) : (
                        <span style={{ color: 'hsl(var(--muted))', fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${p.activo ? 'badge-completado' : 'badge-cancelado'}`}>
                        {p.activo ? '✅ Activo' : '❌ Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(p)}>✏️</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleActivo(p)}>{p.activo ? '⭕' : '✅'}</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirm({ id: p.id })} style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal crear/editar producto ── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nuevo producto' : '✏️ Editar producto'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* ── Foto del producto ── */}
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>📷 Imagen del producto <span style={{ fontWeight: 400, color: 'hsl(var(--muted))' }}>opcional</span></label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: form.foto ? '2px solid hsl(var(--primary))' : '2px dashed hsl(var(--border))',
                    borderRadius: 14,
                    padding: 20,
                    background: 'hsl(var(--bg) / 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    textAlign: 'center',
                  }}>
                    {form.foto ? (
                      <div style={{ position: 'relative', width: '100%', height: 180, borderRadius: 8, overflow: 'hidden' }}>
                        <img src={form.foto} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#0f0f1a' }} />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          style={{ position: 'absolute', top: 8, right: 8, padding: '4px 8px', borderRadius: 6, fontSize: 11, background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setForm(f => ({ ...f, foto: '' })); }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: '100%', height: 120, justifyContent: 'center', margin: 0 }}>
                        <span style={{ fontSize: 36, marginBottom: 6 }}>🖼️</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--primary))' }}>Haz clic aquí para subir una imagen</span>
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 3 }}>Formatos permitidos: JPG, PNG (Recomendado 16:9)</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoUpload} />
                      </label>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" required value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Tarjetas de presentación" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-textarea" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Describe el producto o servicio..." />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Precio unitario *</label>
                    <input className="form-input" type="number" required min="0" step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Categoría</span>
                    </label>
                    <SelectorCategoria
                      value={form.categoria}
                      onChange={v => set('categoria', v)}
                      categorias={categoriasProducto}
                      onGestionar={() => setModal('categorias-inline')}
                    />
                  </div>
                </div>

                {/* ── Costo de producción ── */}
                <div style={{
                  marginTop: 4, borderRadius: 12, overflow: 'hidden',
                  border: '1.5px dashed hsl(var(--border))', padding: '12px 14px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'hsl(var(--foreground))' }}>
                    🛠️ Costo de producción <span style={{ fontSize: 11, fontWeight: 400, color: 'hsl(var(--muted))' }}>opcional</span>
                  </div>
                  <input
                    className="form-input"
                    type="number" min="0" step="0.01"
                    value={form.costoProd}
                    onChange={e => set('costoProd', e.target.value)}
                    placeholder="Ej: 4.00 (cuánto te cuesta producir 1 pieza)"
                  />
                  {form.precio && form.costoProd && Number(form.costoProd) > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, display: 'flex', gap: 14 }}>
                      <span style={{ color: 'hsl(var(--muted))' }}>Ganancia/pieza: <strong style={{ color: 'hsl(var(--success))' }}>{fmt(Number(form.precio) - Number(form.costoProd))}</strong></span>
                      <span style={{ color: 'hsl(var(--muted))' }}>Margen: <strong style={{ color: 'hsl(var(--primary))' }}>{Math.round(((Number(form.precio) - Number(form.costoProd)) / Number(form.precio)) * 100)}%</strong></span>
                    </div>
                  )}
                </div>

                {/* ── Mayoreo ── */}
                <div style={{
                  marginTop: 4, borderRadius: 12, overflow: 'hidden',
                  border: form.tieneMayoreo ? '1.5px solid hsl(var(--primary))' : '1.5px dashed hsl(var(--border))',
                  transition: 'border-color 0.2s',
                }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    cursor: 'pointer', background: form.tieneMayoreo ? 'hsl(var(--primary-light))' : 'transparent',
                    transition: 'background 0.2s',
                  }}>
                    <input
                      type="checkbox"
                      checked={form.tieneMayoreo}
                      onChange={e => set('tieneMayoreo', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'hsl(var(--primary))' }}
                    />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: form.tieneMayoreo ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                        📦 Precio de mayoreo
                      </span>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'hsl(var(--muted))' }}>opcional</span>
                    </div>
                  </label>

                  {form.tieneMayoreo && (
                    <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Mínimo de piezas *</label>
                        <input
                          className="form-input" type="number" min="2" step="1"
                          required={form.tieneMayoreo} value={form.mayoreoMinPiezas}
                          onChange={e => set('mayoreoMinPiezas', e.target.value)} placeholder="Ej: 10"
                        />
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 3, display: 'block' }}>A partir de cuántas piezas aplica</span>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Precio mayoreo / pieza *</label>
                        <input
                          className="form-input" type="number" min="0" step="0.01"
                          required={form.tieneMayoreo} value={form.mayoreo_precio}
                          onChange={e => set('mayoreo_precio', e.target.value)} placeholder="0.00"
                        />
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 3, display: 'block' }}>Precio especial por pieza</span>
                      </div>

                      {form.precio && form.mayoreo_precio && Number(form.mayoreo_precio) < Number(form.precio) && (
                        <div style={{
                          gridColumn: '1 / -1', borderRadius: 8, padding: '8px 12px',
                          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.06))',
                          border: '1px solid hsl(var(--primary) / 0.3)',
                          display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                          <span style={{ fontSize: 18 }}>💰</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--primary))' }}>
                              El cliente ahorra {fmt(Number(form.precio) - Number(form.mayoreo_precio))} por pieza
                            </div>
                            <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>
                              {Math.round((1 - Number(form.mayoreo_precio) / Number(form.precio)) * 100)}% de descuento al comprar {form.mayoreoMinPiezas || '…'} o más piezas
                            </div>
                          </div>
                        </div>
                      )}
                      {form.precio && form.mayoreo_precio && Number(form.mayoreo_precio) >= Number(form.precio) && (
                        <div style={{
                          gridColumn: '1 / -1', borderRadius: 8, padding: '8px 12px',
                          background: 'hsl(40 90% 95%)', border: '1px solid hsl(40 90% 70%)',
                          fontSize: 12, color: 'hsl(30 80% 40%)', fontWeight: 500,
                        }}>
                          ⚠️ El precio de mayoreo debería ser menor al precio unitario para que tenga sentido.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={e => set('activo', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'hsl(var(--primary))' }}
                    />
                    <span className="form-label" style={{ margin: 0 }}>Producto activo (visible en pedidos/cotizaciones)</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                {editId && <button type="button" className="btn btn-danger" onClick={() => { setConfirm({ id: editId }); setModal(null); }} style={{ marginRight: 'auto' }}>🗑️</button>}
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{modal === 'create' ? '✓ Crear' : '✓ Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal gestión de categorías ── */}
      {(modal === 'categorias' || modal === 'categorias-inline') && (
        <ModalCategorias
          categorias={categoriasProducto}
          onClose={() => {
            if (modal === 'categorias-inline') setModal('create');
            else setModal(null);
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title="¿Eliminar producto?"
          message="Se eliminará del catálogo pero no de pedidos existentes."
          onConfirm={() => { store.deleteProducto(confirm.id); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};
