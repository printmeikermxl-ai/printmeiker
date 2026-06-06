import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { ConfirmDialog } from '../components/ConfirmDialog';

const CATEGORIAS = ['Impresión', 'Banners', 'Sublimación', 'Bordado', 'Diseño', 'Digital', 'Otro'];

const emptyForm = () => ({
  nombre: '', descripcion: '', precio: '',
  categoria: 'Impresión', activo: true,
});

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export const CatalogoPage = () => {
  const { productos } = useStore();
  const [search, setSearch] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [view, setView] = useState('grid'); // 'grid' | 'table'

  const filtered = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.descripcion?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filtroCategoria === 'todos' || p.categoria === filtroCategoria;
    return matchSearch && matchCat;
  });

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setModal('create'); };
  const openEdit = (p) => { setForm({ ...p }); setEditId(p.id); setModal('edit'); };

  const handleSave = (e) => {
    e.preventDefault();
    const data = { ...form, precio: Number(form.precio) };
    if (editId) store.updateProducto(editId, data);
    else store.addProducto(data);
    setModal(null);
  };

  const toggleActivo = (p) => store.updateProducto(p.id, { activo: !p.activo });
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const categoriasUsadas = [...new Set(productos.map(p => p.categoria))];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📚 Catálogo</h2>
          <p className="page-subtitle">{productos.length} productos registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`btn ${view === 'grid' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('grid')}>⊞ Grid</button>
          <button className={`btn ${view === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('table')}>☰ Lista</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Nuevo producto</button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span>🔍</span>
          <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tabs">
          <button className={`tab ${filtroCategoria === 'todos' ? 'active' : ''}`} onClick={() => setFiltroCategoria('todos')}>Todos</button>
          {categoriasUsadas.map(c => (
            <button key={c} className={`tab ${filtroCategoria === c ? 'active' : ''}`} onClick={() => setFiltroCategoria(c)}>{c}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>Sin productos</h3>
          <p>Agrega productos a tu catálogo para usarlos en pedidos y cotizaciones.</p>
          <button className="btn btn-primary" onClick={openCreate}>Agregar producto</button>
        </div>
      ) : view === 'grid' ? (
        <div className="product-grid">
          {filtered.map(p => (
            <div key={p.id} className="product-card" style={{ opacity: p.activo ? 1 : 0.5 }}>
              <div className="product-card-header">
                <div>
                  <div className="product-name">{p.nombre}</div>
                  <span className="product-category">{p.categoria}</span>
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
              <div className="product-price">{fmt(p.precio)}</div>
              <div className="product-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️ Editar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ id: p.id })} style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Categoría</th><th>Descripción</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                  <td><span style={{ fontSize: 12, background: 'hsl(var(--bg))', padding: '2px 8px', borderRadius: 99 }}>{p.categoria}</span></td>
                  <td style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>{p.descripcion || '—'}</td>
                  <td><strong style={{ color: 'hsl(var(--primary))' }}>{fmt(p.precio)}</strong></td>
                  <td>
                    <span className={`badge ${p.activo ? 'badge-completado' : 'badge-cancelado'}`}>
                      {p.activo ? '✅ Activo' : '❌ Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(p)}>✏️</button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleActivo(p)} title="Toggle">
                        {p.activo ? '⭕' : '✅'}
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirm({ id: p.id })} style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nuevo producto' : '✏️ Editar producto'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
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
                    <label className="form-label">Precio base *</label>
                    <input className="form-input" type="number" required min="0" step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select className="form-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
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

      {confirm && (
        <ConfirmDialog title="¿Eliminar producto?" message="Se eliminará del catálogo pero no de pedidos existentes." onConfirm={() => { store.deleteProducto(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
};
