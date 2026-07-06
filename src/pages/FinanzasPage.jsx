import { useState, useRef } from 'react';
import { useStore, store } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ── Métodos de pago ──────────────────────────────────────────────────────────
const METODOS_PAGO = [
  { value: 'efectivo',      label: 'Efectivo',              icon: '💵', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'transferencia', label: 'Transferencia',         icon: '🏦', color: '#2563eb', bg: '#dbeafe' },
  { value: 'debito',        label: 'Tarjeta de débito',     icon: '💳', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'credito',       label: 'Tarjeta de crédito',    icon: '💳', color: '#db2777', bg: '#fce7f3' },
  { value: 'mixto',         label: 'Mixto (efectivo+tarjeta)', icon: '🔀', color: '#d97706', bg: '#fef3c7' },
];

const getMetodo = (v) => METODOS_PAGO.find(m => m.value === v) || METODOS_PAGO[0];

const MetodoBadge = ({ metodo }) => {
  if (!metodo) return null;
  const m = getMetodo(metodo);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: m.bg, color: m.color, whiteSpace: 'nowrap',
    }}>
      {m.icon} {m.label}
    </span>
  );
};

const CATEGORIAS_INGRESO = ['Ventas', 'Anticipo', 'Servicio', 'Otro'];
const CATEGORIAS_GASTO   = ['Materiales', 'Renta', 'Servicios', 'Salarios', 'Equipo', 'Otro'];

