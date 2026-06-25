import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProductLinesInput } from '../components/ProductLinesInput';
import { ETIQUETAS_BASE, EtiquetaBadge } from './ClientesPage';
import { ComprobantesSection } from '../components/ComprobantesSection';
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
  anticipoActivo: false,
  anticipo: 0,
  anticipoPct: 50,
  usarPorcentajeAnticipo: true,
  fechaPagoAnticipo: '',
  metodoPago: 'efectivo',
  montoEfectivo: '',
  montoTarjeta: '',
  aplicarIva: false,
  ivaPct: 16,
  mostrarFotos: false,
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

  // ── Modal Aceptar Pedido ─────────────────────────────────────────────────
  const [aceptarModal, setAceptarModal] = useState(null); // { cot, total }
  const [aceptarForm, setAceptarForm] = useState({
    fechaEntrega: '',
    pagoHoy: true,
    montoPago: '',
    metodoPago: 'efectivo',
    montoEfectivo: '',
    montoTarjeta: '',
    registrarFinanzas: true,
  });
  const setAF = (k, v) => setAceptarForm(f => ({ ...f, [k]: v }));

  const METODOS_PAGO_COT = [
    { value: 'efectivo',      label: 'Efectivo',                  icon: '💵', color: '#16a34a', bg: '#f0fdf4' },
    { value: 'transferencia', label: 'Transferencia',             icon: '🏦', color: '#2563eb', bg: '#dbeafe' },
    { value: 'debito',        label: 'Tarjeta de débito',         icon: '💳', color: '#7c3aed', bg: '#ede9fe' },
    { value: 'credito',       label: 'Tarjeta de crédito',        icon: '💳', color: '#db2777', bg: '#fce7f3' },
    { value: 'mixto',         label: 'Mixto (efectivo+tarjeta)', icon: '🔀', color: '#d97706', bg: '#fef3c7' },
  ];

  const abrirAceptarModal = (cot, cotTotal) => {
    setAceptarModal({ cot, cotTotal });
    if (cot.anticipoActivo) {
      setAceptarForm({
        fechaEntrega: '',
        pagoHoy: true,
        montoPago: String(cot.anticipoMonto || 0),
        metodoPago: cot.metodoPago || 'efectivo',
        montoEfectivo: cot.montoEfectivo != null ? String(cot.montoEfectivo) : '',
        montoTarjeta: cot.montoTarjeta != null ? String(cot.montoTarjeta) : '',
        registrarFinanzas: true,
      });
    } else {
      setAceptarForm({
        fechaEntrega: '',
        pagoHoy: true,
        montoPago: String(cotTotal),
        metodoPago: 'efectivo',
        montoEfectivo: '',
        montoTarjeta: '',
        registrarFinanzas: true,
      });
    }
  };

  const confirmarAceptarPedido = () => {
    const { cot, cotTotal } = aceptarModal;
    // 1. Marcar cotización como aprobada
    store.updateCotizacion(cot.id, { estado: 'aprobada' });
    // 2. Crear pedido (si no existe ya)
    const yaExiste = store.getState().pedidos.some(p => p.cotizacionId === cot.id || (p.notas && p.notas.includes(cot.id)));
    if (!yaExiste) {
      let montoAnticipo = 0;
      if (aceptarForm.pagoHoy) {
        montoAnticipo = aceptarForm.metodoPago === 'mixto'
          ? (Number(aceptarForm.montoEfectivo || 0) + Number(aceptarForm.montoTarjeta || 0))
          : Number(aceptarForm.montoPago || 0);
      }
      store.addPedido({
        cliente: cot.cliente, telefono: cot.telefono, email: cot.email,
        fecha: new Date().toISOString().split('T')[0],
        fechaEntrega: aceptarForm.fechaEntrega,
        estado: 'pendiente', productos: cot.productos,
        total: cotTotal, anticipo: montoAnticipo,
        notas: cot.notas || '',
        cotizacionId: cot.id,
        costoExtra: cot.costoExtra || 0,
        metodoPago: aceptarForm.pagoHoy ? aceptarForm.metodoPago : '',
      });
      // 3. Registrar en finanzas si el usuario lo quiere
      if (aceptarForm.pagoHoy && aceptarForm.registrarFinanzas && montoAnticipo > 0) {
        const categoria = cot.productos?.[0]?.nombre || 'Ventas';
        store.addFinanza({
          tipo: 'ingreso',
          concepto: `Anticipo Cotización ${cot.id} - ${cot.cliente}`,
          monto: montoAnticipo,
          montoEfectivo: aceptarForm.metodoPago === 'mixto' ? Number(aceptarForm.montoEfectivo || 0) : null,
          montoTarjeta:  aceptarForm.metodoPago === 'mixto' ? Number(aceptarForm.montoTarjeta  || 0) : null,
          costoProd: null,
          fecha: new Date().toISOString().split('T')[0],
          categoria,
          metodoPago: aceptarForm.metodoPago,
        });
      }
    }
    setAceptarModal(null);
    if (modal) setModal(null);
    setTimeout(() => navigate('/pedidos'), 200);
  };

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
  const anticipoMonto = form.anticipoActivo
    ? (form.usarPorcentajeAnticipo
      ? (total * Number(form.anticipoPct || 0)) / 100
      : Number(form.anticipo || 0))
    : 0;
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
    if (nuevoEstado === 'aprobada' && cot) {
      abrirAceptarModal(cot, cot.total || 0);
    } else {
      store.updateCotizacion(id, { estado: nuevoEstado });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ── Helper: esperar que todas las imágenes del elemento carguen ──────────
  const waitForImages = (el) => {
    const imgs = Array.from(el.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();
    return Promise.all(imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(res => { img.onload = res; img.onerror = res; })
    ));
  };

  // ── Helper: preparar elemento para captura ──────────────────────────────
  const prepareCapture = async (element) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;overflow:visible;background:#fff;z-index:-1;';
    const clone = element.cloneNode(true);
    clone.style.cssText = 'width:794px;margin:0;padding:48px;box-sizing:border-box;border:none;box-shadow:none;min-height:1123px;';
    container.appendChild(clone);
    document.body.appendChild(container);
    // Esperar que carguen imágenes en el clon (logo, fotos de productos)
    await waitForImages(clone);
    return { container, clone };
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-quote-doc');
    if (!element) return;
    let container;
    try {
      const result = await prepareCapture(element);
      container = result.container;
      const clone = result.clone;
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
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = 794;
      const imgHeight = clone.scrollHeight;
      
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;
      
      let heightLeft = scaledHeight;
      let position = 0;
      
      // First page
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;
      
      // Add pages if long quote
      while (heightLeft > 1) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Cotizacion_${editId || 'documento'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      if (container && document.body.contains(container)) document.body.removeChild(container);
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('printable-quote-doc');
    if (!element) return;
    let container;
    try {
      const result = await prepareCapture(element);
      container = result.container;
      const clone = result.clone;
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
      if (container && document.body.contains(container)) document.body.removeChild(container);
    }
  };

  const handleConvertirPedido = (c) => {
    abrirAceptarModal(c, c.total || 0);
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Quote Document Component ─────────────────────────────────────────────
  const QuoteDocument = ({ formData, quoteId, catalogo: catalogoRef = [] }) => {
    const sub = formData.productos.reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0);
    const extrasArr = formData.extras || [];
    const extrasTotal = sumExtras(extrasArr);
    const base = sub + extrasTotal;
    const antPct = formData.usarPorcentajeAnticipo;

    // IVA por cotización (no el global de config)
    const ivaRate = formData.aplicarIva ? Number(formData.ivaPct || 0) : 0;
    const ivaAmt  = base * (ivaRate / 100);
    const tot = base + ivaAmt;

    const ant = formData.anticipoActivo
      ? (antPct
        ? (tot * Number(formData.anticipoPct || 0)) / 100
        : Number(formData.anticipo || 0))
      : 0;
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
                {formData.mostrarFotos && <th className="qd-th" style={{ width: 56 }}>Foto</th>}
                <th className="qd-th qd-th-no">No.</th>
                <th className="qd-th qd-th-desc">Descripción del artículo</th>
                <th className="qd-th qd-th-price">Precio</th>
                <th className="qd-th qd-th-qty">Cant.</th>
                <th className="qd-th qd-th-total">Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Only product/service lines — no extra cost row here */}
              {formData.productos.map((line, i) => {
                const prodCat = formData.mostrarFotos
                  ? catalogoRef.find(p => p.nombre === line.nombre)
                  : null;
                return (
                  <tr key={i} className={i % 2 === 1 ? 'qd-tr-alt' : ''}>
                    {formData.mostrarFotos && (
                      <td className="qd-td" style={{ padding: '6px 8px' }}>
                        {prodCat?.foto ? (
                          <img
                            src={prodCat.foto}
                            alt={line.nombre}
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                          />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 6, background: 'hsl(var(--bg))', border: '1px solid hsl(var(--border))', display: 'grid', placeItems: 'center', fontSize: 16 }}>📦</div>
                        )}
                      </td>
                    )}
                    <td className="qd-td qd-td-no">{String(i + 1).padStart(2, '0')}</td>
                    <td className="qd-td qd-td-desc">{line.nombre || '—'}</td>
                    <td className="qd-td qd-td-price">{fmt(line.precio)}</td>
                    <td className="qd-td qd-td-qty">{line.cantidad}</td>
                    <td className="qd-td qd-td-total">{fmt(Number(line.cantidad) * Number(line.precio))}</td>
                  </tr>
                );
              })}
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

                {/* Sección: Anticipo y Pagos */}
                <div className="cot-section-label">💰 Anticipo y Pago</div>

                {/* Toggle switch para activar anticipo */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 10,
                  background: form.anticipoActivo ? 'hsl(var(--primary) / 0.06)' : 'hsl(var(--bg))',
                  border: `1.5px solid ${form.anticipoActivo ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))'}`,
                  marginBottom: 14, transition: 'all 0.25s ease', cursor: 'pointer',
                }} onClick={() => set('anticipoActivo', !form.anticipoActivo)}>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); set('anticipoActivo', !form.anticipoActivo); }}
                    style={{
                      width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: form.anticipoActivo ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      position: 'relative', display: 'inline-block', transition: 'background 0.25s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3,
                      left: form.anticipoActivo ? 22 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.25s', display: 'block',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                    }} />
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: form.anticipoActivo ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                      {form.anticipoActivo ? '✅ Anticipo activado' : 'Activar anticipo'}
                    </div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted))', marginTop: 2 }}>
                      {form.anticipoActivo
                        ? 'El anticipo se mostrará en la cotización y se descontará del total'
                        : 'Activa cuando el cliente realice un pago de anticipo'}
                    </div>
                  </div>
                </div>

                {form.anticipoActivo && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    {/* Modo: porcentaje o monto fijo */}
                    <div className="cot-anticipo-toggle">
                      <div style={{
                        display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden',
                        border: '1.5px solid hsl(var(--border))', marginBottom: 12,
                      }}>
                        <button type="button" onClick={() => set('usarPorcentajeAnticipo', true)}
                          style={{
                            flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                            background: form.usarPorcentajeAnticipo ? 'hsl(var(--primary))' : 'transparent',
                            color: form.usarPorcentajeAnticipo ? '#fff' : 'hsl(var(--foreground))',
                          }}>
                          📊 Por porcentaje
                        </button>
                        <button type="button" onClick={() => set('usarPorcentajeAnticipo', false)}
                          style={{
                            flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                            background: !form.usarPorcentajeAnticipo ? 'hsl(var(--primary))' : 'transparent',
                            color: !form.usarPorcentajeAnticipo ? '#fff' : 'hsl(var(--foreground))',
                          }}>
                          💵 Monto fijo
                        </button>
                      </div>
                    </div>

                    <div className="form-grid">
                      {form.usarPorcentajeAnticipo ? (
                        <div className="form-group">
                          <label className="form-label">Porcentaje de anticipo (%)</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Quick buttons */}
                            {[30, 50, 70].map(p => (
                              <button key={p} type="button"
                                className={`btn btn-sm ${Number(form.anticipoPct) === p ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ padding: '4px 12px', fontSize: 13, fontWeight: 700 }}
                                onClick={() => set('anticipoPct', p)}
                              >{p}%</button>
                            ))}
                            <input
                              className="form-input"
                              type="number" min="0" max="100" step="1"
                              value={form.anticipoPct || ''}
                              onChange={e => set('anticipoPct', e.target.value === '' ? 0 : Number(e.target.value))}
                              placeholder="%"
                              style={{ width: 80, textAlign: 'center' }}
                            />
                          </div>
                          {Number(form.anticipoPct) > 0 && (
                            <span className="cot-calc-hint">= {fmt((total * Number(form.anticipoPct)) / 100)} de anticipo</span>
                          )}
                        </div>
                      ) : (
                        <div className="form-group">
                          <label className="form-label">Monto de anticipo ($)</label>
                          <input
                            className="form-input"
                            type="number" min="0" step="any"
                            value={form.anticipo || ''}
                            onChange={e => set('anticipo', e.target.value === '' ? 0 : Number(e.target.value))}
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">📅 Fecha de pago</label>
                        <input
                          className="form-input"
                          type="date"
                          value={form.fechaPagoAnticipo || ''}
                          onChange={e => set('fechaPagoAnticipo', e.target.value)}
                        />
                        <span style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 2 }}>Registra cuándo pagó el cliente</span>
                      </div>
                    </div>

                    {/* Método de pago */}
                    <div style={{ marginTop: 14, marginBottom: 14 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>💳 Método de pago</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {METODOS_PAGO_COT.map(m => {
                          const isSelected = form.metodoPago === m.value;
                          return (
                            <button key={m.value} type="button"
                              onClick={() => set('metodoPago', m.value)}
                              style={{
                                padding: '10px 12px', borderRadius: 10, border: '1.5px solid',
                                borderColor: isSelected ? m.color : 'hsl(var(--border))',
                                background: isSelected ? m.bg : 'hsl(var(--card))',
                                color: isSelected ? m.color : 'hsl(var(--foreground))',
                                cursor: 'pointer', fontWeight: 600, fontSize: 13,
                                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                              }}
                            >
                              <span style={{ fontSize: 18 }}>{m.icon}</span>{m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Desglose para mixto */}
                    {form.metodoPago === 'mixto' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        <div>
                          <label className="form-label" style={{ fontSize: 11 }}>💵 Efectivo</label>
                          <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} type="number" min="0" step="0.01" placeholder="0.00" value={form.montoEfectivo || ''} onChange={e => set('montoEfectivo', e.target.value)} />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: 11 }}>💳 Tarjeta</label>
                          <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} type="number" min="0" step="0.01" placeholder="0.00" value={form.montoTarjeta || ''} onChange={e => set('montoTarjeta', e.target.value)} />
                        </div>
                      </div>
                    )}

                    {/* Resumen visual del anticipo */}
                    {anticipoMonto > 0 && (
                      <div style={{
                        borderRadius: 10, overflow: 'hidden', marginTop: 8,
                        border: '1.5px solid hsl(var(--primary) / 0.25)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'hsl(var(--primary) / 0.06)' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--primary))' }}>
                            💰 Anticipo {form.usarPorcentajeAnticipo ? `(${form.anticipoPct}%)` : '(monto fijo)'}
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'hsl(var(--primary))' }}>{fmt(anticipoMonto)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', background: 'hsl(var(--bg))' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--danger))' }}>📋 Saldo pendiente</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: saldoPendiente > 0 ? 'hsl(var(--danger))' : 'hsl(var(--success))' }}>
                            {saldoPendiente > 0 ? fmt(saldoPendiente) : '✅ Liquidado'}
                          </span>
                        </div>
                        {form.fechaPagoAnticipo && (
                          <div style={{ padding: '6px 16px', background: 'hsl(var(--success) / 0.08)', fontSize: 12, color: 'hsl(var(--success))', fontWeight: 600, textAlign: 'center' }}>
                            ✅ Pagado el {form.fechaPagoAnticipo}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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

                {/* Sección: Opciones del documento */}
                <div className="cot-section-label">🖼️ Opciones del documento</div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 10, marginBottom: 14,
                  background: form.mostrarFotos ? 'hsl(var(--primary) / 0.06)' : 'hsl(var(--bg))',
                  border: `1.5px solid ${form.mostrarFotos ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))'}`,
                  transition: 'all 0.25s ease', cursor: 'pointer',
                }} onClick={() => set('mostrarFotos', !form.mostrarFotos)}>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); set('mostrarFotos', !form.mostrarFotos); }}
                    style={{
                      width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: form.mostrarFotos ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                      position: 'relative', display: 'inline-block', transition: 'background 0.25s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3,
                      left: form.mostrarFotos ? 22 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.25s', display: 'block',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                    }} />
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: form.mostrarFotos ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                      {form.mostrarFotos ? '📷 Fotos activadas' : 'Mostrar fotos de productos'}
                    </div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted))', marginTop: 2 }}>
                      {form.mostrarFotos
                        ? 'Las fotos del catálogo aparecerán en el documento de cotización'
                        : 'Activa para incluir las fotos de cada producto en el documento'}
                    </div>
                  </div>
                </div>

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
              <QuoteDocument formData={form} quoteId={editId} catalogo={catalogo} />
            </div>

            {/* ── Comprobantes de pago ── */}
            <div style={{ padding: '0 24px 20px' }}>
              <ComprobantesSection
                comprobantes={cotizaciones.find(c => c.id === editId)?.comprobantes || []}
                totalPedido={total}
                onAgregar={(comp) => store.addComprobanteCotizacion(editId, comp)}
                onEliminar={(cId) => store.deleteComprobanteCotizacion(editId, cId)}
              />
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
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog title="¿Eliminar cotización?" message="Esta acción no se puede deshacer." onConfirm={confirmDelete} onCancel={() => setConfirm(null)} />
      )}

      {/* ── Modal: Aceptar Pedido ── */}
      {aceptarModal && (() => {
        const { cot, cotTotal } = aceptarModal;
        const montoCalc = aceptarForm.metodoPago === 'mixto'
          ? (Number(aceptarForm.montoEfectivo || 0) + Number(aceptarForm.montoTarjeta || 0))
          : Number(aceptarForm.montoPago || 0);
        const saldoCalc = cotTotal - (aceptarForm.pagoHoy ? montoCalc : 0);
        const metActivo = METODOS_PAGO_COT.find(m => m.value === aceptarForm.metodoPago);
        return (
          <div className="modal-overlay">
            <div className="modal modal-sm" style={{ maxWidth: 480 }}>
              <div className="modal-header" style={{ background: 'hsl(var(--success))', borderRadius: '12px 12px 0 0' }}>
                <div>
                  <h2 style={{ color: '#fff', margin: 0 }}>🎉 ¡Pedido Aceptado!</h2>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>Cotización {cot.id} — {cot.cliente}</div>
                </div>
                <button className="btn btn-ghost btn-icon" style={{ color: '#fff', opacity: 0.8 }} onClick={() => setAceptarModal(null)}>✕</button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Resumen del total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'hsl(var(--bg))', borderRadius: 10, border: '1px solid hsl(var(--border))' }}>
                  <span style={{ fontSize: 14, color: 'hsl(var(--muted))' }}>Total de la cotización</span>
                  <strong style={{ fontSize: 22, color: 'hsl(var(--primary))' }}>{fmt(cotTotal)}</strong>
                </div>

                {/* Fecha de entrega */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">📅 Fecha de entrega estimada</label>
                  <input className="form-input" type="date" value={aceptarForm.fechaEntrega} onChange={e => setAF('fechaEntrega', e.target.value)} />
                </div>

                {/* Toggle: ¿Hubo pago hoy? */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    background: aceptarForm.pagoHoy ? '#f0fdf4' : 'hsl(var(--bg))',
                    border: `1.5px solid ${aceptarForm.pagoHoy ? '#16a34a' : 'hsl(var(--border))'}`,
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setAF('pagoHoy', !aceptarForm.pagoHoy)}
                >
                  <button type="button"
                    onClick={e => { e.stopPropagation(); setAF('pagoHoy', !aceptarForm.pagoHoy); }}
                    style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0, position: 'relative', transition: 'background 0.25s', background: aceptarForm.pagoHoy ? '#16a34a' : 'hsl(var(--border))' }}
                  >
                    <span style={{ position: 'absolute', top: 3, left: aceptarForm.pagoHoy ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                  </button>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: aceptarForm.pagoHoy ? '#16a34a' : 'hsl(var(--foreground))' }}>
                      {aceptarForm.pagoHoy ? '💵 El cliente pagó hoy' : 'Sin pago por ahora'}
                    </div>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted))', marginTop: 1 }}>
                      {aceptarForm.pagoHoy ? 'Registra el monto y método de pago' : 'Puedes registrarlo después en Finanzas'}
                    </div>
                  </div>
                </div>

                {/* Bloque de pago (visible si pagoHoy = true) */}
                {aceptarForm.pagoHoy && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeIn 0.2s ease' }}>

                    {/* Método de pago */}
                    <div>
                      <label className="form-label">💳 ¿Cómo pagó?</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {METODOS_PAGO_COT.map(m => (
                          <button key={m.value} type="button"
                            onClick={() => setAF('metodoPago', m.value)}
                            style={{
                              padding: '9px 10px', borderRadius: 8, border: '1.5px solid',
                              borderColor: aceptarForm.metodoPago === m.value ? m.color : 'hsl(var(--border))',
                              background: aceptarForm.metodoPago === m.value ? m.bg : 'transparent',
                              color: aceptarForm.metodoPago === m.value ? m.color : 'hsl(var(--muted))',
                              cursor: 'pointer', fontWeight: 600, fontSize: 12,
                              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{m.icon}</span>{m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Monto */}
                    {aceptarForm.metodoPago === 'mixto' ? (
                      <div>
                        <label className="form-label">Desglose del pago</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>💵 Efectivo</label>
                            <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={aceptarForm.montoEfectivo} onChange={e => setAF('montoEfectivo', e.target.value)} />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: 11 }}>💳 Tarjeta</label>
                            <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={aceptarForm.montoTarjeta} onChange={e => setAF('montoTarjeta', e.target.value)} />
                          </div>
                        </div>
                        {montoCalc > 0 && (
                          <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', fontSize: 13, fontWeight: 700, color: '#16a34a', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Total pagado:</span><span>{fmt(montoCalc)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="form-label">💰 ¿Cuánto pagó? {metActivo && <span style={{ color: metActivo.color }}>{metActivo.icon}</span>}</label>
                        <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={aceptarForm.montoPago} onChange={e => setAF('montoPago', e.target.value)} />
                        {montoCalc > 0 && montoCalc < cotTotal && (
                          <div style={{ fontSize: 12, color: 'hsl(var(--muted))', marginTop: 4 }}>
                            Saldo pendiente: <strong style={{ color: '#d97706' }}>{fmt(cotTotal - montoCalc)}</strong>
                          </div>
                        )}
                        {montoCalc >= cotTotal && montoCalc > 0 && (
                          <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4, fontWeight: 600 }}>✅ Pago total — liquidado</div>
                        )}
                      </div>
                    )}

                    {/* Toggle: registrar en finanzas */}
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        background: aceptarForm.registrarFinanzas ? '#dbeafe' : 'hsl(var(--bg))',
                        border: `1px solid ${aceptarForm.registrarFinanzas ? '#2563eb' : 'hsl(var(--border))'}`,
                      }}
                      onClick={() => setAF('registrarFinanzas', !aceptarForm.registrarFinanzas)}
                    >
                      <input type="checkbox" checked={aceptarForm.registrarFinanzas} onChange={() => {}} style={{ accentColor: '#2563eb', width: 16, height: 16 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: aceptarForm.registrarFinanzas ? '#2563eb' : 'hsl(var(--foreground))' }}>
                          📊 Registrar pago en Finanzas automáticamente
                        </div>
                        <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>Se creará un movimiento de ingreso</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumen final */}
                {aceptarForm.pagoHoy && montoCalc > 0 && (
                  <div style={{ background: 'hsl(var(--primary-light))', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'hsl(var(--muted))' }}>Pago de hoy</span>
                      <strong style={{ color: '#16a34a' }}>{fmt(montoCalc)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'hsl(var(--muted))' }}>Saldo restante</span>
                      <strong style={{ color: saldoCalc > 0 ? '#d97706' : '#16a34a' }}>
                        {saldoCalc > 0 ? fmt(saldoCalc) : '✅ Liquidado'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={() => setAceptarModal(null)}>Cancelar</button>
                <button className="btn btn-primary" style={{ background: 'hsl(var(--success))', borderColor: 'hsl(var(--success))' }} onClick={confirmarAceptarPedido}>
                  📦 Confirmar y crear pedido
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
