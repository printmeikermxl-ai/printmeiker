import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ── helpers ──────────────────────────────────────────────────────────────────
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
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data?.data || null;
  } catch (e) {
    console.warn('No se pudo cargar desde la nube:', e.message);
    return null;
  }
};

export const saveToCloud = async (userId, data) => {
  try {
    const { error } = await supabase
      .from('user_data')
      .upsert(
        { user_id: userId, data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
  } catch (e) {
    console.warn('No se pudo guardar en la nube:', e.message);
  }
};


// ── seed data (vacío — cada usuario empieza limpio) ──────────────────────────
const seedProductos = [];

const seedPedidos = [];

const seedCotizaciones = [];

const seedClientes = [];

const seedFinanzas = [];

// ── main store hook ───────────────────────────────────────────────────────────
let listeners = [];
let state = {
  productos: load('sep_productos', seedProductos),
  pedidos: load('sep_pedidos', seedPedidos),
  cotizaciones: load('sep_cotizaciones', seedCotizaciones),
  finanzas: load('sep_finanzas', seedFinanzas),
  clientes: load('sep_clientes', seedClientes),
  config: load('sep_config', {
    appName: 'PrintMeiker',
    profilePhoto: '',
    negocio: '',
    propietario: '',
    telefono: '',
    email: '',
    moneda: 'MXN',
    iva: 16,
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
  themeColor: load('sep_theme', '#1f51d3'),
  darkMode: load('sep_dark_mode', false),
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

  // ── pedidos ──
  addPedido: (p) => {
    const pedidos = [...state.pedidos, { ...p, id: 'P' + Date.now().toString().slice(-4) }];
    save('sep_pedidos', pedidos);
    setState({ pedidos });
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

  // ── cotizaciones ──
  addCotizacion: (c) => {
    const cotizaciones = [...state.cotizaciones, { ...c, id: 'C' + Date.now().toString().slice(-4) }];
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

  // ── finanzas ──
  addFinanza: (f) => {
    const finanzas = [...state.finanzas, { ...f, id: 'F' + Date.now().toString().slice(-4) }];
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
    const clientes = [...state.clientes, { ...c, id: 'CL' + Date.now().toString().slice(-4), fechaRegistro: new Date().toISOString().split('T')[0] }];
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

  // ── reload from localStorage (para sincronización con la nube) ──
  reloadFromLocalStorage: () => {
    const isDark = load('sep_dark_mode', false);
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    const newState = {
      productos:     load('sep_productos', seedProductos),
      pedidos:       load('sep_pedidos', seedPedidos),
      cotizaciones:  load('sep_cotizaciones', seedCotizaciones),
      finanzas:      load('sep_finanzas', seedFinanzas),
      clientes:      load('sep_clientes', seedClientes),
      config:        load('sep_config', state.config),
      negocioConfig: load('sep_negocio_config', state.negocioConfig),
      alertasPedidos:load('sep_alertas_pedidos', state.alertasPedidos),
      themeColor:    load('sep_theme', '#1f51d3'),
      darkMode:      isDark,
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
      case 'sep_productos':
        setState({ productos: JSON.parse(e.newValue) });
        break;
    }
  } catch (error) {
    console.error('Error syncing tab state:', error);
  }
});