const emptyForm = () => ({
  tipo: 'ingreso', concepto: '', monto: '',
  costoProd: '',
  fecha: new Date().toISOString().split('T')[0],
  categoria: 'Ventas',
  metodoPago: 'efectivo',
  montoEfectivo: '',
  montoTarjeta: '',
});

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const MESES = [
  { value: '', label: 'Todos los meses' },
  { value: '01', label: 'Enero' },   { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },   { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },    { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },   { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

export const FinanzasPage = () => {
  const { finanzas, productos: catalogo, config } = useStore();
  const [search, setSearch]           = useState('');
  const [filtroTipo, setFiltroTipo]   = useState('todos');
  const [modal, setModal]             = useState(false);
  const [form, setForm]               = useState(emptyForm());
  const [confirm, setConfirm]         = useState(null);
  const [reporteModal, setReporteModal] = useState(false);
  const [repAnio, setRepAnio]         = useState(new Date().getFullYear().toString());
  const [repMes, setRepMes]           = useState('');
  const [generando, setGenerando]     = useState(false);

  // Filtros gráfica
  const anioActual = new Date().getFullYear().toString();
  const [chartMes, setChartMes]               = useState('');
  const [chartAnio, setChartAnio]             = useState(anioActual);
  const [chartCategoria, setChartCategoria]   = useState('todas');

  const aniosDisponibles = [...new Set(
    finanzas.map(f => f.fecha?.slice(0, 4)).filter(Boolean)
  )].sort((a, b) => b - a);
  if (!aniosDisponibles.includes(anioActual)) aniosDisponibles.unshift(anioActual);

  const todasCategorias  = [...new Set(finanzas.map(f => f.categoria).filter(Boolean))];
  const nombresCatalogo  = (catalogo || []).map(p => p.nombre).filter(Boolean);

  const filtered = finanzas.filter(f => {
    const matchSearch = f.concepto.toLowerCase().includes(search.toLowerCase()) || f.categoria.toLowerCase().includes(search.toLowerCase());
    const matchTipo   = filtroTipo === 'todos' || f.tipo === filtroTipo;
    return matchSearch && matchTipo;
  });

  // Totales de las tarjetas — filtrados por año/mes del selector de la gráfica
  const finanzasFiltradas = finanzas.filter(f => {
    const fAnio = f.fecha?.slice(0, 4);
    const fMes  = f.fecha?.slice(5, 7);
    return (!chartAnio || fAnio === chartAnio) && (!chartMes || fMes === chartMes);
  });

  const ingresos       = finanzasFiltradas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const gastos         = finanzasFiltradas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  const costoProdTotal = finanzasFiltradas.filter(f => f.tipo === 'ingreso' && f.costoProd).reduce((s, f) => s + Number(f.costoProd || 0), 0);
  const gananciaTotal  = ingresos - costoProdTotal - gastos;

  // Gráfica
  const finanzasFiltroChart = finanzas.filter(f => {
    const fAnio = f.fecha?.slice(0, 4);
    const fMes  = f.fecha?.slice(5, 7);
    return (!chartAnio || fAnio === chartAnio) && (!chartMes || fMes === chartMes) && (chartCategoria === 'todas' || f.categoria === chartCategoria);
  });

  let chartData = [];
  if (!chartMes && chartCategoria === 'todas' && chartAnio) {
    const meses = [...new Set(finanzasFiltroChart.map(f => f.fecha?.slice(5, 7)).filter(Boolean))].sort();
    chartData = meses.map(mes => {
      const label = MESES.find(m => m.value === mes)?.label?.slice(0, 3) || mes;
      const ing = finanzasFiltroChart.filter(f => f.tipo === 'ingreso' && f.fecha?.slice(5, 7) === mes).reduce((s, f) => s + f.monto, 0);
      const gas = finanzasFiltroChart.filter(f => f.tipo === 'gasto'   && f.fecha?.slice(5, 7) === mes).reduce((s, f) => s + f.monto, 0);
      return { cat: label, ingresos: ing, gastos: gas };
    });
  } else {
    const cats = [...new Set(finanzasFiltroChart.map(f => f.categoria).filter(Boolean))];
    chartData = cats.map(cat => {
      const ing = finanzasFiltroChart.filter(f => f.tipo === 'ingreso' && f.categoria === cat).reduce((s, f) => s + f.monto, 0);
      const gas = finanzasFiltroChart.filter(f => f.tipo === 'gasto'   && f.categoria === cat).reduce((s, f) => s + f.monto, 0);
      return { cat: cat.length > 10 ? cat.slice(0, 10) + '…' : cat, ingresos: ing, gastos: gas };
    });
  }

  // Guardar movimiento
  const handleSave = (e) => {
    e.preventDefault();
    let monto = Number(form.monto);
    let montoEfectivo = null;
    let montoTarjeta  = null;
    if (form.metodoPago === 'mixto') {
      montoEfectivo = Number(form.montoEfectivo || 0);
      montoTarjeta  = Number(form.montoTarjeta  || 0);
      monto = montoEfectivo + montoTarjeta;
    }
    store.addFinanza({
      ...form,
      monto,
      montoEfectivo,
      montoTarjeta,
      costoProd: form.tipo === 'ingreso' && form.costoProd !== '' ? Number(form.costoProd) : null,
    });
    setModal(false);
    setForm(emptyForm());
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Reporte PDF ────────────────────────────────────────────────────────────
  const finanzasReporte = finanzas.filter(f => {
    const fAnio = f.fecha?.slice(0, 4);
    const fMes  = f.fecha?.slice(5, 7);
    return (!repAnio || fAnio === repAnio) && (!repMes || fMes === repMes);
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const repIngresos     = finanzasReporte.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const repGastos       = finanzasReporte.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  const repCostoProd    = finanzasReporte.filter(f => f.tipo === 'ingreso' && f.costoProd).reduce((s, f) => s + Number(f.costoProd || 0), 0);
  const repGanancia     = repIngresos - repCostoProd - repGastos;
  const periodoLabel    = repMes
    ? `${MESES.find(m => m.value === repMes)?.label || repMes} ${repAnio}`
    : repAnio ? `Año ${repAnio}` : 'Todos los períodos';

  const waitForImgsRep = (el) => {
    const imgs = Array.from(el.querySelectorAll('img'));
    if (!imgs.length) return Promise.resolve();
    return Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));
  };

  const handleDescargarReporte = async (tipo = 'pdf') => {
    setGenerando(true);
    await new Promise(r => setTimeout(r, 80)); // dar tiempo al DOM a renderizar
    const el = document.getElementById('reporte-finanzas-doc');
    if (!el) { setGenerando(false); return; }
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;overflow:visible;background:#fff;z-index:-1;';
    const clone = el.cloneNode(true);
    clone.style.cssText = 'width:794px;margin:0;padding:48px;box-sizing:border-box;border:none;box-shadow:none;min-height:1123px;';
    container.appendChild(clone);
    document.body.appendChild(container);
    try {
      await waitForImgsRep(clone);
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
      
      if (tipo === 'pdf') {
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
        
        // Add pages if long report
        while (heightLeft > 1) {
          position = heightLeft - scaledHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
          heightLeft -= pdfHeight;
        }
        
        pdf.save(`Reporte_Finanzas_${periodoLabel.replace(/ /g, '_')}.pdf`);
      } else {
        const link = document.createElement('a');
        link.download = `Reporte_Finanzas_${periodoLabel.replace(/ /g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      alert('Error al generar el reporte.');
      console.error(err);
    } finally {
      if (container && document.body.contains(container)) document.body.removeChild(container);
      setGenerando(false);
    }
  };

  // ── Componente del documento de reporte ─────────────────────────────────
  const ReporteDoc = () => {
    const negocioNombre = config?.negocio || 'Mi Negocio';
    const negocioInicial = (config?.propietario || negocioNombre || 'U')[0].toUpperCase();

    return (
      <div className="qd-doc" id="reporte-finanzas-doc">
        {/* ── HEADER ── */}
        <div className="qd-header">
          {/* Left: Logo + Company */}
          <div className="qd-header-left">
            <div className="qd-logo-block">
              {config?.profilePhoto ? (
                <img src={config.profilePhoto} alt="Logo" className="qd-logo-img" />
              ) : (
                <div className="qd-logo-placeholder">{negocioInicial}</div>
              )}
              <div className="qd-company-info">
                <div className="qd-company-name">{negocioNombre}</div>
                {config?.telefono && <div className="qd-company-detail">📞 {config.telefono}</div>}
                {config?.email && <div className="qd-company-detail">✉️ {config.email}</div>}
              </div>
            </div>
          </div>

          {/* Right: REPORT title + meta */}
          <div className="qd-header-right">
            <div className="qd-invoice-title" style={{ fontSize: 24, marginBottom: 8 }}>REPORTE FINANCIERO</div>
            <div className="qd-meta-grid">
              <span className="qd-meta-label">Período:</span>
              <span className="qd-meta-value">{periodoLabel}</span>
              <span className="qd-meta-label">Generado:</span>
              <span className="qd-meta-value">
                {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* ── DIVIDER ACCENT ── */}
        <div className="qd-accent-bar" />

        {/* ── METRICS GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '20px 0 24px' }}>
          {[
            { label: 'Total Ingresos', value: fmt(repIngresos), color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '📈' },
            { label: 'Costo Producción', value: fmt(repCostoProd), color: '#d97706', bg: '#fffbeb', border: '#fef3c7', icon: '🏭' },
            { label: 'Gastos', value: fmt(repGastos), color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '📉' },
            { label: 'Ganancia Neta', value: fmt(repGanancia), color: repGanancia >= 0 ? '#16a34a' : '#dc2626', bg: repGanancia >= 0 ? '#f0fdf4' : '#fef2f2', border: repGanancia >= 0 ? '#bbf7d0' : '#fecaca', icon: repGanancia >= 0 ? '✨' : '⚠️' },
          ].map(({ label, value, color, bg, border, icon }) => (
            <div key={label} style={{
              padding: '14px 12px',
              background: bg,
              borderRadius: 10,
              border: `1.5px solid ${border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── MOVEMENTS TABLE ── */}
        <div style={{ fontWeight: 700, fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Detalle de movimientos ({finanzasReporte.length} registros)
        </div>
        <div className="qd-table-wrap" style={{ flex: 1 }}>
          <table className="qd-table">
            <thead>
              <tr>
                <th className="qd-th" style={{ width: 80 }}>Fecha</th>
                <th className="qd-th" style={{ width: 90 }}>Tipo</th>
                <th className="qd-th">Concepto</th>
                <th className="qd-th" style={{ width: 100 }}>Categoría</th>
                <th className="qd-th" style={{ width: 120 }}>Método</th>
                <th className="qd-th qd-th-total" style={{ width: 90 }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {finanzasReporte.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'hsl(var(--muted))' }}>
                    Sin movimientos en este período
                  </td>
                </tr>
              ) : (
                finanzasReporte.map((f, i) => {
                  const m = getMetodo(f.metodoPago);
                  return (
                    <tr key={f.id} className={i % 2 === 1 ? 'qd-tr-alt' : ''}>
                      <td className="qd-td" style={{ fontSize: 12 }}>{f.fecha}</td>
                      <td className="qd-td">
                        <span style={{
                          display: 'inline-flex',
                          padding: '2px 8px',
                          borderRadius: 99,
                          fontSize: 10,
                          fontWeight: 700,
                          background: f.tipo === 'ingreso' ? '#dcfce7' : '#fee2e2',
                          color: f.tipo === 'ingreso' ? '#16a34a' : '#dc2626',
                        }}>
                          {f.tipo === 'ingreso' ? '▲ Ingreso' : '▼ Gasto'}
                        </span>
                      </td>
                      <td className="qd-td" style={{ fontWeight: 600, fontSize: 12 }}>{f.concepto}</td>
                      <td className="qd-td" style={{ fontSize: 11, color: '#64748b' }}>{f.categoria}</td>
                      <td className="qd-td">
                        {f.metodoPago ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 7px',
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 700,
                            background: m.bg,
                            color: m.color
                          }}>
                            {m.icon} {m.label}
                            {f.metodoPago === 'mixto' && f.montoEfectivo != null && (
                              <span style={{ fontWeight: 400, fontSize: 9 }}> (m)</span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="qd-td qd-td-total" style={{
                        fontWeight: 800,
                        color: f.tipo === 'ingreso' ? '#16a34a' : '#dc2626'
                      }}>
                        {f.tipo === 'ingreso' ? '+' : '-'}{fmt(f.monto)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── TOTAL GANANCIA NETA ── */}
        {finanzasReporte.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 14,
            marginBottom: 20
          }}>
            <div className="qd-totals-box" style={{ width: 280, padding: '10px 14px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Ganancia Neta:</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: repGanancia >= 0 ? '#16a34a' : '#dc2626' }}>
                  {repGanancia >= 0 ? '+' : ''}{fmt(repGanancia)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">💰 Finanzas</h2>
          <p className="page-subtitle">Control de ingresos y gastos</p>
        </div>
        <div className="finanzas-header-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setReporteModal(true)}>📥 Reporte PDF</button>
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setModal(true); }}>+ Registrar movimiento</button>
        </div>
      </div>

      {/* Summary */}
      <div className="finanzas-summary">
        <div className="balance-card positive">
          <div className="balance-label">💰 Total Bruto</div>
          <div className="balance-amount">{fmt(ingresos)}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
            {chartAnio || chartMes
              ? `${chartMes ? MESES.find(m => m.value === chartMes)?.label + ' ' : ''}${chartAnio || ''}`.trim()
              : 'Total facturado a clientes'}
          </div>
        </div>
        <div className="balance-card negative">
          <div className="balance-label">🏧 Costo Producción</div>
          <div className="balance-amount">{fmt(costoProdTotal + gastos)}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Prod: {fmt(costoProdTotal)} + Gastos: {fmt(gastos)}</div>
        </div>
        <div className={`balance-card ${gananciaTotal >= 0 ? 'neutral' : 'negative'}`}>
          <div className="balance-label">{gananciaTotal >= 0 ? '✨' : '⚠️'} Ganancia Total</div>
          <div className="balance-amount">{fmt(gananciaTotal)}</div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Bruto − Costos</div>
        </div>
      </div>

      {/* Chart */}
      {finanzas.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <span className="card-title">Movimientos por producto / servicio</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
              <select className="form-select" style={{ padding: '4px 28px 4px 8px', fontSize: 12, height: 32 }} value={chartAnio} onChange={e => setChartAnio(e.target.value)}>
                <option value="">Todos los años</option>
                {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select className="form-select" style={{ padding: '4px 28px 4px 8px', fontSize: 12, height: 32 }} value={chartMes} onChange={e => setChartMes(e.target.value)}>
                {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <select className="form-select" style={{ padding: '4px 28px 4px 8px', fontSize: 12, height: 32 }} value={chartCategoria} onChange={e => setChartCategoria(e.target.value)}>
                <option value="todas">Todos los productos</option>
                {nombresCatalogo.length > 0 && (
                  <optgroup label="📌 Productos del catálogo">
                    {nombresCatalogo.map(n => <option key={n} value={n}>{n}</option>)}
                  </optgroup>
                )}
                {todasCategorias.filter(c => !nombresCatalogo.includes(c)).length > 0 && (
                  <optgroup label="Otras categorías">
                    {todasCategorias.filter(c => !nombresCatalogo.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="cat" tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v, n) => [`$${v.toLocaleString('es-MX')}`, n === 'ingresos' ? 'Ingresos' : 'Gastos']} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Legend />
                <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" fill="hsl(142 60% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span>🔍</span>
          <input placeholder="Buscar movimiento..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="quote-tabs-container">
          <div className="quote-tabs">
            {['todos', 'ingreso', 'gasto'].map(t => (
              <button key={t} className={`tab ${filtroTipo === t ? 'active' : ''}`} onClick={() => setFiltroTipo(t)}>
                {t === 'todos' ? 'Todos' : t === 'ingreso' ? '📈 Ingresos' : '📉 Gastos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💰</div>
          <h3>Sin movimientos</h3>
          <p>Registra tu primer ingreso o gasto.</p>
          <button className="btn btn-primary" onClick={() => setModal(true)}>Registrar movimiento</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Método de pago</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => { const d = new Date(b.fecha) - new Date(a.fecha); return d !== 0 ? d : (b.id || 0) - (a.id || 0); }).map(f => (
                <tr key={f.id}>
                  <td><StatusBadge status={f.tipo} /></td>
                  <td><div style={{ fontWeight: 600 }}>{f.concepto}</div></td>
                  <td><span style={{ fontSize: 12, background: 'hsl(var(--bg))', padding: '2px 8px', borderRadius: 99, color: 'hsl(var(--muted))' }}>{f.categoria}</span></td>
                  <td>
                    {f.metodoPago ? (
                      <div>
                        <MetodoBadge metodo={f.metodoPago} />
                        {f.metodoPago === 'mixto' && f.montoEfectivo != null && (
                          <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 3 }}>
                            💵 {fmt(f.montoEfectivo)} ef. + 💳 {fmt(f.montoTarjeta)} tj.
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'hsl(var(--muted))', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{f.fecha}</td>
                  <td>
                    <strong style={{ color: f.tipo === 'ingreso' ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>
                      {f.tipo === 'ingreso' ? '+' : '-'}{fmt(f.monto)}
                    </strong>
                    {f.tipo === 'ingreso' && f.costoProd != null && (
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 2 }}>
                        Costo: {fmt(f.costoProd)} → <span style={{ color: 'hsl(var(--success))' }}>{fmt(f.monto - f.costoProd)}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirm({ id: f.id })} style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Nuevo movimiento ──────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>➕ Nuevo movimiento</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">

                {/* Tipo */}
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <div className="tabs" style={{ width: '100%' }}>
                    {['ingreso', 'gasto'].map(t => (
                      <button key={t} type="button" className={`tab ${form.tipo === t ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => set('tipo', t)}>
                        {t === 'ingreso' ? '📈 Ingreso' : '📉 Gasto'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Concepto */}
                <div className="form-group">
                  <label className="form-label">Concepto *</label>
                  <input className="form-input" required value={form.concepto} onChange={e => set('concepto', e.target.value)} placeholder="Descripción del movimiento" />
                </div>

                {/* Categoría */}
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                    {form.tipo === 'ingreso' ? (
                      <>
                        <optgroup label="General">
                          {CATEGORIAS_INGRESO.map(c => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                        {nombresCatalogo.length > 0 && (
                          <optgroup label="📌 Producto del catálogo">
                            {nombresCatalogo.map(n => <option key={n} value={n}>{n}</option>)}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)
                    )}
                  </select>
                </div>

                {/* Método de pago */}
                <div className="form-group">
                  <label className="form-label">💳 Método de pago</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {METODOS_PAGO.map(m => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => set('metodoPago', m.value)}
                        style={{
                          padding: '9px 10px', borderRadius: 8, border: '1.5px solid',
                          borderColor: form.metodoPago === m.value ? m.color : 'hsl(var(--border))',
                          background: form.metodoPago === m.value ? m.bg : 'transparent',
                          color: form.metodoPago === m.value ? m.color : 'hsl(var(--muted))',
                          cursor: 'pointer', fontWeight: 600, fontSize: 12,
                          display: 'flex', alignItems: 'center', gap: 6,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monto */}
                {form.metodoPago === 'mixto' ? (
                  <div>
                    <label className="form-label">Desglose del pago *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>💵 Efectivo</label>
                        <input className="form-input" type="number" min="0" step="0.01" value={form.montoEfectivo} onChange={e => set('montoEfectivo', e.target.value)} placeholder="0.00" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>💳 Tarjeta</label>
                        <input className="form-input" type="number" min="0" step="0.01" value={form.montoTarjeta} onChange={e => set('montoTarjeta', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    {(Number(form.montoEfectivo) + Number(form.montoTarjeta)) > 0 && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'hsl(var(--primary-light))', fontSize: 13, fontWeight: 700, color: 'hsl(var(--primary))', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total combinado:</span>
                        <span>{fmt(Number(form.montoEfectivo || 0) + Number(form.montoTarjeta || 0))}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Monto *</label>
                    <input className="form-input" type="number" min="0" step="0.01" required value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0.00" />
                  </div>
                )}

                {/* Costo de producción (solo ingresos) */}
                {form.tipo === 'ingreso' && (
                  <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                    <label className="form-label">
                      🏧 Costo de producción <span style={{ fontSize: 11, fontWeight: 400, color: 'hsl(var(--muted))' }}>opcional</span>
                    </label>
                    <input
                      className="form-input" type="number" min="0" step="0.01"
                      value={form.costoProd} onChange={e => set('costoProd', e.target.value)}
                      placeholder="Cuánto te costó producir este trabajo"
                    />
                    {form.monto && form.costoProd && Number(form.costoProd) > 0 && (
                      <div style={{ marginTop: 6, fontSize: 12, display: 'flex', gap: 14 }}>
                        <span style={{ color: 'hsl(var(--muted))' }}>Ganancia: <strong style={{ color: 'hsl(var(--success))' }}>{fmt(Number(form.monto) - Number(form.costoProd))}</strong></span>
                        <span style={{ color: 'hsl(var(--muted))' }}>Margen: <strong style={{ color: 'hsl(var(--primary))' }}>{Math.round(((Number(form.monto) - Number(form.costoProd)) / Number(form.monto)) * 100)}%</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Fecha */}
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input className="form-input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost btn-modal-cancel" onClick={() => setModal(false)}>Cancelar</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={form.metodoPago === 'mixto' && (Number(form.montoEfectivo || 0) + Number(form.montoTarjeta || 0)) === 0}
                >✓ Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Reporte PDF ──────────────────────────────────────────────────── */}
      {reporteModal && (
        <div className="modal-overlay">
          <div className="modal modal-xl" style={{ maxWidth: 960 }}>
            <div className="modal-header">
              <h2>📊 Reporte de Finanzas</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setReporteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Controles de filtro */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, padding: '14px 16px', background: 'hsl(var(--bg))', borderRadius: 10, border: '1px solid hsl(var(--border))', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>📅 Período:</span>
                <select className="form-select" style={{ width: 'auto' }} value={repAnio} onChange={e => setRepAnio(e.target.value)}>
                  <option value="">Todos los años</option>
                  {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select className="form-select" style={{ width: 'auto' }} value={repMes} onChange={e => setRepMes(e.target.value)}>
                  {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <span style={{ marginLeft: 'auto', fontSize: 13, color: 'hsl(var(--muted))' }}>
                  {finanzasReporte.length} movimientos encontrados
                </span>
              </div>

              {/* Preview del reporte */}
              <div style={{ background: '#f1f5f9', padding: 20, borderRadius: 10, overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
                <ReporteDoc />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-modal-cancel" onClick={() => setReporteModal(false)}>Cerrar</button>
              <button className="btn btn-secondary" disabled={generando} onClick={() => handleDescargarReporte('imagen')}>
                {generando ? '⏳ Generando…' : '🖼️ Guardar imagen'}
              </button>
              <button className="btn btn-primary" disabled={generando} onClick={() => handleDescargarReporte('pdf')}>
                {generando ? '⏳ Generando…' : '📥 Descargar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog title="¿Eliminar movimiento?" message="Esta acción no se puede deshacer." onConfirm={() => { store.deleteFinanza(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
};
