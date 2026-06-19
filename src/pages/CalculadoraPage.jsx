import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const uid = () => Math.random().toString(36).slice(2, 9);

const TIPOS_MATERIAL_DEFAULT = [
  { id: 'vinil',  label: 'Vinil adhesivo', costo: 45 },
  { id: 'lona',   label: 'Lona',           costo: 35 },
  { id: 'bond',   label: 'Bond',           costo: 8  },
  { id: 'couche', label: 'Couché',         costo: 15 },
  { id: 'subli',  label: 'Sublimación',    costo: 55 },
  { id: 'tela',   label: 'Tela',           costo: 40 },
];
// 'Otro' se agrega siempre al final en la UI pero no se persiste

const COSTOS_FIJOS_DEFAULT = [
  { id: uid(), concepto: 'Renta', monto: 0, esPersonalizado: false },
  { id: uid(), concepto: 'Luz', monto: 0, esPersonalizado: false },
  { id: uid(), concepto: 'Publicidad', monto: 0, esPersonalizado: false },
];

const EQUIPOS_DEFAULT = [];

/* ── LocalStorage helpers ───────────────────────────────────────────────── */
const LS_KEY_FIJOS = 'calc_costos_fijos';
const LS_KEY_EQUIPOS = 'calc_costos_indirectos';
const LS_KEY_PIEZAS = 'calc_piezas_mes';

function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

