import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { ConfirmDialog } from '../components/ConfirmDialog';

const CATEGORIAS = ['Impresión', 'Banners', 'Sublimación', 'Bordado', 'Diseño', 'Digital', 'Otro'];

const emptyForm = () => ({
  nombre: '', descripcion: '', precio: '',
  categoria: 'Impresión', activo: true,
  tieneMayoreo: false, mayoreoMinPiezas: '', mayoreo_precio: '',
  costoProd: '',  // costo de producción por pieza (opcional)
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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span className="product-category">{p.categoria}</span>
                    {p.tieneMayoreo && p.mayoreoMinPiezas && p.mayoreo_precio && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                        color: '#fff', letterSpacing: '0.3px',
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

              {/* Precio unitario + mayoreo + costo producción */}
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
                    <span style={{ fontSize: 12, color: 'hsl(var(--primary-dark))', fontWeight: 600 }}>
                      📦 Mayoreo (+{p.mayoreoMinPiezas} pzs)
                    </span>
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
          ))}
        </div>
      ) : (
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
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                  <td><span style={{ fontSize: 12, background: 'hsl(var(--bg))', padding: '2px 8px', borderRadius: 99 }}>{p.categoria}</span></td>
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
          <div className="modal" style={{ maxWidth: 560 }}>
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
                    <label className="form-label">Precio unitario *</label>
                    <input className="form-input" type="number" required min="0" step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select className="form-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
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

                {/* ── Sección Mayoreo ── */}
                <div style={{
                  marginTop: 4, borderRadius: 12, overflow: 'hidden',
                  border: form.tieneMayoreo ? '1.5px solid hsl(var(--primary))' : '1.5px dashed hsl(var(--border))',
                  transition: 'border-color 0.2s',
                }}>
                  {/* Header toggle */}
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

                  {/* Campos de mayoreo (solo si está activo) */}
                  {form.tieneMayoreo && (
                    <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Mínimo de piezas *</label>
                        <input
                          className="form-input"
                          type="number"
                          min="2"
                          step="1"
                          required={form.tieneMayoreo}
                          value={form.mayoreoMinPiezas}
                          onChange={e => set('mayoreoMinPiezas', e.target.value)}
                          placeholder="Ej: 10"
                        />
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 3, display: 'block' }}>
                          A partir de cuántas piezas aplica
                        </span>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Precio mayoreo / pieza *</label>
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          step="0.01"
                          required={form.tieneMayoreo}
                          value={form.mayoreo_precio}
                          onChange={e => set('mayoreo_precio', e.target.value)}
                          placeholder="0.00"
                        />
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 3, display: 'block' }}>
                          Precio especial por pieza
                        </span>
                      </div>

                      {/* Resumen visual del ahorro */}
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

      {confirm && (
        <ConfirmDialog title="¿Eliminar producto?" message="Se eliminará del catálogo pero no de pedidos existentes." onConfirm={() => { store.deleteProducto(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
};
