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
        config:          s.config,
        negocioConfig:   s.negocioConfig,
        themeColor:      s.themeColor,
        notas:           s.notas,
        categoriasNotas: s.categoriasNotas,
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

  return (
    <>
      {/* ── Botón flotante de estado ────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Badge de errores/pendientes cuando está cerrado */}
        {!open && hasError && (
          <div style={{
            background: '#ef4444',
            color: 'white',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 20,
            animation: 'agent-pulse 2s ease-in-out infinite',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(239,68,68,0.5)',
          }} onClick={() => setOpen(true)}>
            ⚠️ {agent.status === 'offline' ? 'Sin conexión' : 'Error de sync'}
          </div>
        )}

        {!open && hasPending && !hasError && (
          <div style={{
            background: '#f59e0b',
            color: 'white',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 20,
            cursor: 'pointer',
          }} onClick={() => setOpen(true)}>
            ⏳ Guardando...
          </div>
        )}

        {/* Botón principal */}
        <button
          onClick={() => setOpen(o => !o)}
          title={`Estado del sistema: ${cfg.label}`}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `2px solid ${cfg.border}`,
            background: cfg.bg,
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            transition: 'all 0.2s ease',
            boxShadow: `0 4px 16px ${cfg.color}33`,
            animation: hasError ? 'agent-pulse 2s ease-in-out infinite' : 'none',
          }}
        >
          {agent.isRetrying ? '🔄' : cfg.icon}
        </button>
      </div>

      {/* ── Panel de diagnóstico ─────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          right: 24,
          zIndex: 9998,
          width: 360,
          maxHeight: 520,
          background: 'var(--card, #fff)',
          border: `1.5px solid ${cfg.border}`,
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
          animation: 'agent-slide-in 0.2s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid hsl(var(--border, 0 0% 88%))',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: cfg.bg,
          }}>
            <span style={{ fontSize: 22 }}>{cfg.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'hsl(var(--foreground, 0 0% 13%))' }}>
                Agente de Diagnóstico
              </div>
              <div style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>
                {cfg.label}
                {pingTime && agent.supabaseOk && (
                  <span style={{ color: 'hsl(var(--muted, 0 0% 46%))', fontWeight: 400, marginLeft: 6 }}>
                    · {pingTime}ms
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: 'hsl(var(--muted, 0 0% 46%))',
                padding: '2px 6px', borderRadius: 6,
              }}
            >
              ✕
            </button>
          </div>

          {/* Stats rápidas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 0,
            borderBottom: '1px solid hsl(var(--border, 0 0% 88%))',
          }}>
            {[
              {
                label: 'Pedidos',
                value: store.getState().pedidos?.length ?? 0,
                icon: '📦',
              },
              {
                label: 'Cotizaciones',
                value: store.getState().cotizaciones?.length ?? 0,
                icon: '📋',
              },
              {
                label: 'Último sync',
                value: timeAgo(agent.lastSaveAt),
                icon: '☁️',
                small: true,
              },
            ].map((stat) => (
              <div key={stat.label} style={{
                padding: '10px 12px',
                textAlign: 'center',
                borderRight: '1px solid hsl(var(--border, 0 0% 88%))',
              }}>
                <div style={{ fontSize: 16, marginBottom: 2 }}>{stat.icon}</div>
                <div style={{
                  fontSize: stat.small ? 10 : 18,
                  fontWeight: stat.small ? 500 : 700,
                  color: 'hsl(var(--foreground, 0 0% 13%))',
                  lineHeight: 1.2,
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 10, color: 'hsl(var(--muted, 0 0% 46%))' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div style={{
            padding: '10px 12px',
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid hsl(var(--border, 0 0% 88%))',
          }}>
            <button
              onClick={handleForcSync}
              disabled={forcing || !userId}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid hsl(var(--border, 0 0% 88%))',
                background: 'hsl(var(--primary, 223 74% 48%))',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: forcing || !userId ? 'not-allowed' : 'pointer',
                opacity: forcing || !userId ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              {forcing ? (
                <><span style={{ animation: 'agent-spin 1s linear infinite', display: 'inline-block' }}>🔄</span> Guardando…</>
              ) : (
                <><span>☁️</span> Forzar sync</>
              )}
            </button>

            <button
              onClick={handleRepair}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid hsl(var(--border, 0 0% 88%))',
                background: 'hsl(var(--card, 0 0% 100%))',
                color: 'hsl(var(--foreground, 0 0% 13%))',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>🔍</span> Verificar
            </button>
          </div>

          {/* Logs en tiempo real */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'hsl(var(--muted, 0 0% 46%))', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Registro de actividad
            </div>
            {agent.logs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'hsl(var(--muted, 0 0% 46%))', textAlign: 'center', padding: '16px 0' }}>
                Sin actividad registrada
              </div>
            ) : (
              agent.logs.map(log => {
                const lc = LOG_COLORS[log.type] || LOG_COLORS.info;
                return (
                  <div key={log.id} style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    background: `${lc.color}0d`,
                    borderLeft: `3px solid ${lc.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11 }}>{lc.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--foreground, 0 0% 13%))' }}>
                        {log.message}
                      </span>
                      <span style={{ fontSize: 10, color: 'hsl(var(--muted, 0 0% 46%))', marginLeft: 'auto', flexShrink: 0 }}>
                        {log.time}
                      </span>
                    </div>
                    {log.detail && (
                      <div style={{ fontSize: 10, color: 'hsl(var(--muted, 0 0% 46%))', paddingLeft: 18 }}>
                        {log.detail}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid hsl(var(--border, 0 0% 88%))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 10, color: 'hsl(var(--muted, 0 0% 46%))' }}>
              🤖 Agente activo · Auto-repair ON
            </span>
            {agent.lastSaveError && (
              <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>
                Último error: {agent.lastSaveError.slice(0, 30)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Animaciones CSS ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes agent-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes agent-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes agent-slide-in {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
};