/* ── TABS ───────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'producto', label: '📝 Producto', emoji: '📝' },
  { id: 'materiales', label: '📦 Materiales', emoji: '📦' },
  { id: 'empaque', label: '📨 Empaque', emoji: '📨' },
  { id: 'costosFijos', label: '🏢 Costos Fijos', emoji: '🏢' },
  { id: 'costosIndirectos', label: '🔧 Costos Indirectos', emoji: '🔧' },
  { id: 'precio', label: '💹 Precio', emoji: '💹' },
];

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════════ */
export const CalculadoraPage = () => {
  const { config } = useStore();
  const iva = config.iva || 16;

  /* ── Form básico ────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('producto');
  const [form, setForm] = useState({
    producto: '',
    cantidad: 1,
    materialTipo: 'Bond',
    materialCosto: 8,
    materialTipoPersonalizado: '',
    // Modo de compra
    modoCompra: 'individual',
    costoPaquete: 0,
    cantidadPaquete: 1,
    // Producción y merma
    piezasPorUnidad: 1,
    merma: 0,
    // Mano de obra
    modoManoObra: 'pieza',  // 'pieza' | 'hora'
    costoManoObra: 50,      // por pieza (modo pieza)
    costoHora: 20,          // costo por hora (modo hora)
    horasTrabajo: 1,        // horas que tarda el trabajo
    piezasEnHoras: 30,      // cuántas piezas se producen en esas horas
    // Precio
    costoExtra: 0,
    margenGanancia: 30,
    incluirIva: false,
  });

  /* ── Costos Fijos (persisten en localStorage) ───────────────────────────── */
  const [costosFijos, setCostosFijos] = useState(() =>
    loadLS(LS_KEY_FIJOS, COSTOS_FIJOS_DEFAULT)
  );
  const [piezasMes, setPiezasMes] = useState(() =>
    loadLS(LS_KEY_PIEZAS, 100)
  );

  /* ── Equipos (Costos Indirectos) CRUD ──────────────────────────────────── */
  const [equipos, setEquipos] = useState(() =>
    loadLS(LS_KEY_EQUIPOS, EQUIPOS_DEFAULT)
  );

  /* ── Tipos de material (dinámicos, persisten en localStorage) ──────────── */
  const LS_KEY_TIPOS = 'calc_tipos_material';
  const [tiposMaterial, setTiposMaterial] = useState(() =>
    loadLS(LS_KEY_TIPOS, TIPOS_MATERIAL_DEFAULT)
  );
  const [nuevoTipo, setNuevoTipo] = useState({ label: '', costo: '' });
  const [mostrarAgregarTipo, setMostrarAgregarTipo] = useState(false);


  /* ── Materiales (lista dinámica, localStorage) ───────────────────────────── */
  const LS_KEY_MATERIALES = 'calc_materiales';
  const [materiales, setMateriales] = useState(() => {
    const saved = loadLS(LS_KEY_MATERIALES, null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved.map(m => m.modoCompra === 'metro2' ? { ...m, modoCompra: 'individual' } : m);
    }
    return [{ id: uid(), tipo: 'Bond', tipoPersonalizado: '', modoCompra: 'individual', costoUnitario: 8, costoPaquete: 0, cantidadPaquete: 1, piezasPorUnidad: 1, merma: 0 }];
  });  /* ── Empaque ─────────────────────────────────────────────────────────────────── */
  const LS_KEY_EMPAQUE = 'calc_empaque';
  const [incluirEmpaque, setIncluirEmpaque] = useState(() => loadLS('calc_incluir_empaque', false));
  const [itemsEmpaque, setItemsEmpaque] = useState(() => {
    const raw = loadLS(LS_KEY_EMPAQUE, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(item => ({
      id: item.id || uid(),
      nombre: item.nombre || '',
      activo: item.activo !== false,
      modoCompra: item.modoCompra || 'individual',
      aplicaPor: item.aplicaPor === 'paquete' ? 'lote' : (item.aplicaPor || 'pieza'),
      precioUnitario: item.precioUnitario ?? 0,
      costoPaquete: item.costoPaquete ?? 0,
      cantidadPaquete: item.cantidadPaquete ?? 1,
      cantidadUso: item.cantidadUso ?? 1,
    }));
  });

  /* ── Persist ────────────────────────────────────────────────────────────── */
  useEffect(() => { localStorage.setItem(LS_KEY_FIJOS, JSON.stringify(costosFijos)); }, [costosFijos]);
  useEffect(() => { localStorage.setItem(LS_KEY_PIEZAS, JSON.stringify(piezasMes)); }, [piezasMes]);
  useEffect(() => { localStorage.setItem(LS_KEY_EQUIPOS, JSON.stringify(equipos)); }, [equipos]);
  useEffect(() => { localStorage.setItem(LS_KEY_EMPAQUE, JSON.stringify(itemsEmpaque)); }, [itemsEmpaque]);
  useEffect(() => { localStorage.setItem('calc_incluir_empaque', JSON.stringify(incluirEmpaque)); }, [incluirEmpaque]);
  useEffect(() => { localStorage.setItem('calc_tipos_material', JSON.stringify(tiposMaterial)); }, [tiposMaterial]);
  useEffect(() => { localStorage.setItem(LS_KEY_MATERIALES, JSON.stringify(materiales)); }, [materiales]);

/* ── CRUD Materiales ─────────────────────────────────────────────────── */
  const addMaterial = () => setMateriales(prev => [...prev, {
    id: uid(), tipo: 'Bond', tipoPersonalizado: '', modoCompra: 'individual',
    costoUnitario: 8, costoPaquete: 0, cantidadPaquete: 1, piezasPorUnidad: 1, merma: 0,
  }]);

  const updateMaterial = (id, field, value) =>
    setMateriales(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

  const deleteMaterial = (id) =>
    setMateriales(prev => prev.length > 1 ? prev.filter(m => m.id !== id) : prev);

  const handleMaterialTipoChange = (id, tipo) => {
    const found = tiposMaterial.find(t => t.label === tipo);
    setMateriales(prev => prev.map(m => m.id === id ? {
      ...m, tipo,
      costoUnitario: found ? found.costo : m.costoUnitario,
      tipoPersonalizado: tipo !== 'Otro' ? '' : m.tipoPersonalizado,
    } : m));
  };

    /* ── CRUD Tipos de material ─────────────────────────────────────────────── */
  const addTipoMaterial = () => {
    if (!nuevoTipo.label.trim()) return;
    setTiposMaterial(prev => [...prev, { id: uid(), label: nuevoTipo.label.trim(), costo: Number(nuevoTipo.costo || 0) }]);
    setNuevoTipo({ label: '', costo: '' });
    setMostrarAgregarTipo(false);
  };
  const deleteTipoMaterial = (id) => {
    setTiposMaterial(prev => prev.filter(t => t.id !== id));
  };

  /* ── Setters ────────────────────────────────────────────────────────────── */
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleMaterialChange = (tipo) => {
    const found = tiposMaterial.find(t => t.label === tipo);
    setForm(f => ({
      ...f,
      materialTipo: tipo,
      materialCosto: found ? found.costo : f.materialCosto,
      materialTipoPersonalizado: tipo === 'Otro' ? f.materialTipoPersonalizado : '',
    }));
  };

  /* ── Costos Fijos CRUD ──────────────────────────────────────────────────── */
  const updateFijo = (id, field, value) =>
    setCostosFijos(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));

  const addFijo = (esPersonalizado = false) =>
    setCostosFijos(prev => [...prev, { id: uid(), concepto: esPersonalizado ? '' : 'Nuevo costo', monto: 0, esPersonalizado }]);

  const deleteFijo = (id) =>
    setCostosFijos(prev => prev.filter(f => f.id !== id));

  /* ── Equipos (Costos Indirectos) CRUD ──────────────────────────────────── */
  const addEquipo = () =>
    setEquipos(prev => [...prev, { id: uid(), nombre: '', precio: 0, anosVida: 2, activo: true }]);

  const updateEquipo = (id, field, value) =>
    setEquipos(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const deleteEquipo = (id) =>
    setEquipos(prev => prev.filter(e => e.id !== id));

  /* ── Empaque CRUD ────────────────────────────────────────────────────────────────── */
  const addItemEmpaque = () =>
    setItemsEmpaque(prev => [...prev, {
      id: uid(), nombre: '', activo: true, modoCompra: 'individual', aplicaPor: 'pieza',
      precioUnitario: 0, costoPaquete: 0, cantidadPaquete: 1, cantidadUso: 1,
    }]);

  const updateItemEmpaque = (id, field, value) =>
    setItemsEmpaque(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const deleteItemEmpaque = (id) =>
    setItemsEmpaque(prev => prev.filter(e => e.id !== id));

  /* ── Cálculos ───────────────────────────────────────────────────────────── */
  const cantidadNum   = Number(form.cantidad || 1);
  const totalFijosMes = costosFijos.reduce((acc, f) => acc + Number(f.monto || 0), 0);
  const costoFijoPorPieza = piezasMes > 0 ? totalFijosMes / Number(piezasMes) : 0;

  const totalDepreciacionMes = equipos.reduce((acc, e) => {
    if (e.activo === false) return acc;
    const anos = Number(e.anosVida || 1);
    const precio = Number(e.precio || 0);
    return acc + (anos > 0 ? precio / (anos * 12) : 0);
  }, 0);
  const costoIndirectoPorPieza = piezasMes > 0 ? totalDepreciacionMes / Number(piezasMes) : 0;

  // ── Empaque: sistema unificado ───────────────────────────────────────────
  // calcCostoUnitEmpaque: costo por unidad del material (individual o por paquete)
  const calcCostoUnitEmpaque = (item) => item.modoCompra === 'paquete'
    ? (Number(item.cantidadPaquete) > 0 ? Number(item.costoPaquete) / Number(item.cantidadPaquete) : 0)
    : Number(item.precioUnitario || 0);

  // Procesa cada item de empaque con su aporte calculado
  const empaqueItems = incluirEmpaque ? itemsEmpaque.map(item => {
    const activo = item.activo !== false;
    const costoUnit = activo ? calcCostoUnitEmpaque(item) : 0;
    const uso = Number(item.cantidadUso || 1);
    const esLote = (item.aplicaPor || 'pieza') === 'lote';
    // totalItem = costoUnit × uso (total del item para todo el pedido si lote, o costo/pieza si pieza)
    const totalItem = costoUnit * uso;
    // aportePorPieza = contribución de este item al costo de una pieza
    const aportePorPieza = esLote
      ? (cantidadNum > 0 ? totalItem / cantidadNum : 0)
      : totalItem;
    return { ...item, activo, costoUnit, uso, esLote, totalItem, aportePorPieza };
  }) : [];

  // Total de empaque por pieza (se suma a costoBasePorPieza)
  const empaquePorPieza = empaqueItems.reduce((s, i) => s + i.aportePorPieza, 0);
  // Totales para display
  const empaqueTotal_pieza = empaqueItems.filter(i => !i.esLote).reduce((s, i) => s + i.totalItem * cantidadNum, 0);
  const empaqueTotal_lote  = empaqueItems.filter(i =>  i.esLote).reduce((s, i) => s + i.totalItem, 0);
  const empaqueTotal       = empaqueTotal_pieza + empaqueTotal_lote;


  /* ── Resultados Guardados ───────────────────────────────────────────────────── */
  const LS_KEY_GUARDADOS = 'calc_resultados_guardados';
  const [resultadosGuardados, setResultadosGuardados] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY_GUARDADOS)) || []; } catch { return []; }
  });
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [expandedGuardadoId, setExpandedGuardadoId] = useState(null);
  useEffect(() => {
    localStorage.setItem(LS_KEY_GUARDADOS, JSON.stringify(resultadosGuardados));
  }, [resultadosGuardados]);

  const handleGuardar = () => {
    const snapshot = {
      id: Date.now(),
      nombre: form.producto || `Resultado ${new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`,
      fecha: new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }),
      // Datos de precio (para mostrar en el desglose)
      precioFinal, precioUnitario, costoTotal, margenMonto, ivaMonto,
      cantidadNum, margenGanancia: form.margenGanancia, incluirIva: form.incluirIva,
      // Desglose calculado
      materialCostoEfectivo, manoObraNum, costoExtraNum,
      empaqueTotal_pieza, empaqueTotal_lote,
      costoFijoPorPieza, costoIndirectoPorPieza,
      materialLabel,
      materialesSnapshot: materialesCalc.map(m => ({ nombre: m.nombre, efect: m.efect, merma: m.merma })),
      // Estado completo para poder recargar
      formSnapshot: { ...form },
      materialesFullSnapshot: materiales.map(m => ({ ...m })),
    };
    setResultadosGuardados(prev => [snapshot, ...prev].slice(0, 30));
  };


  const eliminarGuardado = (id) =>
    setResultadosGuardados(prev => prev.filter(r => r.id !== id));

  const iniciarEdicion = (r) => {
    setEditandoId(r.id);
    setEditandoNombre(r.nombre);
  };
  const confirmarEdicion = (id) => {
    setResultadosGuardados(prev => prev.map(r => r.id === id ? { ...r, nombre: editandoNombre } : r));
    setEditandoId(null);
  };

  const cargarEnCalculadora = (r) => {
    if (!r.formSnapshot || !r.materialesFullSnapshot) {
      alert('Este resultado fue guardado con una versión anterior y no tiene datos completos para recargar.');
      return;
    }
    setForm(r.formSnapshot);
    setMateriales(r.materialesFullSnapshot);
    setActiveTab('producto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Materiales: costo efectivo por pieza (suma de todos) ─────────────
  const materialesCalc = materiales.map(mat => {
    const cantPaqNum = Math.max(1, Number(mat.cantidadPaquete || 1));
    const costPaqNum = Number(mat.costoPaquete || 0);
    const piezasPorUnd = Math.max(1, Number(mat.piezasPorUnidad || 1));
    const mermaPorc = Number(mat.merma || 0);
    const costoUnit = mat.modoCompra === 'paquete'
      ? costPaqNum / cantPaqNum
      : Number(mat.costoUnitario || 0);
    const efect = (costoUnit / piezasPorUnd) * (1 + mermaPorc / 100);
    const nombre = mat.tipo === 'Otro' && mat.tipoPersonalizado ? mat.tipoPersonalizado : (mat.tipo || 'Material');
    return { ...mat, costoUnit, efect, nombre };
  });
  const materialCostoEfectivo = materialesCalc.reduce((s, m) => s + m.efect, 0);
  const costoUnitarioMaterial = materialesCalc[0]?.costoUnit || 0;
  const piezasPorUnidadNum = Math.max(1, Number(materiales[0]?.piezasPorUnidad || 1));

  // Mano de obra: por pieza (directo) o por hora (total del trabajo ÷ cantidad)
  const manoObraTotal = form.modoManoObra === 'hora'
    ? Number(form.costoHora || 0) * Number(form.horasTrabajo || 0)
    : 0;
  // Por pieza: costo directo / Por hora: el total se distribuye entre las piezas
  const manoObraNum = form.modoManoObra === 'hora'
    ? (cantidadNum > 0 ? manoObraTotal / cantidadNum : 0)
    : Number(form.costoManoObra || 0);
  const costoExtraNum = Number(form.costoExtra || 0);

  // costoBasePorPieza incluye empaque (ya con lógica pieza/paquete correcta)
  const costoBasePorPieza = materialCostoEfectivo + manoObraNum + costoExtraNum
    + costoFijoPorPieza + costoIndirectoPorPieza + empaquePorPieza;
  const costoTotal  = costoBasePorPieza * cantidadNum;
  const margenMonto = costoTotal * (Number(form.margenGanancia) / 100);
  const subtotal    = costoTotal + margenMonto;
  const ivaMonto    = form.incluirIva ? subtotal * (iva / 100) : 0;
  const precioFinal = subtotal + ivaMonto;
  const precioUnitario = cantidadNum > 0 ? precioFinal / cantidadNum : 0;

  /* ── Material label ─────────────────────────────────────────────────────── */
  const materialLabel = materialesCalc.map(m => m.nombre).join(' + ');

  /* ── Copiar ─────────────────────────────────────────────────────────────── */
  const handleCopiar = () => {
    const modoStr = materiales.map(m =>
      m.modoCompra === 'paquete'
        ? `${m.tipo} (Paquete ${m.cantidadPaquete}u · ${fmt(m.costoPaquete)})`
        : `${m.tipo} (Individual)`
    ).join(', ');
    const manoObraStr = form.modoManoObra === 'hora'
      ? `${form.horasTrabajo}h × $${form.costoHora}/h = ${fmt(manoObraTotal)}`
      : `$${form.costoManoObra}/pz`;
    const text = [
      `🧮 Cotización calculada`,
      `Producto: ${form.producto || 'Sin nombre'}`,
      `Cantidad: ${cantidadNum}`,
      `Material: ${materialLabel} [${modoStr}]`,
      materiales.some(m => m.piezasPorUnidad > 1) ? `Piezas por unidad: varios` : '',
      materiales.some(m => m.merma > 0) ? `Merma: aplicada por material` : '',
      ``,
      `Costo material:        ${fmt(materialCostoEfectivo * cantidadNum)}`,
      `Mano de obra [${manoObraStr}]:  ${fmt(manoObraNum * cantidadNum)}`,
      costoExtraNum > 0 ? `Costos extra:          ${fmt(costoExtraNum)}` : '',
      empaqueTotal_pieza > 0  ? `Empaque por pieza:   ${fmt(empaqueTotal_pieza)}` : '',
      empaqueTotal_lote  > 0  ? `Empaque por lote:    ${fmt(empaqueTotal_lote)} (costo único)` : '',
      totalFijosMes > 0 ? `Costos fijos dist.:    ${fmt(costoFijoPorPieza * cantidadNum)}` : '',
      totalDepreciacionMes > 0 ? `Costos indirectos:     ${fmt(costoIndirectoPorPieza * cantidadNum)}` : '',
      `Ganancia (${form.margenGanancia}%):       ${fmt(margenMonto)}`,
      form.incluirIva ? `IVA (${iva}%):            ${fmt(ivaMonto)}` : '',
      ``,
      `Precio por unidad:     ${fmt(precioUnitario)}`,
      `PRECIO TOTAL:          ${fmt(precioFinal)}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => alert('✅ Copiado al portapapeles'));
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">🧮 Calculadora de precios</h2>
          <p className="page-subtitle">Calcula el precio ideal para tus productos con todos los costos incluidos</p>
        </div>
      </div>

      <div className="calc-wrapper-full">
        {/* ── Left: Form con tabs ────────────────────────────────────────── */}
        <div className="calc-form-col">
          {/* Internal tabs */}
          <div className="calc-tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`calc-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="calc-tab-emoji">{tab.emoji}</span>
                <span className="calc-tab-label">{tab.label.replace(tab.emoji + ' ', '')}</span>
              </button>
            ))}
          </div>

          {/* ── TAB: Producto ──────────────────────────────────────────────── */}
          {activeTab === 'producto' && (
            <div className="card calc-panel">
              <div className="card-header">
                <span style={{ fontSize: 18 }}>📝</span>
                <span className="card-title">Datos del producto</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Nombre del producto (opcional)</label>
                  <input
                    className="form-input"
                    value={form.producto}
                    onChange={e => set('producto', e.target.value)}
                    placeholder="Ej: Tarjetas de presentación"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad a producir</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={form.cantidad}
                    onChange={e => set('cantidad', e.target.value)}
                  />
                </div>
                <div className="calc-tip">
                  💡 Completa todas las secciones usando las pestañas de arriba para obtener el precio más preciso.
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Materiales ─────────────────────────────────────────────── */}
          {activeTab === 'materiales' && (
            <div className="card calc-panel">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📦</span>
                  <span className="card-title">Materiales y mano de obra</span>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addMaterial}>
                  ＋ Agregar material
                </button>
              </div>
              <div className="card-body">

                {/* Lista dinámica de materiales */}
                {materiales.map((mat, matIdx) => (
                  <div key={mat.id} style={{
                    border: '2px solid hsl(var(--border))',
                    borderRadius: 12, padding: '14px 16px', marginBottom: 14,
                    background: 'hsl(var(--bg))', animation: 'fadeIn 0.2s ease',
                  }}>
                    {/* Cabecera: número + selector de tipo + eliminar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'hsl(var(--primary))', color: '#fff',
                        fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{matIdx + 1}</div>
                      <select className="form-select" style={{ flex: 1 }}
                        value={mat.tipo}
                        onChange={e => handleMaterialTipoChange(mat.id, e.target.value)}>
                        {tiposMaterial.map(t => (
                          <option key={t.id} value={t.label}>{t.label}</option>
                        ))}
                        <option value="Otro">Otro (personalizado)</option>
                      </select>
                      {materiales.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-sm btn-icon"
                          style={{ color: 'hsl(var(--danger))', flexShrink: 0 }}
                          onClick={() => deleteMaterial(mat.id)} title="Eliminar material">✕</button>
                      )}
                    </div>

                    {mat.tipo === 'Otro' && (
                      <div className="form-group" style={{ animation: 'fadeIn 0.2s ease', marginBottom: 10 }}>
                        <input className="form-input" value={mat.tipoPersonalizado}
                          onChange={e => updateMaterial(mat.id, 'tipoPersonalizado', e.target.value)}
                          placeholder="Especificar material (ej: Acrílico, Transfer...)" />
                      </div>
                    )}

                    {/* Modo de compra */}
                    <div className="form-group">
                      <label className="form-label">Modo de compra</label>
                      <div className="modo-compra-toggle">
                        <button type="button"
                          className={`modo-btn${mat.modoCompra === 'individual' ? ' active' : ''}`}
                          onClick={() => updateMaterial(mat.id, 'modoCompra', 'individual')}>
                          📄 Individual
                        </button>
                        <button type="button"
                          className={`modo-btn${mat.modoCompra === 'paquete' ? ' active' : ''}`}
                          onClick={() => updateMaterial(mat.id, 'modoCompra', 'paquete')}>
                          📦 Paquete
                        </button>
                      </div>
                    </div>

                    {mat.modoCompra === 'individual' && (
                      <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                        <label className="form-label">Costo por unidad de material ($)</label>
                        <input className="form-input" type="number" min="0" step="0.01"
                          value={mat.costoUnitario}
                          onChange={e => updateMaterial(mat.id, 'costoUnitario', e.target.value)}
                          placeholder="Ej: 2.00" />
                      </div>
                    )}

                    {mat.modoCompra === 'paquete' && (
                      <div style={{ animation: 'fadeIn 0.2s ease' }}>
                        <div className="form-grid">
                          <div className="form-group">
                            <label className="form-label">Costo del paquete ($)</label>
                            <input className="form-input" type="number" min="0" step="0.01"
                              value={mat.costoPaquete}
                              onChange={e => updateMaterial(mat.id, 'costoPaquete', e.target.value)}
                              placeholder="Ej: 80.00" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Unidades en el paquete</label>
                            <input className="form-input" type="number" min="1" step="1"
                              value={mat.cantidadPaquete}
                              onChange={e => updateMaterial(mat.id, 'cantidadPaquete', e.target.value)}
                              placeholder="Ej: 100" />
                          </div>
                        </div>
                        {Number(mat.cantidadPaquete) > 0 && (
                          <div className="calc-hint" style={{ marginBottom: 10 }}>
                            Costo por unidad: <strong>{fmt(Number(mat.costoPaquete) / Number(mat.cantidadPaquete))}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rendimiento del material (Individual / Paquete) */}
                    <div className="mat-section-title" style={{ marginTop: 6 }}>⚙️ Rendimiento del material</div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Piezas producibles por unidad</label>
                        <input className="form-input" type="number" min="1" step="1"
                          value={mat.piezasPorUnidad}
                          onChange={e => updateMaterial(mat.id, 'piezasPorUnidad', e.target.value)}
                          placeholder="Ej: 12" />
                        <span className="calc-hint">Ej: 12 tarjetas por hoja</span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          Desperdicio / merma: <strong style={{ color: 'hsl(var(--danger))' }}>{mat.merma}%</strong>
                        </label>
                        <input type="range" min="0" max="50" step="1"
                          value={mat.merma}
                          onChange={e => updateMaterial(mat.id, 'merma', e.target.value)}
                          style={{ width: '100%', accentColor: 'hsl(var(--danger))' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'hsl(var(--muted))' }}>
                          <span>0%</span><span>10%</span><span>20%</span><span>30%</span><span>40%</span><span>50%</span>
                        </div>
                      </div>
                    </div>

                    {/* Resultado de este material */}
                    <div className="mat-result-box" style={{ marginTop: 6 }}>
                      <div className="mat-result-row">
                        <span>Costo/pieza{Number(mat.merma) > 0 ? ' (con merma)' : ''}</span>
                        <strong>{fmt(materialesCalc[matIdx]?.efect || 0)}</strong>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total si hay más de 1 material */}
                {materiales.length > 1 && (
                  <div className="mat-result-box" style={{ marginBottom: 16, background: 'hsl(var(--primary) / 0.06)', border: '2px solid hsl(var(--primary) / 0.3)' }}>
                    <div className="mat-result-row">
                      <span>💰 Total materiales / pieza</span>
                      <strong style={{ color: 'hsl(var(--primary))' }}>{fmt(materialCostoEfectivo)}</strong>
                    </div>
                  </div>
                )}

                {/* Tipos de material guardados */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'hsl(var(--muted))', fontWeight: 600 }}>TIPOS GUARDADOS</span>
                    <button type="button" className="btn btn-ghost btn-sm"
                      style={{ fontSize: 12, padding: '2px 8px' }}
                      onClick={() => setMostrarAgregarTipo(v => !v)}>
                      {mostrarAgregarTipo ? '✕ Cancelar' : '＋ Agregar tipo'}
                    </button>
                  </div>
                  {tiposMaterial.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tiposMaterial.map(t => (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'hsl(var(--bg))', color: 'hsl(var(--foreground))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 500,
                        }}>
                          <span>{t.label}</span>
                          <span style={{ fontSize: 10, opacity: 0.7 }}>${t.costo}</span>
                          <button type="button" style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            color: 'hsl(var(--danger))', fontSize: 12, lineHeight: 1, marginLeft: 2,
                          }} onClick={() => deleteTipoMaterial(t.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {mostrarAgregarTipo && (
                    <div style={{ marginTop: 10, padding: 12, border: '1.5px dashed hsl(var(--primary))', borderRadius: 10, animation: 'fadeIn 0.2s ease' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>➕ Nuevo tipo de material</div>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Nombre</label>
                          <input className="form-input" value={nuevoTipo.label}
                            onChange={e => setNuevoTipo(p => ({ ...p, label: e.target.value }))}
                            placeholder="Ej: Papel fotográfico" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Costo sugerido ($)</label>
                          <input className="form-input" type="number" min="0" step="0.01"
                            value={nuevoTipo.costo}
                            onChange={e => setNuevoTipo(p => ({ ...p, costo: e.target.value }))}
                            placeholder="0.00" />
                        </div>
                      </div>
                      <button type="button" className="btn btn-primary btn-sm" onClick={addTipoMaterial}>
                        ✓ Agregar
                      </button>
                    </div>
                  )}
                </div>

                <div className="divider" />
                <div className="mat-section-title">👷 Mano de obra</div>

                <div className="form-group">
                  <label className="form-label">Modo de cálculo</label>
                  <div className="modo-compra-toggle">
                    <button type="button"
                      className={`modo-btn${form.modoManoObra === 'pieza' ? ' active' : ''}`}
                      onClick={() => set('modoManoObra', 'pieza')}>
                      📦 Por pieza
                    </button>
                    <button type="button"
                      className={`modo-btn${form.modoManoObra === 'hora' ? ' active' : ''}`}
                      onClick={() => set('modoManoObra', 'hora')}>
                      ⏰ Por hora
                    </button>
                  </div>
                </div>

                {form.modoManoObra === 'pieza' && (
                  <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                    <label className="form-label">Mano de obra (por pieza)</label>
                    <input className="form-input" type="number" min="0" step="0.01"
                      value={form.costoManoObra}
                      onChange={e => set('costoManoObra', e.target.value)} />
                  </div>
                )}

                {form.modoManoObra === 'hora' && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Costo por hora ($)</label>
                        <input className="form-input" type="number" min="0" step="0.01"
                          value={form.costoHora} onChange={e => set('costoHora', e.target.value)} placeholder="Ej: 30" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Horas de trabajo</label>
                        <input className="form-input" type="number" min="0" step="0.5"
                          value={form.horasTrabajo} onChange={e => set('horasTrabajo', e.target.value)} placeholder="Ej: 2" />
                      </div>
                    </div>
                    <div className="mat-result-box" style={{ margin: '0 0 12px' }}>
                      <div className="mat-result-row">
                        <span>Total por horas trabajadas</span>
                        <strong>{fmt(manoObraTotal)}</strong>
                      </div>
                      <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 4 }}>
                        {form.costoHora} $/h × {form.horasTrabajo} h = {fmt(manoObraTotal)} para {cantidadNum} pz
                      </div>
                    </div>
                  </div>
                )}

                {/* Costos extra */}
                <div className="form-group">
                  <label className="form-label">Costos extra (total del pedido)</label>
                  <input className="form-input" type="number" min="0" step="0.01"
                    value={form.costoExtra}
                    onChange={e => set('costoExtra', e.target.value)}
                    placeholder="Envío, diseño..." />
                </div>
              </div>
            </div>
          )}


          {/* ── TAB: Empaque ────────────────────────────────────────────────────── */}
          {activeTab === 'empaque' && (
            <div className="card calc-panel">
              <div className="card-header">
                <span style={{ fontSize: 18 }}>📨</span>
                <span className="card-title">Empaque del producto</span>
              </div>
              <div className="card-body">
                {/* Toggle activar empaque */}
                <div
                  className="empaque-toggle-label"
                  onClick={() => setIncluirEmpaque(v => !v)}
                  style={{ userSelect: 'none' }}
                >
                  <input
                    type="checkbox"
                    checked={incluirEmpaque}
                    onChange={e => { e.stopPropagation(); setIncluirEmpaque(e.target.checked); }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 16, height: 16, accentColor: 'hsl(var(--primary))', pointerEvents: 'none' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Incluir costos de empaque en el precio</span>
                </div>

                {incluirEmpaque && (
                  <div style={{ animation: 'fadeIn 0.2s ease', marginTop: 16 }} onClick={e => e.stopPropagation()}>

                    {/* Lista de materiales */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {empaqueItems.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'hsl(var(--muted))', fontSize: 13 }}>
                          No hay materiales. Haz clic en "+ Agregar" para comenzar.
                        </div>
                      )}

                      {empaqueItems.map(item => (
                        <div
                          key={item.id}
                          onClick={e => e.stopPropagation()}
                          style={{
                            border: `2px solid ${!item.activo ? 'hsl(var(--border))' : item.esLote ? 'hsl(var(--primary) / 0.35)' : 'hsl(var(--border))'}`,
                            borderRadius: 12, padding: '14px 16px',
                            background: !item.activo ? 'hsl(var(--bg))' : item.esLote ? 'hsl(var(--primary) / 0.04)' : 'hsl(var(--card))',
                            opacity: item.activo ? 1 : 0.45,
                            transition: 'opacity 0.25s ease, background 0.25s ease',
                          }}
                        >
                          {/* Fila 1: Toggle + Nombre + Badge modo + Total + Eliminar */}
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                            {/* Toggle activo/inactivo */}
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); updateItemEmpaque(item.id, 'activo', !item.activo); }}
                              title={item.activo ? 'Desactivar material' : 'Activar material'}
                              style={{
                                width: 38, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer',
                                background: item.activo ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                                position: 'relative', display: 'inline-block', transition: 'background 0.25s',
                                flexShrink: 0,
                              }}
                            >
                              <span style={{
                                position: 'absolute', top: 3,
                                left: item.activo ? 18 : 3,
                                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                transition: 'left 0.25s', display: 'block',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                              }} />
                            </button>
                            <input
                              className="form-input"
                              style={{ flex: 1 }}
                              value={item.nombre}
                              onChange={e => updateItemEmpaque(item.id, 'nombre', e.target.value)}
                              onClick={e => e.stopPropagation()}
                              placeholder="Nombre del material (ej: Bolsa celofán)"
                            />
                            <div style={{
                              padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                              background: item.esLote ? 'hsl(var(--primary))' : 'hsl(var(--muted) / 0.2)',
                              color: item.esLote ? '#fff' : 'hsl(var(--muted))'
                            }}>
                              {item.esLote ? 'LOTE' : 'POR PIEZA'}
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 90 }}>
                              <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>
                                {item.esLote ? 'Total pedido' : 'Costo/pieza'}
                              </div>
                              <div style={{ fontWeight: 800, fontSize: 17, color: item.activo ? 'hsl(var(--primary))' : 'hsl(var(--muted))' }}>
                                {fmt(item.totalItem)}
                              </div>
                              {item.esLote && cantidadNum > 1 && (
                                <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>
                                  = {fmt(item.aportePorPieza)}/pz
                                </div>
                              )}
                              {!item.esLote && (
                                <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>
                                  × {cantidadNum} = {fmt(item.totalItem * cantidadNum)}
                                </div>
                              )}
                            </div>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              onClick={e => { e.stopPropagation(); deleteItemEmpaque(item.id); }}
                              style={{ color: 'hsl(var(--danger))' }}
                            >✕</button>
                          </div>

                          {/* Fila 2: Modo compra + Precio + Uso + Aplica por */}
                          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 90px 150px', gap: 10, alignItems: 'end' }}>

                            {/* Modo compra */}
                            <div>
                              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 3 }}>Compra</div>
                              <select
                                className="form-select"
                                value={item.modoCompra}
                                onChange={e => { e.stopPropagation(); updateItemEmpaque(item.id, 'modoCompra', e.target.value); }}
                                onClick={e => e.stopPropagation()}
                              >
                                <option value="individual">Individual</option>
                                <option value="paquete">Paquete</option>
                              </select>
                            </div>

                            {/* Precio */}
                            <div>
                              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 3 }}>
                                {item.modoCompra === 'paquete' ? 'Costo paquete / unidades' : 'Precio unitario'}
                              </div>
                              {item.modoCompra === 'individual' ? (
                                <input
                                  className="form-input"
                                  type="number" min="0" step="0.01"
                                  value={item.precioUnitario}
                                  onChange={e => updateItemEmpaque(item.id, 'precioUnitario', e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  placeholder="$"
                                />
                              ) : (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  <input
                                    className="form-input"
                                    type="number" min="0" step="0.01"
                                    value={item.costoPaquete}
                                    onChange={e => updateItemEmpaque(item.id, 'costoPaquete', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    placeholder="$paq"
                                  />
                                  <span style={{ color: 'hsl(var(--muted))', fontWeight: 600 }}>/</span>
                                  <input
                                    className="form-input"
                                    type="number" min="1" step="1"
                                    value={item.cantidadPaquete}
                                    onChange={e => updateItemEmpaque(item.id, 'cantidadPaquete', e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    placeholder="uds"
                                    style={{ maxWidth: 70 }}
                                  />
                                  {Number(item.cantidadPaquete) > 0 && (
                                    <span style={{ fontSize: 11, color: 'hsl(var(--muted))', whiteSpace: 'nowrap' }}>
                                      = {fmt(Number(item.costoPaquete || 0) / Number(item.cantidadPaquete))}/ud
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Cantidad de uso */}
                            <div onClick={e => e.stopPropagation()}>
                              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 3 }}>
                                {item.esLote ? 'Uds. totales' : 'Uds./pieza'}
                              </div>
                              <input
                                className="form-input"
                                type="number" min="1" step="1"
                                value={item.cantidadUso}
                                onChange={e => updateItemEmpaque(item.id, 'cantidadUso', e.target.value)}
                                onClick={e => e.stopPropagation()}
                                placeholder="1"
                              />
                            </div>

                            {/* Aplica por — CRITICAL: value usa 'lote'/'pieza' */}
                            <div onClick={e => e.stopPropagation()}>
                              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 3 }}>Aplica por</div>
                              <select
                                className="form-select"
                                value={item.aplicaPor || 'pieza'}
                                onChange={e => { e.stopPropagation(); updateItemEmpaque(item.id, 'aplicaPor', e.target.value); }}
                                onClick={e => e.stopPropagation()}
                                style={{ width: '100%' }}
                              >
                                <option value="pieza">Por pieza (× cantidad)</option>
                                <option value="lote">Por lote (costo fijo)</option>
                              </select>
                              <div style={{ fontSize: 10, color: item.esLote ? 'hsl(var(--primary))' : 'hsl(var(--muted))', marginTop: 2, fontWeight: item.esLote ? 600 : 400 }}>
                                {item.esLote
                                  ? `✔ Costo fijo: ${fmt(item.totalItem)} para todo el pedido`
                                  : `c/pieza necesita ${item.uso} ud${item.uso > 1 ? 's' : ''}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 12, width: '100%' }}
                      onClick={e => { e.stopPropagation(); addItemEmpaque(); }}
                    >
                      + Agregar material de empaque
                    </button>

                    {/* Resumen total empaque */}
                    {empaqueTotal > 0 && (
                      <div style={{ marginTop: 14, borderRadius: 10, overflow: 'hidden', border: '1px solid hsl(var(--border))' }}>
                        {empaqueTotal_pieza > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: 'hsl(var(--bg))', fontSize: 13 }}>
                            <span style={{ color: 'hsl(var(--muted))' }}>Empaque por pieza (×{cantidadNum})</span>
                            <strong>{fmt(empaqueTotal_pieza)}</strong>
                          </div>
                        )}
                        {empaqueTotal_lote > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: 'hsl(var(--primary) / 0.06)', fontSize: 13 }}>
                            <span style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>Empaque lote (×1 pedido)</span>
                            <strong style={{ color: 'hsl(var(--primary))' }}>{fmt(empaqueTotal_lote)}</strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'hsl(var(--primary))', color: '#fff', fontWeight: 700, fontSize: 14 }}>
                          <span>Total empaque del pedido</span>
                          <span>{fmt(empaqueTotal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!incluirEmpaque && (
                  <div className="empty-state" style={{ padding: '32px 20px' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                    <p style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>Activa la opción de arriba para agregar materiales de empaque.</p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ── TAB: Costos Fijos ───────────────────────────────────────────── */}
          {activeTab === 'costosFijos' && (
            <div className="card calc-panel">
              <div className="card-header">
                <span style={{ fontSize: 18 }}>🏢</span>
                <span className="card-title">Costos fijos mensuales</span>
              </div>
              <div className="card-body">
                <div className="calc-tip" style={{ marginBottom: 16 }}>
                  📌 Estos costos se distribuyen entre las piezas que produces al mes para calcular cuánto le corresponde a cada pieza.
                </div>

                <div className="form-group">
                  <label className="form-label">Piezas que produces al mes</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={piezasMes}
                    onChange={e => setPiezasMes(e.target.value)}
                    placeholder="Ej: 500"
                  />
                  {Number(piezasMes) > 0 && totalFijosMes > 0 && (
                    <div className="calc-hint">
                      Costo fijo por pieza: <strong>{fmt(costoFijoPorPieza)}</strong>
                    </div>
                  )}
                </div>

                <div className="divider" />
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'hsl(var(--muted))' }}>
                  CONCEPTOS
                </div>

                <div className="fijos-table">
                  <div className="fijos-header">
                    <span>Concepto</span>
                    <span>Monto / mes</span>
                    <span></span>
                  </div>
                  {costosFijos.map(f => (
                    <div key={f.id} className="fijos-row">
                      {f.esPersonalizado ? (
                        <input
                          className="form-input"
                          value={f.concepto}
                          onChange={e => updateFijo(f.id, 'concepto', e.target.value)}
                          placeholder="Nombre del costo..."
                        />
                      ) : (
                        <span className="fijo-concepto">{f.concepto}</span>
                      )}
                      <div className="fijo-monto-wrap">
                        <span className="fijo-peso">$</span>
                        <input
                          className="form-input fijo-monto-input"
                          type="number"
                          min="0"
                          step="10"
                          value={f.monto}
                          onChange={e => updateFijo(f.id, 'monto', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => deleteFijo(f.id)}
                        title="Eliminar"
                        style={{ color: 'hsl(var(--danger))' }}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => addFijo(false)}>
                    ＋ Agregar costo
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => addFijo(true)}>
                    ✏️ Agregar personalizado
                  </button>
                </div>

                {totalFijosMes > 0 && (
                  <div className="fijo-total-bar">
                    <span>Total fijos / mes</span>
                    <strong>{fmt(totalFijosMes)}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Costos Indirectos ──────────────────────────────────────── */}
          {activeTab === 'costosIndirectos' && (
            <div className="card calc-panel">
              <div className="card-header">
                <span style={{ fontSize: 18 }}>🔧</span>
                <span className="card-title">Costos indirectos — Depreciación de equipos</span>
              </div>
              <div className="card-body">
                <div className="calc-tip" style={{ marginBottom: 16 }}>
                  🖨️ Agrega tus equipos (impresora, cortadora, etc.) y el sistema calculará automáticamente cuánto cuesta por año, mes y día. Ese costo se distribuye entre las piezas que produces.
                </div>

                {equipos.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
                    <p style={{ fontSize: 14, color: 'hsl(var(--muted))' }}>No hay equipos registrados. Agrega uno para calcular la depreciación.</p>
                  </div>
                ) : (
                  <div className="deprec-table-wrap">
                    <table className="deprec-table">
                      <thead>
                        <tr>
                          <th style={{ width: 44, textAlign: 'center' }}>Activo</th>
                          <th>Equipo</th>
                          <th>Precio total</th>
                          <th>Años de vida</th>
                          <th>Costo / año</th>
                          <th>Costo / mes</th>
                          <th>Costo / día</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipos.map(e => {
                          const anos = Number(e.anosVida || 1);
                          const precio = Number(e.precio || 0);
                          const costAnio = anos > 0 ? precio / anos : 0;
                          const costMes = costAnio / 12;
                          const costDia = costMes / 30;
                          return (
                            <tr key={e.id} style={{ opacity: e.activo === false ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <button
                                  type="button"
                                  onClick={() => updateEquipo(e.id, 'activo', e.activo !== false ? false : true)}
                                  title={e.activo === false ? 'Activar' : 'Desactivar'}
                                  style={{
                                    width: 34, height: 20, borderRadius: 99, border: 'none', cursor: 'pointer',
                                    background: e.activo === false ? 'hsl(var(--border))' : 'hsl(var(--primary))',
                                    position: 'relative', display: 'inline-block', transition: 'background 0.2s',
                                  }}
                                >
                                  <span style={{
                                    position: 'absolute', top: 3,
                                    left: e.activo === false ? 3 : 15,
                                    width: 14, height: 14, borderRadius: '50%', background: '#fff',
                                    transition: 'left 0.2s', display: 'block',
                                  }} />
                                </button>
                              </td>
                              <td>
                                <input
                                  className="form-input deprec-input"
                                  value={e.nombre}
                                  onChange={ev => updateEquipo(e.id, 'nombre', ev.target.value)}
                                  placeholder="Ej: Impresora"
                                />
                              </td>
                              <td>
                                <div className="fijo-monto-wrap">
                                  <span className="fijo-peso">$</span>
                                  <input
                                    className="form-input deprec-input"
                                    type="number"
                                    min="0"
                                    value={e.precio}
                                    onChange={ev => updateEquipo(e.id, 'precio', ev.target.value)}
                                    placeholder="0"
                                  />
                                </div>
                              </td>
                              <td>
                                <input
                                  className="form-input deprec-input deprec-anos"
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={e.anosVida}
                                  onChange={ev => updateEquipo(e.id, 'anosVida', ev.target.value)}
                                />
                              </td>
                              <td className="deprec-calc">{fmt(costAnio)}</td>
                              <td className="deprec-calc">{fmt(costMes)}</td>
                              <td className="deprec-calc">{fmt(costDia)}</td>
                              <td>
                                <button
                                  className="btn btn-ghost btn-sm btn-icon"
                                  onClick={() => deleteEquipo(e.id)}
                                  style={{ color: 'hsl(var(--danger))' }}
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={addEquipo}>
                  ＋ Agregar equipo
                </button>

                {totalDepreciacionMes > 0 && (
                  <div className="fijo-total-bar" style={{ marginTop: 16 }}>
                    <span>Total depreciación / mes</span>
                    <strong>{fmt(totalDepreciacionMes)}</strong>
                  </div>
                )}
                {totalDepreciacionMes > 0 && Number(piezasMes) > 0 && (
                  <div className="calc-hint" style={{ marginTop: 6 }}>
                    Costo indirecto por pieza: <strong>{fmt(costoIndirectoPorPieza)}</strong>
                    {' '}(distribuido entre {piezasMes} pzs/mes)
                  </div>
                )}
                {totalDepreciacionMes > 0 && Number(piezasMes) <= 0 && (
                  <div className="calc-hint" style={{ color: 'hsl(var(--warning))' }}>
                    ⚠️ Ingresa las piezas/mes en Costos Fijos para distribuir la depreciación.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: Precio ─────────────────────────────────────────────────── */}
          {activeTab === 'precio' && (
            <div className="card calc-panel">
              <div className="card-header">
                <span style={{ fontSize: 18 }}>💹</span>
                <span className="card-title">Precio de venta</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">
                    Margen de ganancia: <strong style={{ color: 'hsl(var(--primary))' }}>{form.margenGanancia}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0" max="200" step="5"
                    value={form.margenGanancia}
                    onChange={e => set('margenGanancia', e.target.value)}
                    style={{ width: '100%', accentColor: 'hsl(var(--primary))' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'hsl(var(--muted))' }}>
                    <span>0%</span><span>50%</span><span>100%</span><span>150%</span><span>200%</span>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.incluirIva}
                      onChange={e => set('incluirIva', e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'hsl(var(--primary))' }}
                    />
                    <span className="form-label" style={{ margin: 0 }}>Incluir IVA ({iva}%)</span>
                  </label>
                </div>

                {/* Mini resumen de todos los costos */}
                <div className="divider" />
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'hsl(var(--muted))' }}>
                  RESUMEN DE COSTOS POR PIEZA
                </div>
                <div className="precio-breakdown">
                  <div className="precio-row"><span>Material{materialesCalc.some(m=>m.merma>0) ? ' (con merma)' : ''}</span><span>{fmt(materialCostoEfectivo)}</span></div>
                  <div className="precio-row"><span>Mano de obra{form.modoManoObra === 'hora' ? ' (total ÷ pzs)' : ''}</span><span>{fmt(manoObraNum)}</span></div>
                  {empaqueTotal_pieza > 0 && (
                    <div className="precio-row"><span>📦 Empaque por pieza</span><span>{fmt(empaqueTotal_pieza / cantidadNum)}</span></div>
                  )}
                  {empaqueTotal_lote > 0 && (
                    <div className="precio-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span>📦 Empaque/lote (total pedido)</span>
                        <span style={{ fontWeight: 700 }}>{fmt(empaqueTotal_lote)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>
                        ÷ {cantidadNum} pzs = {fmt(empaqueTotal_lote / (cantidadNum || 1))}/pz
                      </div>
                    </div>
                  )}
                  {costoExtraNum > 0 && (
                    <div className="precio-row"><span>Extras (÷ cantidad)</span><span>{fmt(costoExtraNum / cantidadNum)}</span></div>
                  )}
                  {costoFijoPorPieza > 0 && (
                    <div className="precio-row"><span>Costos fijos dist.</span><span>{fmt(costoFijoPorPieza)}</span></div>
                  )}
                  {costoIndirectoPorPieza > 0 && (
                    <div className="precio-row"><span>Depreciación dist.</span><span>{fmt(costoIndirectoPorPieza)}</span></div>
                  )}
                  <div className="precio-row total-row"><span>Costo base / pieza</span><span>{fmt(costoBasePorPieza)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Panel de resultados ──────────────────────────────────── */}
        <div className="calc-result-col">
          <div className="calc-result">
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.75, marginBottom: 4, letterSpacing: '0.05em' }}>
              {form.producto || 'Producto'} · {cantidadNum} pz{cantidadNum !== 1 ? 's' : ''}
            </div>
            <h3>Precio total sugerido</h3>
            <div className="calc-price">{fmt(precioFinal)}</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              Por unidad: <strong>{fmt(precioUnitario)}</strong>
            </div>

            <div className="calc-breakdown">
              <div className="calc-row">
                <span>Material ({materialLabel}) × {cantidadNum}</span>
                <span>{fmt(materialCostoEfectivo * cantidadNum)}</span>
              </div>
              <div className="calc-row">
                <span>Mano de obra{form.modoManoObra === 'hora' ? ` (${form.horasTrabajo}h × $${form.costoHora})` : ''} {form.modoManoObra === 'hora' ? '× 1' : `× ${cantidadNum}`}</span>
                <span>{form.modoManoObra === 'hora' ? fmt(manoObraTotal) : fmt(manoObraNum * cantidadNum)}</span>
              </div>
              {costoExtraNum > 0 && (
                <div className="calc-row">
                  <span>Costos extra</span>
                  <span>{fmt(costoExtraNum)}</span>
                </div>
              )}
              {empaqueTotal_pieza > 0 && (
                <div className="calc-row">
                  <span>📦 Empaque por pieza × {cantidadNum}</span>
                  <span>{fmt(empaqueTotal_pieza)}</span>
                </div>
              )}
              {empaqueTotal_lote > 0 && (
                <div className="calc-row">
                  <span>📦 EMPAQUE/LOTE × 1</span>
                  <span>{fmt(empaqueTotal_lote)}</span>
                </div>
              )}
              {costoFijoPorPieza > 0 && (
                <div className="calc-row">
                  <span>Costos fijos dist. × {cantidadNum}</span>
                  <span>{fmt(costoFijoPorPieza * cantidadNum)}</span>
                </div>
              )}
              {costoIndirectoPorPieza > 0 && (
                <div className="calc-row">
                  <span>Depreciación dist. × {cantidadNum}</span>
                  <span>{fmt(costoIndirectoPorPieza * cantidadNum)}</span>
                </div>
              )}
              <div className="calc-row">
                <span>Subtotal producción</span>
                <span>{fmt(costoTotal)}</span>
              </div>
              <div className="calc-row">
                <span>Ganancia ({form.margenGanancia}%)</span>
                <span>{fmt(margenMonto)}</span>
              </div>
              {form.incluirIva && (
                <div className="calc-row">
                  <span>IVA ({iva}%)</span>
                  <span>{fmt(ivaMonto)}</span>
                </div>
              )}
              <div className="calc-row total">
                <span>PRECIO FINAL</span>
                <span>{fmt(precioFinal)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {/* Botón principal: GUARDAR */}
            <button
              className="btn btn-primary w-full"
              onClick={handleGuardar}
              style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', padding: '12px 0' }}
            >
              💾 GUARDAR RESULTADO
            </button>

            {/* Resumen rápido */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>💡 Resumen</div>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="flex-between">
                  <span className="text-muted">Costo producción:</span>
                  <strong>{fmt(costoTotal)}</strong>
                </div>
                {costoFijoPorPieza > 0 && (
                  <div className="flex-between">
                    <span className="text-muted">Fijos/mes distribuidos:</span>
                    <strong>{fmt(costoFijoPorPieza * cantidadNum)}</strong>
                  </div>
                )}
                {costoIndirectoPorPieza > 0 && (
                  <div className="flex-between">
                    <span className="text-muted">Depreciación distribuida:</span>
                    <strong>{fmt(costoIndirectoPorPieza * cantidadNum)}</strong>
                  </div>
                )}
                <div className="flex-between">
                  <span className="text-muted">Tu ganancia:</span>
                  <strong style={{ color: 'hsl(var(--success))' }}>{fmt(margenMonto)}</strong>
                </div>
                <div className="flex-between">
                  <span className="text-muted">Precio / unidad:</span>
                  <strong style={{ color: 'hsl(var(--primary))' }}>{fmt(precioUnitario)}</strong>
                </div>
              </div>
            </div>

            {/* Resultados guardados */}
            {resultadosGuardados.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderBottom: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--primary) / 0.06)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📌</span>
                    <span>RESULTADOS GUARDADOS</span>
                    <span style={{
                      background: 'hsl(var(--primary))', color: '#fff',
                      borderRadius: 99, fontSize: 11, fontWeight: 700,
                      padding: '1px 7px', marginLeft: 2,
                    }}>{resultadosGuardados.length}</span>
                  </div>
                </div>
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {resultadosGuardados.map(r => (
                    <div key={r.id} style={{
                      borderBottom: '1px solid hsl(var(--border))',
                      padding: '10px 16px',
                    }}>
                      {/* Encabezado del resultado guardado */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {editandoId === r.id ? (
                          <>
                            <input
                              className="form-input"
                              style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
                              value={editandoNombre}
                              onChange={e => setEditandoNombre(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') confirmarEdicion(r.id); if (e.key === 'Escape') setEditandoId(null); }}
                              autoFocus
                            />
                            <button className="btn btn-primary btn-sm" style={{ padding: '3px 10px', fontSize: 12 }}
                              onClick={() => confirmarEdicion(r.id)}>✓</button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: 12 }}
                              onClick={() => setEditandoId(null)}>×</button>
                          </>
                        ) : (
                          <>
                            <button
                              style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                                fontWeight: 600, fontSize: 13, color: 'hsl(var(--foreground))' }}
                              onClick={() => setExpandedGuardadoId(expandedGuardadoId === r.id ? null : r.id)}
                            >
                              {r.nombre}
                              <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.6, marginLeft: 6 }}>{r.fecha}</span>
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title="Cargar en calculadora"
                              style={{ opacity: 0.85, color: 'hsl(var(--primary))' }}
                              onClick={() => cargarEnCalculadora(r)}
                            >
                              🔄
                            </button>
                            <button className="btn btn-ghost btn-sm btn-icon" title="Editar nombre"
                              style={{ opacity: 0.7 }} onClick={() => iniciarEdicion(r)}>✏️</button>
                            <button className="btn btn-ghost btn-sm btn-icon" title="Eliminar"
                              style={{ color: 'hsl(var(--danger))', opacity: 0.8 }}
                              onClick={() => eliminarGuardado(r.id)}>🗑️</button>
                          </>
                        )}
                      </div>

                      {/* Precio destacado siempre visible */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>
                          {r.cantidadNum} pz · {r.materialLabel}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 16, color: 'hsl(var(--primary))' }}>
                          {fmt(r.precioFinal)}
                        </span>
                      </div>

                      {/* Desglose expandible */}
                      {expandedGuardadoId === r.id && (
                        <div style={{ marginTop: 10, animation: 'fadeIn 0.2s ease' }}>
                          <div style={{
                            background: 'hsl(var(--primary) / 0.06)', borderRadius: 8,
                            padding: '10px 12px', fontSize: 12,
                            display: 'flex', flexDirection: 'column', gap: 4,
                          }}>
                            {r.materialesSnapshot?.map((m, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.8 }}>{m.nombre}{m.merma > 0 ? ` +${m.merma}%` : ''} × {r.cantidadNum}</span>
                                <span>{fmt(m.efect * r.cantidadNum)}</span>
                              </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ opacity: 0.8 }}>Mano de obra × {r.cantidadNum}</span>
                              <span>{fmt(r.manoObraNum * r.cantidadNum)}</span>
                            </div>
                            {r.costoExtraNum > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.8 }}>Costos extra</span>
                                <span>{fmt(r.costoExtraNum)}</span>
                              </div>
                            )}
                            {r.empaqueTotal_pieza > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.8 }}>📦 Empaque × {r.cantidadNum}</span>
                                <span>{fmt(r.empaqueTotal_pieza)}</span>
                              </div>
                            )}
                            {r.empaqueTotal_lote > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.8 }}>📦 Empaque/lote</span>
                                <span>{fmt(r.empaqueTotal_lote)}</span>
                              </div>
                            )}
                            {r.costoFijoPorPieza > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.8 }}>Fijos dist. × {r.cantidadNum}</span>
                                <span>{fmt(r.costoFijoPorPieza * r.cantidadNum)}</span>
                              </div>
                            )}
                            {r.costoIndirectoPorPieza > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.8 }}>Depreciación dist. × {r.cantidadNum}</span>
                                <span>{fmt(r.costoIndirectoPorPieza * r.cantidadNum)}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid hsl(var(--border))', paddingTop: 4, marginTop: 2 }}>
                              <span style={{ opacity: 0.8 }}>Subtotal producción</span>
                              <span>{fmt(r.costoTotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ opacity: 0.8 }}>Ganancia ({r.margenGanancia}%)</span>
                              <span style={{ color: 'hsl(var(--success))' }}>{fmt(r.margenMonto)}</span>
                            </div>
                            {r.incluirIva && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ opacity: 0.8 }}>IVA</span>
                                <span>{fmt(r.ivaMonto)}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13, marginTop: 4 }}>
                              <span>PRECIO FINAL</span>
                              <span style={{ color: 'hsl(var(--primary))' }}>{fmt(r.precioFinal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.75 }}>
                              <span>Por unidad</span>
                              <span>{fmt(r.precioUnitario)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

