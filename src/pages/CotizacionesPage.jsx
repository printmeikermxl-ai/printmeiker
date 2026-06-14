import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProductLinesInput } from '../components/ProductLinesInput';
import { ETIQUETAS_BASE, EtiquetaBadge } from './ClientesPage';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ESTADOS = ['pendiente', 'aprobada', 'rechazada', 'vencida'];

const emptyForm = () => ({
  cliente: '', telefono: '', email: '', direccion: '',
  fecha: new Date().toISOString().split('T')[0],
  validez: '',
  estado: 'pendiente',
  productos: [{ nombre: '', cantidad: 1, precio: 0 }],
  extras: [],
  notas: '',
  terminosCondiciones: '',
  anticipo: 0,
  anticipoPct: 0,
  usarPorcentajeAnticipo: false,
  aplicarIva: false,
  ivaPct: 16,
});

// Helper — suma todos los extras
const sumExtras = (extras = []) =>
  extras.reduce((s, e) => s + Number(e.monto || 0), 0);

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

// Helper to get CSS variable value as hex-like string for inline use
const getPrimaryColor = () => {
  const root = document.documentElement;
  const primary = getComputedStyle(root).getPropertyValue('--primary').trim();
  const primaryDark = getComputedStyle(root).getPropertyValue('--primary-dark').trim();
  const primaryLight = getComputedStyle(root).getPropertyValue('--primary-light').trim();
  const primaryRgb = getComputedStyle(root).getPropertyValue('--primary-rgb').trim();
  return { primary, primaryDark, primaryLight, primaryRgb };
};

