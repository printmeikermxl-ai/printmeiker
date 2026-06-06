import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProductLinesInput } from '../components/ProductLinesInput';

const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'completado', 'cancelado'];

// Color del borde izquierdo según estado
const ROW_COLORS = {
  pendiente:  { borderLeft: '3px solid #F59E0B', background: 'transparent' },
  en_proceso: { borderLeft: '3px solid #3B82F6', background: 'rgba(59,130,246,0.03)' },
  listo:      { borderLeft: '3px solid #10B981', background: 'rgba(16,185,129,0.04)' },
  completado: { borderLeft: '3px solid #8B5CF6', background: 'rgba(139,92,246,0.04)' },
  cancelado:  { borderLeft: '3px solid #EF4444', background: 'rgba(239,68,68,0.05)' },
};

const emptyForm = () => ({
  cliente: '', telefono: '', email: '',
  fecha: new Date().toISOString().split('T')[0],
  fechaEntrega: '',
  estado: 'pendiente',
  productos: [{ nombre: '', cantidad: 1, precio: 0 }],
  anticipo: 0, notas: '',
});

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export const PedidosPage = () => {
  const { pedidos, productos: catalogo } = useStore();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'view'
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [finanzasDialog, setFinanzasDialog] = useState(null); // { pedido } para confirmar ingreso

  const filtered = pedidos.filter(p => {
    const matchSearch = p.cliente.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const total = form.productos.reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0);
  const saldo = total - Number(form.anticipo);

  const openCreate = () => {
    setForm(emptyForm());
    setEditId(null);
    setModal('create');
  };

  const openEdit = (p) => {
    setForm({ ...p });
    setEditId(p.id);
    setModal('edit');
  };

  const openView = (p) => {
    setForm({ ...p });
    setEditId(p.id);
    setModal('view');
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = { ...form, total };
    if (editId) {
      store.updatePedido(editId, data);
    } else {
      store.addPedido(data);
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    setConfirm({ id });
  };

  const confirmDelete = () => {
    store.deletePedido(confirm.id);
    setConfirm(null);
    if (modal) setModal(null);
  };

  const updateEstado = (id, nuevoEstado) => {
    const pedido = pedidos.find(p => p.id === id);
    store.updatePedido(id, { estado: nuevoEstado });
    // Al completar → ofrecer registrar en Finanzas
    if (nuevoEstado === 'completado' && pedido) {
      setFinanzasDialog(pedido);
    }
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📦 Pedidos</h2>
          <p className="page-subtitle">{pedidos.length} pedidos registrados</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo pedido
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span>🔍</span>
          <input
            placeholder="Buscar por cliente o ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="tabs">
          {['todos', ...ESTADOS].map(e => (
            <button
              key={e}
              className={`tab ${filtroEstado === e ? 'active' : ''}`}
              onClick={() => setFiltroEstado(e)}
            >
              {e === 'todos' ? 'Todos' : e.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>Sin pedidos</h3>
          <p>No se encontraron pedidos con los filtros actuales.</p>
          <button className="btn btn-primary" onClick={openCreate}>Crear primer pedido</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Saldo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const rowStyle = ROW_COLORS[p.estado] || {};
                return (
                  <tr key={p.id} style={rowStyle}>
                    <td><span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{p.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.cliente}</div>
                      {p.telefono && <div style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>{p.telefono}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{p.fecha}</td>
                    <td style={{ fontSize: 13 }}>{p.fechaEntrega || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusBadge status={p.estado} />
                        <select
                          className="form-select"
                          style={{ padding: '2px 24px 2px 6px', fontSize: 11, width: 'auto', opacity: 0.7 }}
                          value={p.estado}
                          onChange={e => updateEstado(p.id, e.target.value)}
                          title="Cambiar estado"
                        >
                          {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                        </select>
                      </div>
                    </td>
                    <td><strong>{fmt(p.total)}</strong></td>
                    <td style={{ color: (p.total - p.anticipo) > 0 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>
                      {fmt(p.total - p.anticipo)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openView(p)} title="Ver">👁️</button>
                        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(p)} title="Editar">✏️</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p.id)} title="Eliminar" style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal create/edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nuevo pedido' : '✏️ Editar pedido'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Cliente *</label>
                    <input className="form-input" required value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="Nombre del cliente" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input className="form-input" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="555-0000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@email.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                      {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha del pedido</label>
                    <input className="form-input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de entrega</label>
                    <input className="form-input" type="date" value={form.fechaEntrega} onChange={e => set('fechaEntrega', e.target.value)} />
                  </div>
                </div>

                <div className="divider" />

                <div className="form-group">
                  <label className="form-label">Productos / Servicios</label>
                  <ProductLinesInput
                    lines={form.productos}
                    onChange={lines => set('productos', lines)}
                    productos={catalogo}
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Anticipo recibido</label>
                    <input className="form-input" type="number" min="0" step="0.01" value={form.anticipo} onChange={e => set('anticipo', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Saldo restante</label>
                    <input className="form-input" value={fmt(saldo)} disabled style={{ background: 'hsl(var(--bg))' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea className="form-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, especificaciones..." />
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
                  {modal === 'create' ? '✓ Crear pedido' : '✓ Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal view */}
      {modal === 'view' && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>📦 Pedido {editId}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div><span className="text-muted">Cliente:</span><div className="font-bold">{form.cliente}</div></div>
                <div><span className="text-muted">Teléfono:</span><div>{form.telefono || '—'}</div></div>
                <div><span className="text-muted">Email:</span><div>{form.email || '—'}</div></div>
                <div><span className="text-muted">Estado:</span><div><StatusBadge status={form.estado} /></div></div>
                <div><span className="text-muted">Fecha:</span><div>{form.fecha}</div></div>
                <div><span className="text-muted">Entrega:</span><div>{form.fechaEntrega || '—'}</div></div>
              </div>
              <div className="divider" />
              <div className="form-label" style={{ marginBottom: 10 }}>Productos</div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {form.productos.map((line, i) => (
                      <tr key={i}>
                        <td>{line.nombre}</td>
                        <td>{line.cantidad}</td>
                        <td>{fmt(line.precio)}</td>
                        <td><strong>{fmt(line.cantidad * line.precio)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="order-total-row" style={{ marginTop: 12 }}>
                <span className="text-muted">Total:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'hsl(var(--primary))' }}>{fmt(total)}</span>
              </div>
              <div className="order-total-row">
                <span className="text-muted">Anticipo:</span>
                <span style={{ color: 'hsl(var(--success))' }}>{fmt(form.anticipo)}</span>
              </div>
              <div className="order-total-row">
                <span className="text-muted">Saldo:</span>
                <span style={{ fontWeight: 700, color: saldo > 0 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>{fmt(saldo)}</span>
              </div>
              {form.notas && (
                <>
                  <div className="divider" />
                  <div><span className="text-muted">Notas:</span><p style={{ marginTop: 4 }}>{form.notas}</p></div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => openEdit({ ...form, id: editId })}>✏️ Editar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirm && (
        <ConfirmDialog
          title="¿Eliminar pedido?"
          message="Esta acción no se puede deshacer."
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Diálogo: registrar en Finanzas al completar */}
      {finanzasDialog && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>💰 Registrar en Finanzas</h2>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '28px 24px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                Pedido de <strong>{finanzasDialog.cliente}</strong> completado
              </p>
              <p style={{ fontSize: 13, color: 'hsl(var(--muted))', marginBottom: 20 }}>
                ¿Deseas registrar <strong>{`$${Number(finanzasDialog.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</strong> como ingreso en Finanzas?
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setFinanzasDialog(null)}
                >
                  No, omitir
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: 'hsl(var(--success))', borderColor: 'hsl(var(--success))' }}
                  onClick={() => {
                    store.addFinanza({
                      tipo: 'ingreso',
                      concepto: `Pedido ${finanzasDialog.id} - ${finanzasDialog.cliente}`,
                      monto: finanzasDialog.total,
                      fecha: new Date().toISOString().split('T')[0],
                      categoria: 'Pedido',
                    });
                    setFinanzasDialog(null);
                  }}
                >
                  ✅ Sí, registrar ingreso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
