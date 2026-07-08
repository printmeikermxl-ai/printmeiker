import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { store, saveToCloud } from '../store/useStore';

// ── Estado global del agente (singleton, accesible desde App.jsx) ─────────────
let agentListeners = [];
let agentState = {
  status: 'checking',   // 'ok' | 'warning' | 'error' | 'checking' | 'offline'
  lastSaveAt: null,     // timestamp del último save exitoso
  lastSaveError: null,  // último error de save
  syncPending: false,   // si hay cambios sin subir
  supabaseOk: null,     // null=sin verificar, true/false
  logs: [],             // últimos N logs
  retryCount: 0,        // reintentos actuales
  isRetrying: false,    // si está en proceso de reintento
};

const notifyAgent = () => agentListeners.forEach(fn => fn({ ...agentState }));
const setAgentState = (partial) => {
  agentState = { ...agentState, ...partial };
  notifyAgent();
};

// Añadir log al agente
export const agentLog = (type, message, detail = '') => {
  const entry = {
    id: Date.now() + Math.random(),
    type,   // 'info' | 'success' | 'warning' | 'error'
    message,
    detail,
    time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
  const logs = [entry, ...agentState.logs].slice(0, 50);
  setAgentState({ logs });
};

// Actualizar estado del agente (usado desde App.jsx y useStore)
export const updateAgentStatus = (updates) => {
  setAgentState(updates);
};

// ── Hook del agente ────────────────────────────────────────────────────────────
const useAgentState = () => {
  const [s, setS] = useState(agentState);
  useEffect(() => {
    agentListeners.push(setS);
    return () => { agentListeners = agentListeners.filter(fn => fn !== setS); };
  }, []);
  return s;
};

// ── Helpers visuales ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  ok:       { icon: '🟢', label: 'Conectado', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
  warning:  { icon: '🟡', label: 'Advertencia', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  error:    { icon: '🔴', label: 'Error de sync', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  checking: { icon: '⚪', label: 'Verificando...', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  offline:  { icon: '🔌', label: 'Sin conexión', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)' },
};

const LOG_COLORS = {
  info:    { color: '#94a3b8', icon: 'ℹ️' },
  success: { color: '#22c55e', icon: '✅' },
  warning: { color: '#f59e0b', icon: '⚠️' },
  error:   { color: '#ef4444', icon: '❌' },
};

// Formatea tiempo relativo
const timeAgo = (ts) => {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5)  return 'hace un momento';
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff/60)}min`;
  return `hace ${Math.floor(diff/3600)}h`;
};

// ── Componente Principal ───────────────────────────────────────────────────────
export const DiagnosticAgent = ({ userId }) => {
  const agent = useAgentState();
  const [open, setOpen] = useState(false);
  const [forcing, setForcing] = useState(false);
  const [pingTime, setPingTime] = useState(null);
  const verifyRef = useRef(null);

  // ── Verificar conexión a Supabase ──
  const verifySupabase = useCallback(async () => {
    const start = Date.now();
    try {
      const { error } = await supabase.from('user_data').select('user_id').limit(1);
      const ms = Date.now() - start;
      setPingTime(ms);

      if (error && error.code !== 'PGRST116' && error.code !== '42501') {
        // PGRST116 = no rows (ok), 42501 = RLS sin auth (ok si no está logueado)
        agentLog('error', 'Supabase responde con error', `${error.code}: ${error.message}`);
        setAgentState({ supabaseOk: false, status: 'error' });
        return false;
      }

      agentLog('success', `Supabase OK (${ms}ms)`, 'Conexión verificada');
      setAgentState({ supabaseOk: true });
      return true;
    } catch (e) {
      const ms = Date.now() - start;
      setPingTime(ms);
      if (!navigator.onLine) {
        agentLog('warning', 'Sin conexión a internet', 'El navegador está offline');
        setAgentState({ supabaseOk: false, status: 'offline' });
      } else {
        agentLog('error', 'No se puede conectar a Supabase', e.message);
        setAgentState({ supabaseOk: false, status: 'error' });
      }
      return false;
    }
  }, []);

  // ── Verificar integridad de datos (nube vs local) ──
  const verifyDataIntegrity = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data, updated_at')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        agentLog('info', 'Sin datos en la nube todavía', 'Primera vez que usas el sistema');
        return;
      }
      if (error) {
        agentLog('error', 'Error al verificar integridad de datos', error.message);
        return;
      }

      const cloudData = data?.data;
      const localState = store.getState();

      const issues = [];

      // Comprobar si hay más datos locales que en la nube
      if (cloudData) {
        const localPedidos = localState.pedidos?.length || 0;
        const cloudPedidos = cloudData.pedidos?.length || 0;
        if (localPedidos > cloudPedidos) {
          issues.push(`Pedidos: ${localPedidos} local vs ${cloudPedidos} en nube`);
        }

        const localCots = localState.cotizaciones?.length || 0;
        const cloudCots = cloudData.cotizaciones?.length || 0;
        if (localCots > cloudCots) {
          issues.push(`Cotizaciones: ${localCots} local vs ${cloudCots} en nube`);
        }

        const localClientes = localState.clientes?.length || 0;
        const cloudClientes = cloudData.clientes?.length || 0;
        if (localClientes > cloudClientes) {
          issues.push(`Clientes: ${localClientes} local vs ${cloudClientes} en nube`);
        }
      }

      if (issues.length > 0) {
        agentLog('warning', 'Datos locales no sincronizados detectados', issues.join(' | '));
        setAgentState({ status: 'warning', syncPending: true });
      } else {
        const updatedAt = data?.updated_at ? new Date(data.updated_at).getTime() : null;
        agentLog('success', 'Datos en nube sincronizados correctamente',
          updatedAt ? `Última actualización: ${new Date(data.updated_at).toLocaleString('es-MX')}` : '');
      }
    } catch (e) {
      agentLog('error', 'Error al verificar integridad', e.message);
    }
  }, [userId]);

  // ── Diagnóstico completo al iniciar ──
  useEffect(() => {
    const runDiagnostic = async () => {
      agentLog('info', 'Iniciando diagnóstico del sistema...');

      // 1. Verificar credenciales
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || url.includes('placeholder')) {
        agentLog('error', 'VITE_SUPABASE_URL no configurado', 'Edita el archivo .env');
        setAgentState({ status: 'error', supabaseOk: false });
        return;
      }
      if (!key || key.includes('placeholder')) {
        agentLog('error', 'VITE_SUPABASE_ANON_KEY no configurado', 'Edita el archivo .env');
        setAgentState({ status: 'error', supabaseOk: false });
        return;
      }

      // Advertir si la clave no tiene formato JWT estándar
      if (!key.startsWith('eyJ')) {
        agentLog('warning', 'Formato de API key inusual',
          'Las claves Supabase normalmente empiezan con "eyJ". Verifica en Project Settings → API.');
      } else {
        agentLog('info', 'Credenciales de Supabase detectadas');
      }

      // 2. Verificar conectividad
      const isOk = await verifySupabase();
      if (!isOk) return;

      // 3. Verificar si el usuario está autenticado
      if (userId) {
        agentLog('info', `Usuario autenticado: ${userId.slice(0, 8)}...`);
        await verifyDataIntegrity();
        setAgentState({ status: 'ok' });
      } else {
        agentLog('info', 'Sin sesión de usuario activa');
        setAgentState({ status: 'ok' });
      }
    };

    // Delay para que la app cargue primero
    verifyRef.current = setTimeout(runDiagnostic, 2000);
    return () => clearTimeout(verifyRef.current);
  }, [userId, verifySupabase, verifyDataIntegrity]);

  // ── Monitorear estado de conexión de red ──
  useEffect(() => {
    const handleOnline = () => {
      agentLog('success', 'Conexión a internet restaurada');
      setAgentState({ status: 'warning' });
      // Re-verificar supabase
      setTimeout(verifySupabase, 1000);
    };
    const handleOffline = () => {
      agentLog('warning', 'Conexión a internet perdida', 'Los cambios se guardarán cuando vuelva la conexión');
      setAgentState({ status: 'offline' });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [verifySupabase]);

  // ── Monitorear evento global de error de sync ──
  useEffect(() => {
    const handleSyncError = (e) => {
      const { message, detail } = e.detail || {};
      agentLog('error', message || 'Error de sincronización', detail || '');
      setAgentState({ status: 'error', lastSaveError: message });
    };
    const handleSyncSuccess = (e) => {
      const { detail } = e.detail || {};
      agentLog('success', 'Datos guardados en la nube', detail || '');
      setAgentState({ status: 'ok', lastSaveAt: Date.now(), lastSaveError: null, syncPending: false, retryCount: 0 });
    };
    const handleSyncPending = () => {
      setAgentState({ syncPending: true });
    };
    const handleSyncRetry = (e) => {
      const { attempt, max } = e.detail || {};
      agentLog('warning', `Reintentando sincronización (${attempt}/${max})...`);
      setAgentState({ isRetrying: true, retryCount: attempt });
    };
    const handleSyncRetryFail = (e) => {
      const { message } = e.detail || {};
      agentLog('error', 'Falló después de reintentos', message || '');
      setAgentState({ isRetrying: false, status: 'error' });
    };

    window.addEventListener('sep:sync:error', handleSyncError);
    window.addEventListener('sep:sync:success', handleSyncSuccess);
    window.addEventListener('sep:sync:pending', handleSyncPending);
    window.addEventListener('sep:sync:retry', handleSyncRetry);
    window.addEventListener('sep:sync:retryfail', handleSyncRetryFail);
    return () => {
      window.removeEventListener('sep:sync:error', handleSyncError);
      window.removeEventListener('sep:sync:success', handleSyncSuccess);
      window.removeEventListener('sep:sync:pending', handleSyncPending);
      window.removeEventListener('sep:sync:retry', handleSyncRetry);
      window.removeEventListener('sep:sync:retryfail', handleSyncRetryFail);
    };
  }, []);

  // ── Forzar sincronización manual ──
  const handleForcSync = async () => {
    if (!userId || forcing) return;
    setForcing(true);
    agentLog('info', 'Sincronización manual iniciada por el usuario...');
    try {
      const s = store.getState();
      await saveToCloud(userId, {
        pedidos:         s.pedidos,
        cotizaciones:    s.cotizaciones,
        finanzas:        s.finanzas,
        clientes:        s.clientes,
        productos:       s.productos,
        combos:          s.combos,
        config:          s.config,
        negocioConfig:   s.negocioConfig,
        themeColor:      s.themeColor,
        notas:           s.notas,
        categoriasNotas: s.categoriasNotas,
        etiquetasPersonalizadas: s.etiquetasPersonalizadas,
        categoriasProducto: s.categoriasProducto,
        canalesVenta:    s.canalesVenta,
        etiquetasPedidos: s.etiquetasPedidos,
        alertasPedidos:  s.alertasPedidos,
        darkMode:        s.darkMode,
      });
      localStorage.setItem('sep_pending_cloud_sync', 'false');
      agentLog('success', 'Sincronización manual completada', `${s.pedidos?.length || 0} pedidos, ${s.cotizaciones?.length || 0} cotizaciones`);
      setAgentState({ status: 'ok', lastSaveAt: Date.now(), lastSaveError: null, syncPending: false });
    } catch (e) {
      agentLog('error', 'Sincronización manual fallida', e.message);
      setAgentState({ status: 'error', lastSaveError: e.message });
    } finally {
      setForcing(false);
    }
  };

  // ── Limpiar caché local y recargar desde nube ──
  const handleRepair = async () => {
    if (!userId) return;
    agentLog('info', 'Verificando integridad de datos...');
    setAgentState({ status: 'checking' });
    await verifySupabase();
    await verifyDataIntegrity();
    if (agentState.supabaseOk) {
      setAgentState({ status: 'ok' });
    }
  };

  const cfg = STATUS_CONFIG[agent.status] || STATUS_CONFIG.checking;
  const hasError = agent.status === 'error' || agent.status === 'offline';
  const hasPending = agent.syncPending || localStorage.getItem('sep_pending_cloud_sync') === 'true';

  return null;
};
