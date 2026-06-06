import { useState, useRef } from 'react';
import { useStore, store } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProductLinesInput } from '../components/ProductLinesInput';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ESTADOS = ['pendiente', 'aprobada', 'rechazada', 'vencida'];

const emptyForm = () => ({
  cliente: '', telefono: '', email: '',
  fecha: new Date().toISOString().split('T')[0],
  validez: '',
  estado: 'pendiente',
  productos: [{ nombre: '', cantidad: 1, precio: 0 }],
  notas: '',
  costoExtra: 0,
  costoExtraEtiqueta: '',
});

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export const CotizacionesPage = () => {
  const { cotizaciones, productos: catalogo, config } = useStore();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const printRef = useRef();

  const filtered = cotizaciones.filter(c => {
    const matchSearch = c.cliente.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const total = form.productos.reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0) + Number(form.costoExtra || 0);

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setModal('create'); };
  const openEdit = (c) => { setForm({ ...c }); setEditId(c.id); setModal('edit'); };
  const openView = (c) => { setForm({ ...c }); setEditId(c.id); setModal('view'); };

  const handleSave = (e) => {
    e.preventDefault();
    const data = { ...form, total };
    if (editId) store.updateCotizacion(editId, data);
    else store.addCotizacion(data);
    setModal(null);
  };

  const handleDelete = (id) => setConfirm({ id });
  const confirmDelete = () => { store.deleteCotizacion(confirm.id); setConfirm(null); if (modal) setModal(null); };

  const updateEstado = (id, estado) => store.updateCotizacion(id, { estado });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-quote-doc');
    if (!element) return;

    // Create a container to hold the clone off-screen at exact Letter proportions
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '8.5in'; // US Letter width
    container.style.height = '11in'; // US Letter height
    container.style.overflow = 'hidden';
    container.style.backgroundColor = '#ffffff';

    const clone = element.cloneNode(true);
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.minHeight = '100%';
    clone.style.margin = '0';
    clone.style.padding = '0.5in'; // US Letter padding (approx 48px)
    clone.style.boxSizing = 'border-box';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(clone, {
        scale: 3, // High DPI for crisp rendering
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, 8.5, 11);
      pdf.save(`Cotizacion_${editId || 'documento'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF. Puedes intentar imprimir directamente.');
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('printable-quote-doc');
    if (!element) return;

    // Create a container to hold the clone off-screen at exact Letter proportions
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '8.5in'; // US Letter width
    container.style.height = '11in'; // US Letter height
    container.style.overflow = 'hidden';
    container.style.backgroundColor = '#ffffff';

    const clone = element.cloneNode(true);
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.minHeight = '100%';
    clone.style.margin = '0';
    clone.style.padding = '0.5in'; // US Letter padding
    clone.style.boxSizing = 'border-box';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(clone, {
        scale: 3, // High DPI for crisp rendering
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Cotizacion_${editId || 'documento'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Hubo un error al descargar la imagen.');
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleConvertirPedido = (c) => {
    store.addPedido({
      cliente: c.cliente, telefono: c.telefono, email: c.email,
      fecha: new Date().toISOString().split('T')[0], fechaEntrega: '',
      estado: 'pendiente', productos: c.productos, total: c.total,
      anticipo: 0, notas: `Convertido de cotización ${c.id}`,
    });
    store.updateCotizacion(c.id, { estado: 'aprobada' });
    alert('✅ Cotización convertida a pedido');
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📋 Cotizaciones</h2>
          <p className="page-subtitle">{cotizaciones.length} cotizaciones registradas</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nueva cotización</button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span>🔍</span>
          <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tabs">
          {['todos', ...ESTADOS].map(e => (
            <button key={e} className={`tab ${filtroEstado === e ? 'active' : ''}`} onClick={() => setFiltroEstado(e)}>
              {e === 'todos' ? 'Todos' : e}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Sin cotizaciones</h3>
          <p>Crea tu primera cotización para un cliente.</p>
          <button className="btn btn-primary" onClick={openCreate}>Nueva cotización</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Válida hasta</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td><span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{c.id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.cliente}</div>
                    {c.email && <div style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>{c.email}</div>}
                  </td>
                  <td style={{ fontSize: 13 }}>{c.fecha}</td>
                  <td style={{ fontSize: 13 }}>{c.validez || '—'}</td>
                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '4px 28px 4px 8px', fontSize: 12, width: 'auto' }}
                      value={c.estado}
                      onChange={e => updateEstado(c.id, e.target.value)}
                    >
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td><strong>{fmt(c.total)}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openView(c)} title="Ver">👁️</button>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(c)} title="Editar">✏️</button>
                      {c.estado === 'pendiente' && (
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleConvertirPedido(c)} title="Convertir a pedido" style={{ color: 'hsl(var(--success))' }}>📦</button>
                      )}
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(c.id)} title="Eliminar" style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal create/edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nueva cotización' : '✏️ Editar cotización'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Cliente *</label>
                    <input className="form-input" required value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="Nombre o empresa" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input className="form-input" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input className="form-input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Válida hasta</label>
                    <input className="form-input" type="date" value={form.validez} onChange={e => set('validez', e.target.value)} />
                  </div>
                </div>

                <div className="divider" />

                <div className="form-group">
                  <label className="form-label">Productos / Servicios</label>
                  <ProductLinesInput lines={form.productos} onChange={lines => set('productos', lines)} productos={catalogo} />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Concepto de costo extra (Opcional)</label>
                    <input className="form-input" value={form.costoExtraEtiqueta || ''} onChange={e => set('costoExtraEtiqueta', e.target.value)} placeholder="Ej. Envío, Diseño adicional, etc." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto costo extra</label>
                    <input className="form-input" type="number" min="0" step="any" value={form.costoExtra || ''} onChange={e => set('costoExtra', e.target.value === '' ? 0 : Number(e.target.value))} placeholder="0.00" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notas</label>
                  <textarea className="form-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Términos, condiciones, detalles adicionales..." />
                </div>
              </div>
              <div className="modal-footer">
                {editId && <button type="button" className="btn btn-danger" onClick={() => handleDelete(editId)} style={{ marginRight: 'auto' }}>🗑️</button>}
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{modal === 'create' ? '✓ Crear' : '✓ Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View modal with print */}
      {modal === 'view' && (
        <div className="modal-overlay">
          <div className="modal modal-xl" ref={printRef}>
            <div className="modal-header">
              <h2>📋 Cotización {editId}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ background: '#f8fafc', padding: '24px 32px' }}>
              <div className="printable-quote" id="printable-quote-doc">
                {/* Header section */}
                <div className="quote-header-section">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {config.profilePhoto ? (
                      <img 
                        src={config.profilePhoto} 
                        alt="Logo" 
                        className="quote-biz-logo" 
                      />
                    ) : (
                      <div style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        {(config.propietario || config.negocio || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="quote-biz-details">
                      <h3>{config.negocio || 'Mi Negocio'}</h3>
                      {config.telefono && <div>📞 {config.telefono}</div>}
                      {config.email && <div>✉️ {config.email}</div>}
                    </div>
                  </div>
                  <div className="quote-meta-details">
                    <h2 className="quote-title">Cotización</h2>
                    <div className="quote-id">{editId}</div>
                    <div className="quote-dates">
                      <div><strong>Fecha de emisión:</strong> {form.fecha}</div>
                      {form.validez && <div><strong>Válido hasta:</strong> {form.validez}</div>}
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="quote-info-grid">
                  <div>
                    <div className="info-section-title">Información del Cliente</div>
                    <div className="info-client-name">{form.cliente}</div>
                    {form.telefono && <div className="info-client-contact">📞 {form.telefono}</div>}
                    {form.email && <div className="info-client-contact">✉️ {form.email}</div>}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                    <div className="info-section-title" style={{ marginBottom: 6 }}>Estado</div>
                    <StatusBadge status={form.estado} />
                  </div>
                </div>

                {/* Items Table */}
                <div className="quote-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto / Servicio</th>
                        <th style={{ width: 80, textAlign: 'center' }}>Cant.</th>
                        <th style={{ width: 120, textAlign: 'right' }}>Precio Unit.</th>
                        <th style={{ width: 120, textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.productos.map((line, i) => (
                        <tr key={i}>
                          <td><strong>{line.nombre}</strong></td>
                          <td style={{ textAlign: 'center' }}>{line.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(line.precio)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(line.cantidad * line.precio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Notes */}
                <div style={{ display: 'grid', gridTemplateColumns: form.notas ? '1.2fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
                  {form.notas ? (
                    <div className="quote-notes-section">
                      <div className="info-section-title">Notas / Condiciones</div>
                      <p>{form.notas}</p>
                    </div>
                  ) : <div />}
                  <div className="quote-totals-section" style={{ borderTop: 'none', paddingTop: 0, marginBottom: 0 }}>
                    <div className="quote-totals-box">
                      <div className="quote-total-row">
                        <span>Subtotal:</span>
                        <span>{fmt(form.productos.reduce((s, l) => s + l.cantidad * l.precio, 0))}</span>
                      </div>
                      {Number(form.costoExtra || 0) > 0 && (
                        <div className="quote-total-row">
                          <span>{form.costoExtraEtiqueta || 'Costo Extra'}:</span>
                          <span>{fmt(form.costoExtra)}</span>
                        </div>
                      )}
                      <div className="quote-total-row">
                        <span>IVA (0%):</span>
                        <span>$0.00</span>
                      </div>
                      <div className="quote-total-row grand-total">
                        <span>Total:</span>
                        <span>{fmt(form.productos.reduce((s, l) => s + l.cantidad * l.precio, 0) + Number(form.costoExtra || 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Message */}
                <div className="quote-footer-msg">
                  ¡Gracias por la oportunidad de cotizar con nosotros! Quedamos a sus órdenes.
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
              {form.estado === 'pendiente' && (
                <button className="btn btn-secondary" onClick={() => handleConvertirPedido({ ...form, id: editId, total })} style={{ marginRight: 'auto' }}>
                  📦 Convertir a pedido
                </button>
              )}
              <button className="btn btn-secondary" onClick={handleDownloadImage}>🖼️ Guardar Imagen</button>
              <button className="btn btn-secondary" onClick={handleDownloadPDF}>📥 Descargar PDF</button>
              <button className="btn btn-primary" onClick={handlePrint}>🖨️ Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog title="¿Eliminar cotización?" message="Esta acción no se puede deshacer." onConfirm={confirmDelete} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
};