export const CotizacionesPage = () => {
  const { cotizaciones, productos: catalogo, config, negocioConfig, clientes, etiquetasPersonalizadas } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const printRef = useRef();

  // ── Buscador de clientes ─────────────────────────────────────────────────────
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [filtroEtiquetaCliente, setFiltroEtiquetaCliente] = useState('todos');
  const [clienteOrdenAZ, setClienteOrdenAZ] = useState(false);
  const clienteInputRef = useRef();

  // Clientes filtrados para el buscador
  const clientesFiltrados = (() => {
    let lista = clientes.filter(c => {
      const q = clienteSearch.toLowerCase();
      const matchQ = !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.telefono?.includes(q) ||
        c.email?.toLowerCase().includes(q);
      const matchEt = filtroEtiquetaCliente === 'todos' || c.etiqueta === filtroEtiquetaCliente;
      return matchQ && matchEt;
    });
    if (clienteOrdenAZ) lista = [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return lista;
  })();

  const seleccionarCliente = (c) => {
    setForm(f => ({
      ...f,
      cliente: c.nombre,
      telefono: c.telefono || f.telefono,
      email: c.email || f.email,
      direccion: c.direccion ? `${c.direccion}${c.ciudad ? ', ' + c.ciudad : ''}${c.estado ? ', ' + c.estado : ''}` : f.direccion,
    }));
    setClienteSearch(c.nombre);
    setClienteDropdownOpen(false);
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (clienteInputRef.current && !clienteInputRef.current.closest('.cliente-search-wrap')?.contains(e.target)) {
        setClienteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = cotizaciones.filter(c => {
    const matchSearch = c.cliente.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const subtotal = form.productos.reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0);
  const totalExtras = sumExtras(form.extras);
  const baseTotal = subtotal + totalExtras;
  const ivaAmt = form.aplicarIva ? baseTotal * (Number(form.ivaPct || 0) / 100) : 0;
  const total = baseTotal + ivaAmt;

  // Anticipo calculation
  const anticipoMonto = form.usarPorcentajeAnticipo
    ? (total * Number(form.anticipoPct || 0)) / 100
    : Number(form.anticipo || 0);
  const saldoPendiente = total - anticipoMonto;

  // Extras helpers
  const addExtra = () => setForm(f => ({ ...f, extras: [...(f.extras || []), { id: Date.now().toString(), concepto: '', monto: '' }] }));
  const removeExtra = (id) => setForm(f => ({ ...f, extras: (f.extras || []).filter(e => e.id !== id) }));
  const updateExtra = (id, field, value) => setForm(f => ({ ...f, extras: (f.extras || []).map(e => e.id === id ? { ...e, [field]: value } : e) }));

  const openCreate = () => {
    const defaultTerminos = negocioConfig?.terminosLocales || '';
    setForm({ ...emptyForm(), terminosCondiciones: defaultTerminos });
    setEditId(null);
    setModal('create');
  };
  const openEdit = (c) => { setForm({ ...c }); setEditId(c.id); setModal('edit'); };
  const openView = (c) => { setForm({ ...c }); setEditId(c.id); setModal('view'); };

  const handleSave = (e) => {
    e.preventDefault();
    const data = { ...form, total, anticipoMonto, saldoPendiente };
    if (editId) store.updateCotizacion(editId, data);
    else store.addCotizacion(data);
    setModal(null);
  };

  const handleDelete = (id) => setConfirm({ id });
  const confirmDelete = () => { store.deleteCotizacion(confirm.id); setConfirm(null); if (modal) setModal(null); };

  const updateEstado = (id, nuevoEstado) => {
    const cot = cotizaciones.find(c => c.id === id);
    store.updateCotizacion(id, { estado: nuevoEstado });
    if (nuevoEstado === 'aprobada' && cot) {
      const yaExiste = store.getState().pedidos.some(p => p.notas && p.notas.includes(id));
      if (!yaExiste) {
        store.addPedido({
          cliente: cot.cliente, telefono: cot.telefono, email: cot.email,
          fecha: new Date().toISOString().split('T')[0], fechaEntrega: '',
          estado: 'pendiente', productos: cot.productos,
          total: cot.total, anticipo: cot.anticipoMonto || 0,
          notas: `Generado desde cotización ${id}`,
          costoExtra: cot.costoExtra || 0,
        });
      }
      setTimeout(() => navigate('/pedidos'), 300);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-quote-doc');
    if (!element) return;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '816px';
    container.style.overflow = 'visible';
    container.style.backgroundColor = '#ffffff';

    const clone = element.cloneNode(true);
    clone.style.width = '816px';
    clone.style.margin = '0';
    clone.style.padding = '48px';
    clone.style.boxSizing = 'border-box';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        height: clone.scrollHeight,
        windowHeight: clone.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [816, clone.scrollHeight],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 816, clone.scrollHeight);
      pdf.save(`Cotizacion_${editId || 'documento'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('printable-quote-doc');
    if (!element) return;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '816px';
    container.style.overflow = 'visible';
    container.style.backgroundColor = '#ffffff';

    const clone = element.cloneNode(true);
    clone.style.width = '816px';
    clone.style.margin = '0';
    clone.style.padding = '48px';
    clone.style.boxSizing = 'border-box';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';

    container.appendChild(clone);
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        height: clone.scrollHeight,
        windowHeight: clone.scrollHeight,
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
    const yaExiste = store.getState().pedidos.some(p => p.notas && p.notas.includes(c.id));
    if (!yaExiste) {
      store.addPedido({
        cliente: c.cliente, telefono: c.telefono, email: c.email,
        fecha: new Date().toISOString().split('T')[0], fechaEntrega: '',
        estado: 'pendiente', productos: c.productos, total: c.total,
        anticipo: c.anticipoMonto || 0, notas: `Generado desde cotización ${c.id}`,
        costoExtra: c.costoExtra || 0,
      });
    }
    store.updateCotizacion(c.id, { estado: 'aprobada' });
    setModal(null);
    navigate('/pedidos');
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Quote Document Component ─────────────────────────────────────────────
  const QuoteDocument = ({ formData, quoteId }) => {
    const sub = formData.productos.reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0);
    const extrasArr = formData.extras || [];
    const extrasTotal = sumExtras(extrasArr);
    const base = sub + extrasTotal;
    const antPct = formData.usarPorcentajeAnticipo;

    // IVA por cotización (no el global de config)
    const ivaRate = formData.aplicarIva ? Number(formData.ivaPct || 0) : 0;
    const ivaAmt  = base * (ivaRate / 100);
    const tot = base + ivaAmt;

    const ant = antPct
      ? (tot * Number(formData.anticipoPct || 0)) / 100
      : Number(formData.anticipo || 0);
    const saldo = tot - ant;


    const negocioNombre = config.negocio || 'Mi Negocio';
    const negocioInicial = (config.propietario || negocioNombre || 'U')[0].toUpperCase();

    return (
      <div className="qd-doc" id="printable-quote-doc">
        {/* ── HEADER ── */}
        <div className="qd-header">
          {/* Left: Logo + Company */}
          <div className="qd-header-left">
            <div className="qd-logo-block">
              {config.profilePhoto ? (
                <img src={config.profilePhoto} alt="Logo" className="qd-logo-img" />
              ) : (
                <div className="qd-logo-placeholder">{negocioInicial}</div>
              )}
              <div className="qd-company-info">
                <div className="qd-company-name">{negocioNombre}</div>
                {config.telefono && <div className="qd-company-detail">📞 {config.telefono}</div>}
                {config.email && <div className="qd-company-detail">✉️ {config.email}</div>}
              </div>
            </div>
          </div>

          {/* Right: COTIZACIÓN title + meta */}
          <div className="qd-header-right">
            <div className="qd-invoice-title">COTIZACIÓN</div>
            <div className="qd-meta-grid">
              <span className="qd-meta-label">No.:</span>
              <span className="qd-meta-value">{quoteId}</span>
              <span className="qd-meta-label">Fecha:</span>
              <span className="qd-meta-value">{formData.fecha}</span>
              {formData.validez && <>
                <span className="qd-meta-label">Válida hasta:</span>
                <span className="qd-meta-value">{formData.validez}</span>
              </>}
            </div>
          </div>
        </div>

        {/* ── DIVIDER ACCENT ── */}
        <div className="qd-accent-bar" />

        {/* ── CLIENT + PAYMENT INFO ── */}
        <div className="qd-info-row">
          {/* Client Info */}
          <div className="qd-info-block">
            <div className="qd-info-label">COTIZADO PARA:</div>
            <div className="qd-client-name">{formData.cliente || '—'}</div>
            {formData.telefono && <div className="qd-client-detail">📞 {formData.telefono}</div>}
            {formData.email && <div className="qd-client-detail">✉️ {formData.email}</div>}
            {formData.direccion && <div className="qd-client-detail">📍 {formData.direccion}</div>}
          </div>

          {/* Payment Method Info (configurable from Settings) */}
          {config.infoPago && (
            <div className="qd-info-block">
              <div className="qd-info-label">MÉTODO DE PAGO:</div>
              {config.infoPago.split('\n').map((line, i) => (
                <div key={i} className="qd-client-detail" style={{ marginTop: i === 0 ? 0 : 3 }}>{line}</div>
              ))}
            </div>
          )}
        </div>

        {/* ── ITEMS TABLE ── */}
        <div className="qd-table-wrap">
          <table className="qd-table">
            <thead>
              <tr>
                <th className="qd-th qd-th-no">No.</th>
                <th className="qd-th qd-th-desc">Descripción del artículo</th>
                <th className="qd-th qd-th-price">Precio</th>
                <th className="qd-th qd-th-qty">Cant.</th>
                <th className="qd-th qd-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Only product/service lines — no extra cost row here */}
              {formData.productos.map((line, i) => (
                <tr key={i} className={i % 2 === 1 ? 'qd-tr-alt' : ''}>
                  <td className="qd-td qd-td-no">{String(i + 1).padStart(2, '0')}</td>
                  <td className="qd-td qd-td-desc">{line.nombre || '—'}</td>
                  <td className="qd-td qd-td-price">{fmt(line.precio)}</td>
                  <td className="qd-td qd-td-qty">{line.cantidad}</td>
                  <td className="qd-td qd-td-total">{fmt(Number(line.cantidad) * Number(line.precio))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── BOTTOM: Terms + Totals ── */}
        <div className="qd-bottom-row">
          {/* Left: Terms & Notes */}
          <div className="qd-bottom-left">
            {formData.terminosCondiciones && (
              <div className="qd-terms-block">
                <div className="qd-terms-title">Términos &amp; Condiciones:</div>
                <p className="qd-terms-text">{formData.terminosCondiciones}</p>
              </div>
            )}
            {formData.notas && (
              <div className="qd-notes-block">
                <div className="qd-terms-title">Notas:</div>
                <p className="qd-terms-text">{formData.notas}</p>
              </div>
            )}
          </div>

          {/* Right: Totals box */}
          <div className="qd-totals-box">
            <div className="qd-total-row">
              <span>Subtotal:</span>
              <span>{fmt(sub)}</span>
            </div>
            {/* One row per extra */}
            {extrasArr.filter(e => Number(e.monto) > 0).map(e => (
              <div key={e.id} className="qd-total-row">
                <span>{e.concepto || 'Cargo adicional'}:</span>
                <span>{fmt(e.monto)}</span>
              </div>
            ))}
            {ivaRate > 0 && (
              <div className="qd-total-row">
                <span>IVA ({ivaRate}%):</span>
                <span>{fmt(ivaAmt)}</span>
              </div>
            )}
            {ant > 0 && (
              <div className="qd-total-row">
                <span>Anticipo ({antPct ? `${formData.anticipoPct}%` : 'acordado'}):</span>
                <span>-{fmt(ant)}</span>
              </div>
            )}
            <div className="qd-grand-total-row">
              <span>Total{ivaRate > 0 ? ' (IVA inc.)' : ''}:</span>
              <span>{fmt(tot)}</span>
            </div>
            {ant > 0 && (
              <div className="qd-saldo-row">
                <span>Saldo pendiente:</span>
                <span>{fmt(saldo)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="qd-footer">
          <span>{config.mensajePie || '¡Gracias por su preferencia!'}</span>
        </div>
      </div>
    );
  };

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StatusBadge status={c.estado} />
                      <select
                        className="form-select"
                        style={{ padding: '2px 24px 2px 6px', fontSize: 11, width: 'auto', opacity: 0.7 }}
                        value={c.estado}
                        onChange={e => updateEstado(c.id, e.target.value)}
                        title="Cambiar estado"
                      >
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </td>
                  <td><strong>{fmt(c.total)}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openView(c)} title="Ver">👁️</button>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(c)} title="Editar">✏️</button>
                      {(c.estado === 'pendiente' || c.estado === 'aprobada') && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleConvertirPedido(c)}
                          title="Enviar a Pedidos"
                          style={{ color: 'hsl(var(--success))' }}
                        >📦</button>
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

      {/* ── Modal create/edit ── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nueva cotización' : '✏️ Editar cotización'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">

                {/* Sección: Datos del cliente */}
                <div className="cot-section-label">👤 Datos del cliente</div>
                <div className="form-grid">
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Cliente *</label>
                    <div className="cliente-search-wrap" style={{ position: 'relative' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          ref={clienteInputRef}
                          className="form-input"
                          required
                          value={form.cliente}
                          onChange={e => {
                            set('cliente', e.target.value);
                            setClienteSearch(e.target.value);
                            setClienteDropdownOpen(true);
                          }}
                          onFocus={() => {
                            setClienteSearch(form.cliente);
                            setClienteDropdownOpen(true);
                          }}
                          placeholder="Escribe o selecciona un cliente"
                          autoComplete="off"
                        />
                        {clientes.length > 0 && (
                          <span style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            fontSize: 11, color: 'hsl(var(--muted))', pointerEvents: 'none',
                          }}>▼</span>
                        )}
                      </div>

                      {/* Dropdown de clientes */}
                      {clienteDropdownOpen && clientes.length > 0 && (
                        <div style={{
                          position: 'absolute', zIndex: 999, top: 'calc(100% + 4px)', left: 0, right: 0,
                          background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))',
                          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                          maxHeight: 360, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                        }}>
                          {/* Controles del dropdown */}
                          <div style={{ padding: '8px 10px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${clienteOrdenAZ ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ fontSize: 11, padding: '2px 8px', fontWeight: 700 }}
                              onMouseDown={e => { e.preventDefault(); setClienteOrdenAZ(!clienteOrdenAZ); }}
                            >A→Z</button>
                            <button
                              type="button"
                              className={`btn btn-sm ${filtroEtiquetaCliente === 'todos' ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ fontSize: 11, padding: '2px 8px' }}
                              onMouseDown={e => { e.preventDefault(); setFiltroEtiquetaCliente('todos'); }}
                            >Todos</button>
                            {Object.entries(ETIQUETAS_BASE).map(([k, v]) => (
                              <button
                                key={k}
                                type="button"
                                className={`btn btn-sm ${filtroEtiquetaCliente === k ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: 11, padding: '2px 8px' }}
                                onMouseDown={e => { e.preventDefault(); setFiltroEtiquetaCliente(k); }}
                              >{v.label}</button>
                            ))}
                            {(etiquetasPersonalizadas || []).map(et => (
                              <button
                                key={et.id}
                                type="button"
                                className={`btn btn-sm ${filtroEtiquetaCliente === et.id ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: 11, padding: '2px 8px' }}
                                onMouseDown={e => { e.preventDefault(); setFiltroEtiquetaCliente(et.id); }}
                              >{et.emoji || '🏷️'} {et.nombre}</button>
                            ))}
                          </div>

                          {/* Lista de clientes */}
                          <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                            {clientesFiltrados.length === 0 ? (
                              <div style={{ padding: '16px', textAlign: 'center', color: 'hsl(var(--muted))', fontSize: 13 }}>
                                Sin clientes que coincidan
                              </div>
                            ) : (
                              clientesFiltrados.map(c => {
                                const et = ETIQUETAS_BASE[c.etiqueta] ||
                                  (etiquetasPersonalizadas || []).find(e => e.id === c.etiqueta);
                                return (
                                  <div
                                    key={c.id}
                                    onMouseDown={e => { e.preventDefault(); seleccionarCliente(c); }}
                                    style={{
                                      padding: '10px 14px', cursor: 'pointer',
                                      borderBottom: '1px solid hsl(var(--border))',
                                      display: 'flex', alignItems: 'center', gap: 10,
                                      transition: 'background .1s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'hsl(var(--bg))'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                  >
                                    <div style={{
                                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                      background: 'hsl(var(--primary-light))',
                                      display: 'grid', placeItems: 'center',
                                      fontWeight: 700, fontSize: 13, color: 'hsl(var(--primary))',
                                    }}>
                                      {c.nombre[0]?.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nombre}</div>
                                      {c.telefono && <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>📱 {c.telefono}</div>}
                                    </div>
                                    {et && (
                                      <span style={{
                                        padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                        background: et.color, color: et.text, whiteSpace: 'nowrap', flexShrink: 0,
                                      }}>
                                        {et.label || `${et.emoji || ''} ${et.nombre || ''}`}
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
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
                    <label className="form-label">Dirección</label>
                    <input className="form-input" value={form.direccion || ''} onChange={e => set('direccion', e.target.value)} placeholder="Opcional" />
                  </div>
                </div>

                {/* Sección: Datos de la cotización */}
                <div className="cot-section-label">📋 Detalles de la cotización</div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Fecha</label>
                    <input className="form-input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Válida hasta</label>
                    <input className="form-input" type="date" value={form.validez} onChange={e => set('validez', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>

                <div className="divider" />

                {/* Sección: Productos */}
                <div className="cot-section-label">🛒 Productos / Servicios</div>
                <div className="form-group">
                  <ProductLinesInput lines={form.productos} onChange={lines => set('productos', lines)} productos={catalogo} />
                </div>

                {/* ── Cargos adicionales (múltiples) ── */}
                <div className="cot-extras-header">
                  <span className="cot-extras-title">Cargos adicionales</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addExtra}>+ Agregar cargo</button>
                </div>

                {(form.extras || []).length === 0 && (
                  <div className="cot-extras-empty">Sin cargos adicionales. Haz clic en "+ Agregar cargo" para añadir envío, diseño extra, etc.</div>
                )}

                <div className="cot-extras-list">
                  {(form.extras || []).map((ex) => (
                    <div key={ex.id} className="cot-extra-row">
                      <input
                        className="form-input cot-extra-concepto"
                        value={ex.concepto}
                        onChange={e => updateExtra(ex.id, 'concepto', e.target.value)}
                        placeholder="Concepto (ej. Envío, Urgencia...)"
                      />
                      <div className="cot-extra-monto-wrap">
                        <span className="cot-extra-prefix">$</span>
                        <input
                          className="form-input cot-extra-monto"
                          type="number"
                          min="0"
                          step="any"
                          value={ex.monto}
                          onChange={e => updateExtra(ex.id, 'monto', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon cot-extra-del"
                        onClick={() => removeExtra(ex.id)}
                        title="Eliminar cargo"
                      >✕</button>
                    </div>
                  ))}
                </div>

                {/* Totales en tiempo real */}
                <div className="cot-totales-preview">
                  <div className="cot-total-item">
                    <span>Subtotal productos</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                  {(form.extras || []).filter(e => Number(e.monto) > 0).map(e => (
                    <div key={e.id} className="cot-total-item">
                      <span>{e.concepto || 'Cargo adicional'}</span>
                      <span>+ {fmt(e.monto)}</span>
                    </div>
                  ))}
                  {form.aplicarIva && Number(form.ivaPct) > 0 && (
                    <div className="cot-total-item">
                      <span>IVA ({form.ivaPct}%)</span>
                      <span>+ {fmt(ivaAmt)}</span>
                    </div>
                  )}
                  <div className="cot-total-item cot-total-grande">
                    <span>Total{form.aplicarIva ? ' (con IVA)' : ''}</span>
                    <span>{fmt(total)}</span>
                  </div>
                </div>

                <div className="divider" />

                {/* Sección: Anticipo */}
                <div className="cot-section-label">💰 Anticipo</div>
                <div className="cot-anticipo-toggle">
                  <label className="cot-toggle-label">
                    <input
                      type="checkbox"
                      checked={form.usarPorcentajeAnticipo || false}
                      onChange={e => set('usarPorcentajeAnticipo', e.target.checked)}
                    />
                    Calcular anticipo por porcentaje
                  </label>
                </div>
                <div className="form-grid">
                  {form.usarPorcentajeAnticipo ? (
                    <div className="form-group">
                      <label className="form-label">Porcentaje de anticipo (%)</label>
                      <input
                        className="form-input"
                        type="number" min="0" max="100" step="1"
                        value={form.anticipoPct || ''}
                        onChange={e => set('anticipoPct', e.target.value === '' ? 0 : Number(e.target.value))}
                        placeholder="Ej. 50"
                      />
                      {Number(form.anticipoPct) > 0 && (
                        <span className="cot-calc-hint">= {fmt((total * Number(form.anticipoPct)) / 100)} de anticipo</span>
                      )}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Monto de anticipo</label>
                      <input
                        className="form-input"
                        type="number" min="0" step="any"
                        value={form.anticipo || ''}
                        onChange={e => set('anticipo', e.target.value === '' ? 0 : Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                  {anticipoMonto > 0 && (
                    <div className="form-group">
                      <label className="form-label">Saldo pendiente</label>
                      <div className="cot-saldo-display">{fmt(saldoPendiente)}</div>
                    </div>
                  )}
                </div>

                <div className="divider" />

                {/* Sección: IVA */}
                <div className="cot-section-label">🧾 IVA</div>
                <div className="cot-iva-row">
                  <label className="cot-toggle-label">
                    <input
                      type="checkbox"
                      checked={form.aplicarIva || false}
                      onChange={e => set('aplicarIva', e.target.checked)}
                    />
                    Aplicar IVA a esta cotización
                  </label>
                  {form.aplicarIva && (
                    <div className="cot-iva-pct-wrap">
                      <input
                        className="form-input cot-iva-input"
                        type="number"
                        min="0"
                        max="30"
                        step="1"
                        value={form.ivaPct ?? 16}
                        onChange={e => set('ivaPct', e.target.value === '' ? 16 : Number(e.target.value))}
                      />
                      <span className="cot-iva-suffix">%</span>
                      <span className="cot-calc-hint" style={{ marginTop: 0, marginLeft: 8 }}>
                        = {fmt(ivaAmt)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="divider" />

                {/* Sección: Notas */}
                <div className="cot-section-label">📝 Notas</div>
                <div className="form-group">
                  <label className="form-label">Notas internas / adicionales</label>
                  <textarea className="form-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Detalles adicionales para el cliente..." rows={3} />
                </div>

                {/* Sección: Términos y condiciones */}
                <div className="cot-section-label">📜 Términos y condiciones</div>
                <div className="form-group">
                  <label className="form-label">Términos y condiciones</label>
                  <textarea
                    className="form-textarea"
                    value={form.terminosCondiciones}
                    onChange={e => set('terminosCondiciones', e.target.value)}
                    placeholder="Ej. Anticipo del 50% para apartar fecha. Saldo al entregar. Tiempo de producción: 3 a 7 días hábiles..."
                    rows={4}
                  />
                  {negocioConfig?.terminosLocales && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => set('terminosCondiciones', negocioConfig.terminosLocales)}
                      >
                        📌 Usar términos locales
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => set('terminosCondiciones', negocioConfig.terminosNacionales || '')}
                      >
                        🚚 Usar términos nacionales
                      </button>
                    </div>
                  )}
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

      {/* ── View modal ── */}
      {modal === 'view' && (
        <div className="modal-overlay">
          <div className="modal modal-xl" ref={printRef}>
            <div className="modal-header">
              <h2>📋 Cotización {editId}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ background: '#f1f5f9', padding: '24px', overflowX: 'auto' }}>
              <QuoteDocument formData={form} quoteId={editId} />
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
              {(form.estado === 'pendiente' || form.estado === 'aprobada') && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleConvertirPedido({ ...form, id: editId, total })}
                  style={{ marginRight: 'auto', background: 'hsl(var(--success))', borderColor: 'hsl(var(--success))' }}
                >
                  📦 Enviar a Pedidos
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
