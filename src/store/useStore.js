import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── helpers ──────────────────────────────────────────────────────────────────
export const getLocalDateString = (dateOrOffset = new Date()) => {
  let date;
  if (typeof dateOrOffset === 'number') {
    date = new Date();
    date.setDate(date.getDate() + dateOrOffset);
  } else {
    date = dateOrOffset;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return { ...fallback, ...parsed };
    }
    return parsed;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// ── Cloud sync ────────────────────────────────────────────────────────────────
export const loadFromCloud = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data ? { data: data.data, updated_at: data.updated_at } : null;
  } catch (e) {
    console.warn('No se pudo cargar desde la nube:', e.message);
    return null;
  }
};

// Reintentos con backoff exponencial: 1s, 2s, 4s
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

export const saveToCloud = async (userId, data, _attempt = 1) => {
  // Emitir evento de pendiente en el primer intento
  if (_attempt === 1) {
    window.dispatchEvent(new CustomEvent('sep:sync:pending'));
  }

  try {
    const { data: dbRow, error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: userId, data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select('updated_at')
      .single();
    if (error) throw error;

    // ✅ Éxito — notificar al agente
    const counts = `${data.pedidos?.length ?? 0} pedidos, ${data.cotizaciones?.length ?? 0} cotizaciones`;
    if (dbRow && dbRow.updated_at) {
      localStorage.setItem('sep_local_last_save', dbRow.updated_at);
    } else {
      localStorage.setItem('sep_local_last_save', new Date().toISOString());
    }
    window.dispatchEvent(new CustomEvent('sep:sync:success', { detail: { detail: counts } }));
  } catch (e) {
    console.warn(`[sync] Intento ${_attempt}/${MAX_RETRIES} fallido:`, e.message);

    if (_attempt < MAX_RETRIES) {
      // Notificar al agente del reintento
      window.dispatchEvent(new CustomEvent('sep:sync:retry', {
        detail: { attempt: _attempt + 1, max: MAX_RETRIES }
      }));

      // Esperar con backoff exponencial
      const delay = RETRY_BASE_MS * Math.pow(2, _attempt - 1);
      await new Promise(r => setTimeout(r, delay));

      // Reintentar recursivamente
      return saveToCloud(userId, data, _attempt + 1);
    }

    // ❌ Agotamos reintentos — notificar al agente y lanzar error
    window.dispatchEvent(new CustomEvent('sep:sync:error', {
      detail: { message: 'Error al guardar en la nube', detail: e.message }
    }));
    window.dispatchEvent(new CustomEvent('sep:sync:retryfail', {
      detail: { message: e.message }
    }));
    console.error('[sync] Falló tras', MAX_RETRIES, 'intentos:', e.message);
    throw e; // re-lanzar para que App.jsx pueda marcar el flag de pendiente
  }
};


// ── seed data (vacío — cada usuario empieza limpio) ──────────────────────────
const seedProductos = [];

const seedPedidos = [];

const seedCotizaciones = [];

const seedClientes = [];

const seedFinanzas = [];

// Categorías de productos por defecto
const seedCategorias = [
  { id: 'cat-1', nombre: 'Impresión',   emoji: '🖨️', color: '#DBEAFE', text: '#1E40AF' },
  { id: 'cat-2', nombre: 'Banners',     emoji: '🎌', color: '#D1FAE5', text: '#065F46' },
  { id: 'cat-3', nombre: 'Sublimación', emoji: '🌡️', color: '#FEE2E2', text: '#991B1B' },
  { id: 'cat-4', nombre: 'Bordado',     emoji: '🧵', color: '#FCE7F3', text: '#9D174D' },
  { id: 'cat-5', nombre: 'Diseño',      emoji: '🎨', color: '#E8D5FF', text: '#6B21A8' },
  { id: 'cat-6', nombre: 'Digital',     emoji: '💻', color: '#FEF9C3', text: '#854D0E' },
  { id: 'cat-7', nombre: 'Otro',        emoji: '📦', color: '#F3F4F6', text: '#374151' },
];

// Canales de venta por defecto
const seedCanalesVenta = [
  { id: 'canal-1', nombre: 'WhatsApp', emoji: '💬', color: '#DCFCE7', text: '#15803d' },
  { id: 'canal-2', nombre: 'Instagram', emoji: '📸', color: '#FCE7F3', text: '#be185d' },
  { id: 'canal-3', nombre: 'Facebook', emoji: '👤', color: '#DBEAFE', text: '#1d4ed8' },
  { id: 'canal-4', nombre: 'Local/Taller', emoji: '🏪', color: '#F3F4F6', text: '#374151' },
  { id: 'canal-5', nombre: 'Otro', emoji: '🌐', color: '#FEF9C3', text: '#a16207' },
];

const seedEtiquetasPedidos = [
  { id: 'urgente',    nombre: 'Urgente',     emoji: '🔴', color: '#fee2e2', text: '#991b1b' },
  { id: 'vip',        nombre: 'VIP',         emoji: '⭐', color: '#fef9c3', text: '#854d0e' },
  { id: 'corporativo',nombre: 'Corporativo', emoji: '🏢', color: '#dbeafe', text: '#1e40af' },
  { id: 'diseno',     nombre: 'Diseño',      emoji: '🎨', color: '#ede9fe', text: '#6b21a8' },
  { id: 'repetido',   nombre: 'Repetido',    emoji: '🔁', color: '#d1fae5', text: '#065f46' },
  { id: 'express',    nombre: 'Express',     emoji: '⚡', color: '#fce7f3', text: '#9d174d' },
  { id: 'mayoreo',    nombre: 'Mayoreo',     emoji: '📦', color: '#f3f4f6', text: '#374151' },
];

// ── main store hook ───────────────────────────────────────────────────────────
const loadAndHealPedidos = () => {
  let pedidos = load('sep_pedidos', seedPedidos);
  const idsVistos = new Set();
  let huboDuplicados = false;
  let maxIdNum = 0;

  pedidos.forEach(p => {
    const n = parseInt((p.id || '').replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > maxIdNum) maxIdNum = n;
  });

  pedidos = pedidos.map(p => {
    if (!p.id || idsVistos.has(p.id)) {
      huboDuplicados = true;
      maxIdNum += 1;
      const nuevoId = 'P' + String(maxIdNum).padStart(4, '0');
      idsVistos.add(nuevoId);
      return { ...p, id: nuevoId };
    }
    idsVistos.add(p.id);
    return p;
  });

  if (huboDuplicados) {
    save('sep_pedidos', pedidos);
    localStorage.setItem('sep_ped_counter', maxIdNum);
  }
  return pedidos;
};

const loadAndHealCotizaciones = () => {
  let cotizaciones = load('sep_cotizaciones', seedCotizaciones);
  const idsVistos = new Set();
  let huboDuplicados = false;
  let maxIdNum = 0;

  cotizaciones.forEach(c => {
    const n = parseInt((c.id || '').replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > maxIdNum) maxIdNum = n;
  });

  cotizaciones = cotizaciones.map(c => {
    if (!c.id || idsVistos.has(c.id)) {
      huboDuplicados = true;
      maxIdNum += 1;
      const nuevoId = 'C' + String(maxIdNum).padStart(4, '0');
      idsVistos.add(nuevoId);
      return { ...c, id: nuevoId };
    }
    idsVistos.add(c.id);
    return c;
  });

  if (huboDuplicados) {
    save('sep_cotizaciones', cotizaciones);
    localStorage.setItem('sep_cot_counter', maxIdNum);
  }
  return cotizaciones;
};

let listeners = [];
let state = {
  productos: load('sep_productos', seedProductos),
  combos: load('sep_combos', []),
  pedidos: loadAndHealPedidos(),
  cotizaciones: loadAndHealCotizaciones(),
  finanzas: load('sep_finanzas', seedFinanzas),
  clientes: load('sep_clientes', seedClientes),
  etiquetasPersonalizadas: load('sep_etiquetas', []),
  categoriasProducto: load('sep_categorias_producto', seedCategorias),
  canalesVenta: load('sep_canales_venta', seedCanalesVenta),
  etiquetasPedidos: load('sep_etiquetas_pedidos', seedEtiquetasPedidos),
  config: load('sep_config', {
    appName: 'PrintMeiker',
    profilePhoto: '',
    negocio: '',
    propietario: '',
    telefono: '',
    email: '',
    moneda: 'MXN',
    iva: 16,
    infoPago: '',
    mensajePie: '¡Gracias por su preferencia!',
  }),
  negocioConfig: load('sep_negocio_config', {
    ingresoMensualDeseado: 15000,
    horasProductivasSemanales: 30,
    pedidosActualesMes: 10,
    capacidadMensual: 20,
    gastosFijos: [
      { id: '1', nombre: 'Renta', monto: 2500, categoria: 'Fijo' },
      { id: '2', nombre: 'Internet', monto: 350, categoria: 'Fijo' },
    ],
    anticipoLocalPct: 50,
    anticipoNacionalPct: 70,
    terminosLocales: 'Entrega en punto acordado o recolección en taller.\nAnticipo del 50% para apartar fecha. Saldo al entregar.\nTiempo de producción: 3 a 7 días hábiles según la pieza.',
    terminosNacionales: 'Envío por paquetería a tu cargo o cotizado aparte.\nAnticipo del 70% antes de iniciar producción.\nSaldo antes de enviar. Tiempo: 5 a 10 días hábiles.',
  }),
  alertasPedidos: load('sep_alertas_pedidos', {
    diasAmarillos: 3,
    diasRojos: 1,
  }),
  themeColor: load('sep_theme', '#1f51d3') === '#c9506b' ? '#1f51d3' : load('sep_theme', '#1f51d3'),
  darkMode: load('sep_dark_mode', false),
  notas: load('sep_notas', []),
  categoriasNotas: load('sep_categorias_notas', [
    { id: 'personal',   label: 'Personal',   emoji: '👤', color: '#6366f1' },
    { id: 'negocio',    label: 'Negocio',    emoji: '💼', color: '#0ea5e9' },
    { id: 'ideas',      label: 'Ideas',      emoji: '💡', color: '#f59e0b' },
    { id: 'tarea',      label: 'Tareas',     emoji: '✅', color: '#22c55e' },
    { id: 'importante', label: 'Importante', emoji: '🔴', color: '#ef4444' },
  ]),
  deferredPrompt: null,
  pwaInstalled: false,
};

const notify = () => listeners.forEach(fn => fn({ ...state }));

const setState = (partial) => {
  state = { ...state, ...partial };
  notify();
};

export const store = {
  getState: () => state,
  subscribe: (fn) => {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },
  setDeferredPrompt: (p) => setState({ deferredPrompt: p }),
  setPwaInstalled: (installed) => setState({ pwaInstalled: installed }),

  // ── productos ──
  addProducto: (p) => {
    const productos = [...state.productos, { ...p, id: Date.now().toString() }];
    save('sep_productos', productos);
    setState({ productos });
  },
  updateProducto: (id, p) => {
    const productos = state.productos.map(x => x.id === id ? { ...x, ...p } : x);
    save('sep_productos', productos);
    setState({ productos });
  },
  deleteProducto: (id) => {
    const productos = state.productos.filter(x => x.id !== id);
    save('sep_productos', productos);
    setState({ productos });
  },

  // ── combos ──
  addCombo: (c) => {
    const combos = [...state.combos, { ...c, id: 'combo-' + Date.now().toString() }];
    save('sep_combos', combos);
    setState({ combos });
  },
  updateCombo: (id, c) => {
    const combos = state.combos.map(x => x.id === id ? { ...x, ...c } : x);
    save('sep_combos', combos);
    setState({ combos });
  },
  deleteCombo: (id) => {
    const combos = state.combos.filter(x => x.id !== id);
    save('sep_combos', combos);
    setState({ combos });
  },

  // ── pedidos ──
  addPedido: (p) => {
    const defaultCanal = (state.canalesVenta && state.canalesVenta[0]?.id) || 'canal-1';
    const stored   = parseInt(localStorage.getItem('sep_ped_counter') || '0', 10);
    const maxExist = state.pedidos.reduce((max, x) => {
      const n = parseInt((x.id || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const next = Math.max(stored, maxExist) + 1;
    localStorage.setItem('sep_ped_counter', next);
    const id = 'P' + String(next).padStart(4, '0');

    const newPedido = { canal: defaultCanal, ...p, id };
    const pedidos = [...state.pedidos, newPedido];
    save('sep_pedidos', pedidos);
    setState({ pedidos });
  },
  addPedidoReturn: (p) => {
    const defaultCanal = (state.canalesVenta && state.canalesVenta[0]?.id) || 'canal-1';
    const stored   = parseInt(localStorage.getItem('sep_ped_counter') || '0', 10);
    const maxExist = state.pedidos.reduce((max, x) => {
      const n = parseInt((x.id || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const next = Math.max(stored, maxExist) + 1;
    localStorage.setItem('sep_ped_counter', next);
    const id = 'P' + String(next).padStart(4, '0');

    const newPedido = { canal: defaultCanal, ...p, id };
    const pedidos = [...state.pedidos, newPedido];
    save('sep_pedidos', pedidos);
    setState({ pedidos });
    return newPedido;
  },
  updatePedido: (id, p) => {
    const pedidos = state.pedidos.map(x => x.id === id ? { ...x, ...p } : x);
    save('sep_pedidos', pedidos);
    setState({ pedidos });
  },
  deletePedido: (id) => {
    const pedidos = state.pedidos.filter(x => x.id !== id);
    save('sep_pedidos', pedidos);
    setState({ pedidos });
  },

  // ── comprobantes de pedido ──
  addComprobantePedido: (pedidoId, comprobante) => {
    const pedidos = state.pedidos.map(x =>
      x.id === pedidoId
        ? { ...x, comprobantes: [...(x.comprobantes || []), comprobante] }
        : x
    );
    save('sep_pedidos', pedidos);
    setState({ pedidos });
  },
  deleteComprobantePedido: (pedidoId, comprobanteId) => {
    const pedidos = state.pedidos.map(x =>
      x.id === pedidoId
        ? { ...x, comprobantes: (x.comprobantes || []).filter(c => c.id !== comprobanteId) }
        : x
    );
    save('sep_pedidos', pedidos);
    setState({ pedidos });
  },

  // ── cotizaciones ──
  addCotizacion: (c) => {
    // Contador secuencial persistente — lee el más alto entre lo guardado y los IDs existentes
    const stored   = parseInt(localStorage.getItem('sep_cot_counter') || '0', 10);
    const maxExist = state.cotizaciones.reduce((max, x) => {
      const n = parseInt((x.id || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const next = Math.max(stored, maxExist) + 1;
    localStorage.setItem('sep_cot_counter', next);
    const id = 'C' + String(next).padStart(4, '0');
    const cotizaciones = [...state.cotizaciones, { ...c, id }];
    save('sep_cotizaciones', cotizaciones);
    setState({ cotizaciones });
  },
  updateCotizacion: (id, c) => {
    const cotizaciones = state.cotizaciones.map(x => x.id === id ? { ...x, ...c } : x);
    save('sep_cotizaciones', cotizaciones);
    setState({ cotizaciones });
  },
  deleteCotizacion: (id) => {
    const cotizaciones = state.cotizaciones.filter(x => x.id !== id);
    save('sep_cotizaciones', cotizaciones);
    setState({ cotizaciones });
  },

  // ── comprobantes de cotización ──
  addComprobanteCotizacion: (cotId, comprobante) => {
    const cotizaciones = state.cotizaciones.map(x =>
      x.id === cotId
        ? { ...x, comprobantes: [...(x.comprobantes || []), comprobante] }
        : x
    );
    save('sep_cotizaciones', cotizaciones);
    setState({ cotizaciones });
  },
  deleteComprobanteCotizacion: (cotId, comprobanteId) => {
    const cotizaciones = state.cotizaciones.map(x =>
      x.id === cotId
        ? { ...x, comprobantes: (x.comprobantes || []).filter(c => c.id !== comprobanteId) }
        : x
    );
    save('sep_cotizaciones', cotizaciones);
    setState({ cotizaciones });
  },

  // ── finanzas ──
  addFinanza: (f) => {
    const stored   = parseInt(localStorage.getItem('sep_fin_counter') || '0', 10);
    const maxExist = state.finanzas.reduce((max, x) => {
      const n = parseInt((x.id || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const next = Math.max(stored, maxExist) + 1;
    localStorage.setItem('sep_fin_counter', next);
    const id = 'F' + String(next).padStart(4, '0');

    const finanzas = [...state.finanzas, { ...f, id }];
    save('sep_finanzas', finanzas);
    setState({ finanzas });
  },
  updateFinanza: (id, f) => {
    const finanzas = state.finanzas.map(x => x.id === id ? { ...x, ...f } : x);
    save('sep_finanzas', finanzas);
    setState({ finanzas });
  },
  deleteFinanza: (id) => {
    const finanzas = state.finanzas.filter(x => x.id !== id);
    save('sep_finanzas', finanzas);
    setState({ finanzas });
  },

  // ── clientes ──
  addCliente: (c) => {
    const stored   = parseInt(localStorage.getItem('sep_cli_counter') || '0', 10);
    const maxExist = state.clientes.reduce((max, x) => {
      const n = parseInt((x.id || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const next = Math.max(stored, maxExist) + 1;
    localStorage.setItem('sep_cli_counter', next);
    const id = 'CL' + String(next).padStart(4, '0');

    const clientes = [...state.clientes, { ...c, id, fechaRegistro: getLocalDateString() }];
    save('sep_clientes', clientes);
    setState({ clientes });
  },
  updateCliente: (id, c) => {
    const clientes = state.clientes.map(x => x.id === id ? { ...x, ...c } : x);
    save('sep_clientes', clientes);
    setState({ clientes });
  },
  deleteCliente: (id) => {
    const clientes = state.clientes.filter(x => x.id !== id);
    save('sep_clientes', clientes);
    setState({ clientes });
  },

  // ── etiquetas personalizadas ──
  addEtiqueta: (etiqueta) => {
    const etiquetasPersonalizadas = [...state.etiquetasPersonalizadas, { ...etiqueta, id: 'ET' + Date.now().toString().slice(-5) }];
    save('sep_etiquetas', etiquetasPersonalizadas);
    setState({ etiquetasPersonalizadas });
  },
  updateEtiqueta: (id, etiqueta) => {
    const etiquetasPersonalizadas = state.etiquetasPersonalizadas.map(x => x.id === id ? { ...x, ...etiqueta } : x);
    save('sep_etiquetas', etiquetasPersonalizadas);
    setState({ etiquetasPersonalizadas });
  },
  deleteEtiqueta: (id) => {
    const etiquetasPersonalizadas = state.etiquetasPersonalizadas.filter(x => x.id !== id);
    save('sep_etiquetas', etiquetasPersonalizadas);
    setState({ etiquetasPersonalizadas });
  },

  // ── etiquetas pedidos ──
  addEtiquetaPedido: (et) => {
    const etiquetasPedidos = [...state.etiquetasPedidos, { ...et, id: 'ETP' + Date.now().toString().slice(-5) }];
    save('sep_etiquetas_pedidos', etiquetasPedidos);
    setState({ etiquetasPedidos });
  },
  updateEtiquetaPedido: (id, et) => {
    const etiquetasPedidos = state.etiquetasPedidos.map(x => x.id === id ? { ...x, ...et } : x);
    save('sep_etiquetas_pedidos', etiquetasPedidos);
    setState({ etiquetasPedidos });
  },
  deleteEtiquetaPedido: (id) => {
    const etiquetasPedidos = state.etiquetasPedidos.filter(x => x.id !== id);
    save('sep_etiquetas_pedidos', etiquetasPedidos);
    setState({ etiquetasPedidos });
  },

  // ── categorias producto ──
  addCategoriaProducto: (cat) => {
    const categoriasProducto = [...state.categoriasProducto, { ...cat, id: 'cat-' + Date.now().toString().slice(-6) }];
    save('sep_categorias_producto', categoriasProducto);
    setState({ categoriasProducto });
  },
  updateCategoriaProducto: (id, cat) => {
    const categoriasProducto = state.categoriasProducto.map(x => x.id === id ? { ...x, ...cat } : x);
    save('sep_categorias_producto', categoriasProducto);
    setState({ categoriasProducto });
  },
  deleteCategoriaProducto: (id) => {
    const categoriasProducto = state.categoriasProducto.filter(x => x.id !== id);
    save('sep_categorias_producto', categoriasProducto);
    setState({ categoriasProducto });
  },
  resetCategoriasProducto: () => {
    save('sep_categorias_producto', seedCategorias);
    setState({ categoriasProducto: seedCategorias });
  },

  // ── canales de venta ──
  addCanalVenta: (c) => {
    const canalesVenta = [...state.canalesVenta, { ...c, id: 'canal-' + Date.now().toString().slice(-6) }];
    save('sep_canales_venta', canalesVenta);
    setState({ canalesVenta });
  },
  updateCanalVenta: (id, c) => {
    const canalesVenta = state.canalesVenta.map(x => x.id === id ? { ...x, ...c } : x);
    save('sep_canales_venta', canalesVenta);
    setState({ canalesVenta });
  },
  deleteCanalVenta: (id) => {
    const canalesVenta = state.canalesVenta.filter(x => x.id !== id);
    save('sep_canales_venta', canalesVenta);
    setState({ canalesVenta });
  },
  resetCanalesVenta: () => {
    save('sep_canales_venta', seedCanalesVenta);
    setState({ canalesVenta: seedCanalesVenta });
  },

  // ── config ──
  updateConfig: (c) => {
    const config = { ...state.config, ...c };
    save('sep_config', config);
    setState({ config });
  },
  updateNegocioConfig: (c) => {
    const negocioConfig = { ...state.negocioConfig, ...c };
    save('sep_negocio_config', negocioConfig);
    setState({ negocioConfig });
  },
  updateAlertasPedidos: (a) => {
    const alertasPedidos = { ...state.alertasPedidos, ...a };
    save('sep_alertas_pedidos', alertasPedidos);
    setState({ alertasPedidos });
  },

  // ── notas ──
  addNota: (nota) => {
    const notas = [nota, ...state.notas];
    save('sep_notas', notas);
    setState({ notas });
  },
  updateNota: (id, nota) => {
    const notas = state.notas.map(x => x.id === id ? { ...x, ...nota } : x);
    save('sep_notas', notas);
    setState({ notas });
  },
  deleteNota: (id) => {
    const notas = state.notas.filter(x => x.id !== id);
    save('sep_notas', notas);
    setState({ notas });
  },

  // ── categorias de notas ──
  addCategoriaNota: (cat) => {
    const categoriasNotas = [...state.categoriasNotas, cat];
    save('sep_categorias_notas', categoriasNotas);
    setState({ categoriasNotas });
  },
  updateCategoriaNota: (id, cat) => {
    const categoriasNotas = state.categoriasNotas.map(x => x.id === id ? { ...x, ...cat } : x);
    save('sep_categorias_notas', categoriasNotas);
    setState({ categoriasNotas });
  },
  deleteCategoriaNota: (id) => {
    const categoriasNotas = state.categoriasNotas.filter(x => x.id !== id);
    save('sep_categorias_notas', categoriasNotas);
    setState({ categoriasNotas });
  },

  // ── theme ──
  setTheme: (color) => {
    save('sep_theme', color);
    setState({ themeColor: color });
    applyTheme(color, state.darkMode);
  },
  setDarkMode: (isDark) => {
    save('sep_dark_mode', isDark);
    setState({ darkMode: isDark });
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    applyTheme(state.themeColor, isDark);
  },

  // ── restore backup data ──
  restoreBackupData: (data) => {
    if (!data || typeof data !== 'object') return;

    // Helper para obtener el ID secuencial máximo
    const getMaxIdNum = (arr) => {
      if (!Array.isArray(arr)) return 0;
      return arr.reduce((max, item) => {
        const n = parseInt((item.id || '').replace(/[^0-9]/g, ''), 10);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
    };

    // Guardar cada sección en localStorage
    if (data.productos !== undefined) save('sep_productos', data.productos);
    if (data.combos !== undefined) save('sep_combos', data.combos);
    if (data.pedidos !== undefined) {
      save('sep_pedidos', data.pedidos);
      localStorage.setItem('sep_ped_counter', getMaxIdNum(data.pedidos));
    }
    if (data.cotizaciones !== undefined) {
      save('sep_cotizaciones', data.cotizaciones);
      localStorage.setItem('sep_cot_counter', getMaxIdNum(data.cotizaciones));
    }
    if (data.finanzas !== undefined) {
      save('sep_finanzas', data.finanzas);
      localStorage.setItem('sep_fin_counter', getMaxIdNum(data.finanzas));
    }
    if (data.clientes !== undefined) {
      save('sep_clientes', data.clientes);
      localStorage.setItem('sep_cli_counter', getMaxIdNum(data.clientes));
    }
    if (data.etiquetasPersonalizadas !== undefined) save('sep_etiquetas', data.etiquetasPersonalizadas);
    if (data.categoriasProducto !== undefined) save('sep_categorias_producto', data.categoriasProducto);
    if (data.canalesVenta !== undefined) save('sep_canales_venta', data.canalesVenta);
    if (data.config !== undefined) save('sep_config', data.config);
    if (data.negocioConfig !== undefined) save('sep_negocio_config', data.negocioConfig);
    if (data.alertasPedidos !== undefined) save('sep_alertas_pedidos', data.alertasPedidos);
    if (data.themeColor !== undefined) save('sep_theme', data.themeColor);
    if (data.darkMode !== undefined) save('sep_dark_mode', data.darkMode);
    if (data.notas !== undefined) save('sep_notas', data.notas);
    if (data.categoriasNotas !== undefined) save('sep_categorias_notas', data.categoriasNotas);
    if (data.etiquetasPedidos !== undefined) save('sep_etiquetas_pedidos', data.etiquetasPedidos);

    // Recargar estado
    store.reloadFromLocalStorage();
    localStorage.setItem('sep_pending_cloud_sync', 'true');
  },

  // ── reload from localStorage (para sincronización con la nube) ──
  reloadFromLocalStorage: () => {
    const isDark = load('sep_dark_mode', false);
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    const newState = {
      productos:              load('sep_productos', seedProductos),
      combos:                 load('sep_combos', []),
      pedidos:                loadAndHealPedidos(),
      cotizaciones:           loadAndHealCotizaciones(),
      finanzas:               load('sep_finanzas', seedFinanzas),
      clientes:               load('sep_clientes', seedClientes),
      etiquetasPersonalizadas:load('sep_etiquetas', []),
      categoriasProducto:     load('sep_categorias_producto', seedCategorias),
      canalesVenta:           load('sep_canales_venta', seedCanalesVenta),
      config:                 load('sep_config', state.config),
      negocioConfig:          load('sep_negocio_config', state.negocioConfig),
      alertasPedidos:         load('sep_alertas_pedidos', state.alertasPedidos),
      themeColor:             load('sep_theme', '#1f51d3'),
      darkMode:               isDark,
      notas:                  load('sep_notas', []),
      categoriasNotas:        load('sep_categorias_notas', state.categoriasNotas),
      etiquetasPedidos:       load('sep_etiquetas_pedidos', seedEtiquetasPedidos),
    };
    state = { ...state, ...newState };
    applyTheme(state.themeColor, isDark);
    notify();
  },
};

// ── theme system ──────────────────────────────────────────────────────────────
export const THEMES = {
  '#1f51d3': {
    '--primary': '223 74% 48%',
    '--primary-light': '223 74% 94%',
    '--primary-dark': '223 74% 38%',
    '--primary-rgb': '31, 81, 211',
    '--accent': '223 74% 48%',
    '--bg': '223 50% 98%',
    '--sidebar-bg': '223 35% 98%',
    '--sidebar-active': '223 35% 93%',
    name: 'Azul PrintMeiker',
  },
  '#c9506b': {
    '--primary': '347 53% 55%',
    '--primary-light': '347 53% 92%',
    '--primary-dark': '347 53% 40%',
    '--primary-rgb': '201, 80, 107',
    '--accent': '10 72% 56%',
    '--bg': '347 60% 97%',
    '--sidebar-bg': '347 40% 97%',
    '--sidebar-active': '347 35% 92%',
    name: 'Rosa',
  },
  '#8ecae6': {
    '--primary': '199 65% 73%',
    '--primary-light': '199 65% 92%',
    '--primary-dark': '199 65% 43%',
    '--primary-rgb': '142, 202, 230',
    '--accent': '199 65% 43%',
    '--bg': '200 60% 97%',
    '--sidebar-bg': '199 40% 96%',
    '--sidebar-active': '199 40% 90%',
    name: 'Azul claro',
  },
  '#219ebc': {
    '--primary': '194 69% 43%',
    '--primary-light': '194 69% 88%',
    '--primary-dark': '194 69% 28%',
    '--primary-rgb': '33, 158, 188',
    '--accent': '205 97% 14%',
    '--bg': '194 50% 97%',
    '--sidebar-bg': '194 35% 96%',
    '--sidebar-active': '194 35% 91%',
    name: 'Teal',
  },
  '#023047': {
    '--primary': '205 97% 14%',
    '--primary-light': '205 40% 88%',
    '--primary-dark': '205 97% 8%',
    '--primary-rgb': '2, 48, 71',
    '--accent': '194 69% 43%',
    '--bg': '210 15% 97%',
    '--sidebar-bg': '210 15% 96%',
    '--sidebar-active': '210 15% 91%',
    name: 'Marino',
  },
  '#ffb703': {
    '--primary': '42 100% 51%',
    '--primary-light': '42 100% 90%',
    '--primary-dark': '42 100% 35%',
    '--primary-rgb': '255, 183, 3',
    '--accent': '28 100% 49%',
    '--bg': '42 80% 97%',
    '--sidebar-bg': '42 60% 96%',
    '--sidebar-active': '42 50% 91%',
    name: 'Amarillo',
  },
  '#fb8500': {
    '--primary': '28 100% 49%',
    '--primary-light': '28 100% 90%',
    '--primary-dark': '28 100% 32%',
    '--primary-rgb': '251, 133, 0',
    '--accent': '42 100% 51%',
    '--bg': '28 80% 97%',
    '--sidebar-bg': '28 60% 96%',
    '--sidebar-active': '28 50% 91%',
    name: 'Naranja',
  },
  // ── Nuevos colores vibrantes ──────────────────────────────────────────────
  '#7c3aed': {
    '--primary': '263 70% 58%',
    '--primary-light': '263 70% 94%',
    '--primary-dark': '263 70% 40%',
    '--primary-rgb': '124, 58, 237',
    '--accent': '280 65% 60%',
    '--bg': '263 60% 98%',
    '--sidebar-bg': '263 40% 97%',
    '--sidebar-active': '263 35% 92%',
    name: 'Morado',
  },
  '#059669': {
    '--primary': '161 80% 30%',
    '--primary-light': '161 80% 92%',
    '--primary-dark': '161 80% 20%',
    '--primary-rgb': '5, 150, 105',
    '--accent': '142 70% 40%',
    '--bg': '161 50% 97%',
    '--sidebar-bg': '161 35% 96%',
    '--sidebar-active': '161 30% 91%',
    name: 'Esmeralda',
  },
  '#dc2626': {
    '--primary': '0 72% 51%',
    '--primary-light': '0 72% 93%',
    '--primary-dark': '0 72% 38%',
    '--primary-rgb': '220, 38, 38',
    '--accent': '14 90% 55%',
    '--bg': '0 60% 98%',
    '--sidebar-bg': '0 40% 97%',
    '--sidebar-active': '0 35% 92%',
    name: 'Rojo vivo',
  },
  '#db2777': {
    '--primary': '330 75% 52%',
    '--primary-light': '330 75% 93%',
    '--primary-dark': '330 75% 38%',
    '--primary-rgb': '219, 39, 119',
    '--accent': '350 80% 60%',
    '--bg': '330 60% 98%',
    '--sidebar-bg': '330 40% 97%',
    '--sidebar-active': '330 35% 92%',
    name: 'Fucsia',
  },
  '#0ea5e9': {
    '--primary': '199 89% 48%',
    '--primary-light': '199 89% 92%',
    '--primary-dark': '199 89% 32%',
    '--primary-rgb': '14, 165, 233',
    '--accent': '213 93% 68%',
    '--bg': '199 65% 97%',
    '--sidebar-bg': '199 45% 96%',
    '--sidebar-active': '199 40% 91%',
    name: 'Cielo',
  },
  '#ca8a04': {
    '--primary': '38 92% 40%',
    '--primary-light': '38 92% 92%',
    '--primary-dark': '38 92% 26%',
    '--primary-rgb': '202, 138, 4',
    '--accent': '28 95% 52%',
    '--bg': '38 70% 97%',
    '--sidebar-bg': '38 50% 96%',
    '--sidebar-active': '38 45% 91%',
    name: 'Dorado',
  },
  '#65a30d': {
    '--primary': '84 77% 35%',
    '--primary-light': '84 77% 92%',
    '--primary-dark': '84 77% 22%',
    '--primary-rgb': '101, 163, 13',
    '--accent': '140 70% 42%',
    '--bg': '84 55% 97%',
    '--sidebar-bg': '84 38% 96%',
    '--sidebar-active': '84 35% 91%',
    name: 'Lima',
  },
  '#0891b2': {
    '--primary': '191 90% 36%',
    '--primary-light': '191 90% 92%',
    '--primary-dark': '191 90% 24%',
    '--primary-rgb': '8, 145, 178',
    '--accent': '199 80% 48%',
    '--bg': '191 60% 97%',
    '--sidebar-bg': '191 42% 96%',
    '--sidebar-active': '191 38% 91%',
    name: 'Cian',
  },
  '#4f46e5': {
    '--primary': '243 75% 59%',
    '--primary-light': '243 75% 93%',
    '--primary-dark': '243 75% 42%',
    '--primary-rgb': '79, 70, 229',
    '--accent': '260 70% 62%',
    '--bg': '243 55% 98%',
    '--sidebar-bg': '243 38% 97%',
    '--sidebar-active': '243 32% 92%',
    name: 'Índigo',
  },
  // ── Colores adicionales ───────────────────────────────────────────────────
  '#f43f5e': {
    '--primary': '347 86% 61%',
    '--primary-light': '347 86% 93%',
    '--primary-dark': '347 86% 44%',
    '--primary-rgb': '244, 63, 94',
    '--accent': '330 80% 62%',
    '--bg': '347 70% 98%',
    '--sidebar-bg': '347 48% 97%',
    '--sidebar-active': '347 40% 92%',
    name: 'Coral',
  },
  '#10b981': {
    '--primary': '160 84% 39%',
    '--primary-light': '160 84% 91%',
    '--primary-dark': '160 84% 25%',
    '--primary-rgb': '16, 185, 129',
    '--accent': '142 72% 42%',
    '--bg': '160 55% 97%',
    '--sidebar-bg': '160 38% 96%',
    '--sidebar-active': '160 32% 91%',
    name: 'Menta',
  },
  '#a78bfa': {
    '--primary': '254 88% 75%',
    '--primary-light': '254 88% 94%',
    '--primary-dark': '254 88% 52%',
    '--primary-rgb': '167, 139, 250',
    '--accent': '270 80% 72%',
    '--bg': '254 60% 98%',
    '--sidebar-bg': '254 42% 97%',
    '--sidebar-active': '254 36% 92%',
    name: 'Lavanda',
  },
  '#92400e': {
    '--primary': '28 72% 31%',
    '--primary-light': '28 72% 92%',
    '--primary-dark': '28 72% 18%',
    '--primary-rgb': '146, 64, 14',
    '--accent': '38 88% 48%',
    '--bg': '28 52% 97%',
    '--sidebar-bg': '28 36% 96%',
    '--sidebar-active': '28 30% 91%',
    name: 'Café',
  },
  '#475569': {
    '--primary': '215 28% 37%',
    '--primary-light': '215 28% 92%',
    '--primary-dark': '215 28% 22%',
    '--primary-rgb': '71, 85, 105',
    '--accent': '215 30% 55%',
    '--bg': '215 20% 97%',
    '--sidebar-bg': '215 15% 96%',
    '--sidebar-active': '215 14% 91%',
    name: 'Grafito',
  },
  '#06b6d4': {
    '--primary': '186 94% 43%',
    '--primary-light': '186 94% 91%',
    '--primary-dark': '186 94% 28%',
    '--primary-rgb': '6, 182, 212',
    '--accent': '191 88% 50%',
    '--bg': '186 62% 97%',
    '--sidebar-bg': '186 44% 96%',
    '--sidebar-active': '186 38% 91%',
    name: 'Turquesa',
  },
  '#9f1239': {
    '--primary': '343 88% 35%',
    '--primary-light': '343 88% 93%',
    '--primary-dark': '343 88% 20%',
    '--primary-rgb': '159, 18, 57',
    '--accent': '355 78% 52%',
    '--bg': '343 62% 98%',
    '--sidebar-bg': '343 44% 97%',
    '--sidebar-active': '343 38% 92%',
    name: 'Sangría',
  },
  '#4d7c0f': {
    '--primary': '82 82% 28%',
    '--primary-light': '82 82% 92%',
    '--primary-dark': '82 82% 16%',
    '--primary-rgb': '77, 124, 15',
    '--accent': '100 72% 38%',
    '--bg': '82 54% 97%',
    '--sidebar-bg': '82 38% 96%',
    '--sidebar-active': '82 32% 91%',
    name: 'Oliva',
  },
  '#1a1a1a': {
    '--primary': '0 0% 12%',
    '--primary-light': '0 0% 88%',
    '--primary-dark': '0 0% 4%',
    '--primary-rgb': '26, 26, 26',
    '--accent': '0 0% 30%',
    '--bg': '0 0% 97%',
    '--sidebar-bg': '0 0% 96%',
    '--sidebar-active': '0 0% 90%',
    name: 'Negro',
  },
};


export const applyTheme = (color, isDark = localStorage.getItem('sep_dark_mode') === 'true') => {
  const theme = THEMES[color] || THEMES['#1f51d3'];
  const root = document.documentElement;
  Object.entries(theme).forEach(([k, v]) => {
    if (k.startsWith('--')) {
      if (isDark && (k === '--bg' || k === '--sidebar-bg' || k === '--sidebar-active' || k === '--primary-light')) {
        return;
      }
      root.style.setProperty(k, v);
    }
  });

  if (isDark) {
    root.style.setProperty('--bg', '222 15% 10%');
    root.style.setProperty('--sidebar-bg', '222 15% 12%');
    root.style.setProperty('--sidebar-active', '222 15% 20%');
    root.style.setProperty('--card', '222 15% 14%');
    root.style.setProperty('--foreground', '220 10% 95%');
    root.style.setProperty('--muted', '220 10% 65%');
    root.style.setProperty('--border', '222 15% 18%');
    const primaryHSL = theme['--primary'].split(' ');
    root.style.setProperty('--primary-light', `${primaryHSL[0]} ${primaryHSL[1]} 20%`);
  } else {
    root.style.setProperty('--card', '0 0% 100%');
    root.style.setProperty('--foreground', '0 0% 13%');
    root.style.setProperty('--muted', '0 0% 46%');
    root.style.setProperty('--border', '0 0% 88%');
  }
};

// ── hook ──────────────────────────────────────────────────────────────────────
export const useStore = () => {
  const [s, setS] = useState(store.getState());

  useEffect(() => {
    const unsub = store.subscribe(setS);
    return unsub;
  }, []);

  return s;
};

// ── cross-tab synchronization ─────────────────────────────────────────────────
window.addEventListener('storage', (e) => {
  if (!e.newValue) return;
  
  try {
    window.__isSyncingFromStorage = true;
    switch (e.key) {
      case 'sep_config':
        setState({ config: JSON.parse(e.newValue) });
        break;
      case 'sep_negocio_config':
        setState({ negocioConfig: JSON.parse(e.newValue) });
        break;
      case 'sep_theme':
        setState({ themeColor: JSON.parse(e.newValue) });
        applyTheme(JSON.parse(e.newValue));
        break;
      case 'sep_pedidos':
        setState({ pedidos: JSON.parse(e.newValue) });
        break;
      case 'sep_cotizaciones':
        setState({ cotizaciones: JSON.parse(e.newValue) });
        break;
      case 'sep_finanzas':
        setState({ finanzas: JSON.parse(e.newValue) });
        break;
      case 'sep_clientes':
        setState({ clientes: JSON.parse(e.newValue) });
        break;
      case 'sep_etiquetas':
        setState({ etiquetasPersonalizadas: JSON.parse(e.newValue) });
        break;
      case 'sep_categorias_producto':
        setState({ categoriasProducto: JSON.parse(e.newValue) });
        break;
      case 'sep_canales_venta':
        setState({ canalesVenta: JSON.parse(e.newValue) });
        break;
      case 'sep_etiquetas_pedidos':
        setState({ etiquetasPedidos: JSON.parse(e.newValue) });
        break;
      case 'sep_productos':
        setState({ productos: JSON.parse(e.newValue) });
        break;
      case 'sep_combos':
        setState({ combos: JSON.parse(e.newValue) });
        break;
      case 'sep_notas':
        setState({ notas: JSON.parse(e.newValue) });
        break;
      case 'sep_categorias_notas':
        setState({ categoriasNotas: JSON.parse(e.newValue) });
        break;
    }
  } catch (error) {
    console.error('Error syncing tab state:', error);
  } finally {
    window.__isSyncingFromStorage = false;
  }
});
