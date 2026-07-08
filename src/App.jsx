import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar, getAvatarGradient } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { PedidosPage } from './pages/PedidosPage';
import { CalendarioPage } from './pages/CalendarioPage';
import { CotizacionesPage } from './pages/CotizacionesPage';
import { FinanzasPage } from './pages/FinanzasPage';
import { CatalogoPage } from './pages/CatalogoPage';
import { ClientesPage } from './pages/ClientesPage';
import { CalculadoraPage } from './pages/CalculadoraPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { AuthPage } from './pages/AuthPage';
import { AuthProvider, useAuth } from './store/authStore';
import { useStore } from './store/useStore';
import { applyTheme } from './store/useStore';
import { loadFromCloud, saveToCloud } from './store/useStore';
import { store } from './store/useStore';
import { supabase } from './lib/supabase';
import { GlobalSearch } from './components/GlobalSearch';
import { NotificacionesPanel, NotifBell } from './components/NotificacionesPanel';
import { CalculadoraFlotante } from './components/CalculadoraFlotante';
import { DiagnosticAgent } from './components/DiagnosticAgent';

const PAGE_TITLES = {
  '/': '🏠 Dashboard',
  '/pedidos': '📦 Pedidos',
  '/calendario': '📅 Calendario',
  '/cotizaciones': '📋 Cotizaciones',
  '/finanzas': '💰 Finanzas',
  '/catalogo': '📚 Catálogo',
  '/clientes': '👥 Clientes',
  '/calculadora': '🧮 Calculadora',
  '/configuracion': '⚙️ Configuración',
};

// ── Componente de ruta protegida ──────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f1a',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 44,
          height: 44,
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: 'hsl(var(--primary))',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Cargando…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

// ── Layout principal de la app ─────────────────────────────────────────────────
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCompactSidebar, setIsCompactSidebar] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('sep_sidebar_mode') === 'compact' && window.innerWidth > 1024
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [topbarPhotoErr, setTopbarPhotoErr] = useState(false);
  const location = useLocation();
  const { themeColor, config } = useStore();
  const { user, signOut } = useAuth();

  // Resetear error de foto cuando cambia la foto
  useEffect(() => {
    setTopbarPhotoErr(false);
  }, [config.profilePhoto]);

  // Listen for sidebar mode changes from ConfiguracionPage
  useEffect(() => {
    const handleStorage = () => {
      setIsCompactSidebar(localStorage.getItem('sep_sidebar_mode') === 'compact' && window.innerWidth > 1024);
    };
    window.addEventListener('storage', handleStorage);
    // Also listen via custom event for same-tab changes
    window.addEventListener('sep_sidebar_changed', handleStorage);
    window.addEventListener('resize', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sep_sidebar_changed', handleStorage);
      window.removeEventListener('resize', handleStorage);
    };
  }, []);

  // ── Ctrl+K global search ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── PWA install prompt ──
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); store.setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { store.setPwaInstalled(true); store.setDeferredPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── Lock de recarga para evitar sobrescribir cambios locales ──────────────
  const reloadLockRef = useRef(false);

  // Función para cargar datos de la nube y actualizar el store
  const reloadFromCloud = useCallback(async () => {
    if (!user) return;

    // Protección ampliada: si hay timer activo, cambios pendientes O recarga en curso → no sobreescribir
    if (
      window.__cloudSaveTimer ||
      localStorage.getItem('sep_pending_cloud_sync') === 'true' ||
      reloadLockRef.current
    ) {
      console.log('[sync] Recarga de nube pospuesta: cambios locales pendientes de subir.');
      return;
    }

    reloadLockRef.current = true;
    try {
      const cloudResult = await loadFromCloud(user.id);
      if (cloudResult && cloudResult.data) {
        const localLastSave = localStorage.getItem('sep_local_last_save');
        if (localLastSave && cloudResult.updated_at) {
          const localTime = new Date(localLastSave).getTime();
          const cloudTime = new Date(cloudResult.updated_at).getTime();
          if (cloudTime <= localTime) {
            console.log('[sync] Ignorando recarga de nube: los datos locales son iguales o más recientes.');
            return;
          }
        }

        const cloudData = cloudResult.data;
        if (cloudData.pedidos)         localStorage.setItem('sep_pedidos',           JSON.stringify(cloudData.pedidos));
        if (cloudData.cotizaciones)    localStorage.setItem('sep_cotizaciones',      JSON.stringify(cloudData.cotizaciones));
        if (cloudData.finanzas)        localStorage.setItem('sep_finanzas',          JSON.stringify(cloudData.finanzas));
        if (cloudData.clientes)        localStorage.setItem('sep_clientes',          JSON.stringify(cloudData.clientes));
        if (cloudData.productos)       localStorage.setItem('sep_productos',         JSON.stringify(cloudData.productos));
        if (cloudData.combos)          localStorage.setItem('sep_combos',            JSON.stringify(cloudData.combos));
        if (cloudData.config)          localStorage.setItem('sep_config',            JSON.stringify(cloudData.config));
        if (cloudData.negocioConfig)   localStorage.setItem('sep_negocio_config',   JSON.stringify(cloudData.negocioConfig));
        if (cloudData.themeColor)      localStorage.setItem('sep_theme',             JSON.stringify(cloudData.themeColor));
        if (cloudData.notas)           localStorage.setItem('sep_notas',             JSON.stringify(cloudData.notas));
        if (cloudData.categoriasNotas) localStorage.setItem('sep_categorias_notas', JSON.stringify(cloudData.categoriasNotas));
        if (cloudData.etiquetasPersonalizadas) localStorage.setItem('sep_etiquetas', JSON.stringify(cloudData.etiquetasPersonalizadas));
        if (cloudData.categoriasProducto)      localStorage.setItem('sep_categorias_producto', JSON.stringify(cloudData.categoriasProducto));
        if (cloudData.canalesVenta)            localStorage.setItem('sep_canales_venta', JSON.stringify(cloudData.canalesVenta));
        if (cloudData.etiquetasPedidos)        localStorage.setItem('sep_etiquetas_pedidos', JSON.stringify(cloudData.etiquetasPedidos));
        if (cloudData.alertasPedidos)          localStorage.setItem('sep_alertas_pedidos', JSON.stringify(cloudData.alertasPedidos));
        if (cloudData.darkMode !== undefined)  localStorage.setItem('sep_dark_mode', JSON.stringify(cloudData.darkMode));
        // Marcar que estamos recargando desde la nube (no guardar de vuelta)
        window.__isReloadingFromCloud = true;
        store.reloadFromLocalStorage();
        // Delay ampliado para que el subscribe no guarde de vuelta
        setTimeout(() => { window.__isReloadingFromCloud = false; }, 1000);
      }
    } catch (e) {
      console.error('[sync] Error al recargar desde la nube:', e.message);
    } finally {
      // Liberar lock después de un pequeño margen de seguridad
      setTimeout(() => { reloadLockRef.current = false; }, 1200);
    }
  }, [user]);

  // Cargar datos desde la nube al iniciar sesión y auto-rellenar perfil del usuario
  useEffect(() => {
    if (!user) return;

    const loadAndPopulate = async () => {
      const currentConfig = store.getState().config;
      const isDifferentUser = currentConfig._authUserId && currentConfig._authUserId !== user.id;

      // Si es un usuario diferente al que estaba guardado localmente,
      // limpiar inmediatamente todo el almacenamiento local de negocio para evitar cruce de datos
      if (isDifferentUser) {
        console.log('[sync] Se detectó un usuario diferente en sesión. Limpiando almacenamiento local previo...');
        const keysToClear = [
          'sep_productos', 'sep_combos', 'sep_pedidos', 'sep_cotizaciones',
          'sep_finanzas', 'sep_clientes', 'sep_etiquetas', 'sep_categorias_producto',
          'sep_canales_venta', 'sep_config', 'sep_negocio_config', 'sep_alertas_pedidos',
          'sep_theme', 'sep_dark_mode', 'sep_notas', 'sep_categorias_notas',
          'sep_etiquetas_pedidos', 'sep_pending_cloud_sync', 'sep_local_last_save',
          'sep_cot_counter', 'sep_ped_counter', 'sep_cli_counter', 'sep_fin_counter'
        ];
        keysToClear.forEach(key => localStorage.removeItem(key));
        
        // Cargar estado inicial limpio en memoria
        window.__isReloadingFromCloud = true;
        store.reloadFromLocalStorage();
        await new Promise(resolve => setTimeout(resolve, 50));
        window.__isReloadingFromCloud = false;
      }

      const isPending = localStorage.getItem('sep_pending_cloud_sync') === 'true';
      if (isPending) {
        console.log('Sincronizando cambios locales pendientes al iniciar...');
        const s = store.getState();
        try {
          await saveToCloud(user.id, {
            pedidos:       s.pedidos,
            cotizaciones:  s.cotizaciones,
            finanzas:      s.finanzas,
            clientes:      s.clientes,
            productos:     s.productos,
            combos:        s.combos,
            config:        s.config,
            negocioConfig: s.negocioConfig,
            themeColor:    s.themeColor,
            notas:         s.notas,
            categoriasNotas: s.categoriasNotas,
            etiquetasPersonalizadas: s.etiquetasPersonalizadas,
            categoriasProducto: s.categoriasProducto,
            canalesVenta:  s.canalesVenta,
            etiquetasPedidos: s.etiquetasPedidos,
            alertasPedidos: s.alertasPedidos,
            darkMode:      s.darkMode,
          });
          localStorage.setItem('sep_pending_cloud_sync', 'false');
          console.log('Sincronización inicial de cambios locales completada.');
        } catch (err) {
          console.error('Error al sincronizar cambios locales en boot:', err);
        }
      } else {
        await reloadFromCloud();
      }

      // Esperar un tick para asegurarnos que el store ya se actualizó
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedConfig = store.getState().config;
      const meta = user.user_metadata || {};

      // Datos del usuario autenticado (Google o Email)
      const nombre = meta.full_name || meta.name || meta.nombre || '';
      const email = user.email || '';
      const avatar = meta.avatar_url || meta.picture || '';

      const updates = {};

      // Re-rellenar perfil según si es un nuevo usuario o el mismo
      if (isDifferentUser) {
        if (nombre) updates.propietario = nombre;
        if (email) updates.email = email;
        if (avatar) updates.profilePhoto = avatar;
        else updates.profilePhoto = '';
      } else {
        if (email && updatedConfig.email !== email) updates.email = email;
        if (!updatedConfig.propietario && nombre) updates.propietario = nombre;
        if (avatar && !updatedConfig.profilePhoto) updates.profilePhoto = avatar;
      }

      // Guardar el ID del usuario autenticado para detectar cambios de cuenta
      updates._authUserId = user.id;

      store.updateConfig(updates);
    };

    loadAndPopulate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Recargar datos de la nube cuando la ventana vuelve a estar activa (cambio de pestaña/app)
  useEffect(() => {
    const handleFocus = () => {
      const isPending = localStorage.getItem('sep_pending_cloud_sync') === 'true';
      if (isPending) return;
      reloadFromCloud();
    };
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleFocus();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [reloadFromCloud]);

  // Auto-guardar en la nube cada vez que CUALQUIER dato cambia (debounced 2.5s)
  useEffect(() => {
    if (!user) return;
    const unsub = store.subscribe(() => {
      // No guardar si estamos recargando desde la nube
      if (window.__isReloadingFromCloud) return;

      // Marcar cambios pendientes locales de inmediato
      localStorage.setItem('sep_pending_cloud_sync', 'true');

      // Debounce de 2.5s — más tiempo para agrupar cambios rápidos y evitar race conditions
      clearTimeout(window.__cloudSaveTimer);
      window.__cloudSaveTimer = setTimeout(async () => {
        const s = store.getState();
        try {
          await saveToCloud(user.id, {
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
          // Registrar cuándo terminamos de guardar (para que Realtime no haga reload de nuestro propio save)
          window.__lastCloudSave = Date.now();
          localStorage.setItem('sep_pending_cloud_sync', 'false');
        } catch (err) {
          // saveToCloud ya emitió el evento de error al DiagnosticAgent
          // Mantenemos el flag de pendiente para reintento posterior
          console.error('[sync] Error al sincronizar con la nube:', err.message);
          localStorage.setItem('sep_pending_cloud_sync', 'true');
        }
        window.__cloudSaveTimer = null;
      }, 2500);
    });
    return () => {
      unsub();
      clearTimeout(window.__cloudSaveTimer);
      window.__cloudSaveTimer = null;
    };
  }, [user]);

  // ── Supabase Realtime: recibir cambios de otras sesiones al instante ──────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`realtime:user_data:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'user_data',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Si YO acabo de guardar (< 5s), ignoramos el evento para evitar loop
          // Aumentado de 2.5s a 5s para cubrir el nuevo debounce de 2.5s + tiempo de red
          const timeSinceOwnSave = Date.now() - (window.__lastCloudSave || 0);
          const hasPendingTimer  = !!window.__cloudSaveTimer;
          const isPendingSync    = localStorage.getItem('sep_pending_cloud_sync') === 'true';
          if (timeSinceOwnSave < 5000 || hasPendingTimer || isPendingSync) return;

          // Es un cambio de otra sesión → recargamos desde la nube
          console.log('[Realtime] Cambio detectado de otra sesión, recargando...');
          reloadFromCloud();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Estado del canal:', status);
        if (status === 'SUBSCRIBED') {
          window.dispatchEvent(new CustomEvent('sep:sync:success', {
            detail: { detail: 'Realtime conectado correctamente' }
          }));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, reloadFromCloud]);

  // Advertir al usuario al cerrar pestaña si hay cambios pendientes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const isPending = localStorage.getItem('sep_pending_cloud_sync') === 'true';
      if (isPending) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios locales pendientes de guardar en la nube. ¿Seguro que deseas salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Aplicar tema y favicon
  useEffect(() => {
    applyTheme(themeColor);
    document.title = config.appName || 'PrintMeiker';

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    if (config.profilePhoto) {
      link.href = config.profilePhoto;
    } else {
      link.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%23222'/><text x='50' y='70' font-size='60' text-anchor='middle' fill='white'>" + (config.appName ? config.appName[0].toUpperCase() : 'S') + "</text></svg>";
    }
  }, [themeColor, config.profilePhoto, config.appName]);

  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div className={`app-layout ${isCompactSidebar ? 'has-compact-sidebar' : ''}`}>
      {/* Global overlays */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CalculadoraFlotante />
      {/* Agente de diagnóstico y sincronización */}
      <DiagnosticAgent userId={user?.id} />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={signOut}
        isCompact={isCompactSidebar}
      />

      <div className="main-content">
        <header className="topbar">
          <button className="hamburger btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <span className="topbar-title">{title}</span>
          <div className="topbar-spacer" />

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="topbar-search-btn"
            title="Buscar (Ctrl+K)"
          >
            <span>🔍</span>
            <span className="topbar-search-kbd">Ctrl K</span>
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="topbar-notif-btn"
              title="Notificaciones"
            >
              <NotifBell />
            </button>
            <NotificacionesPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>

          <div className="topbar-app-name-container" style={{ fontSize: 13, color: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{config.appName || 'PrintMeiker'}</span>
          </div>

          <button
            onClick={() => store.setDarkMode(!store.getState().darkMode)}
            className="topbar-theme-toggle"
            style={{
              marginLeft: '8px',
              marginRight: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              transition: 'all 0.2s ease',
            }}
            title={store.getState().darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {store.getState().darkMode ? '☀️' : '🌙'}
          </button>
          {config.profilePhoto && !topbarPhotoErr ? (
            <div className="topbar-avatar-container" style={{
              padding: '2px',
              background: getAvatarGradient(themeColor),
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px hsl(var(--primary) / 0.35)`,
              flexShrink: 0,
              width: 36, height: 36,
            }}>
              <img
                src={config.profilePhoto}
                alt="Perfil"
                onError={() => setTopbarPhotoErr(true)}
                style={{
                  width: 30, height: 30, borderRadius: '50%', objectFit: 'cover',
                  border: '1.5px solid hsl(var(--card))',
                }}
              />
            </div>
          ) : (
            <div
              className="topbar-avatar"
              title={config.propietario}
              style={{
                background: getAvatarGradient(themeColor),
                boxShadow: `0 2px 8px hsl(var(--primary) / 0.35)`,
                fontWeight: 800,
                color: 'white',
              }}
            >
              {(config.propietario || config.appName || 'U')[0].toUpperCase()}
            </div>
          )}
        </header>

        <main className="page-area">
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/pedidos"      element={<PedidosPage />} />
            <Route path="/calendario"   element={<CalendarioPage />} />
            <Route path="/cotizaciones" element={<CotizacionesPage />} />
            <Route path="/finanzas"     element={<FinanzasPage />} />
            <Route path="/catalogo"     element={<CatalogoPage />} />
            <Route path="/clientes"     element={<ClientesPage />} />
            <Route path="/calculadora"  element={<CalculadoraPage />} />
            <Route path="/configuracion" element={<ConfiguracionPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// ── App root ──────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Ruta pública: autenticación */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Rutas protegidas: requieren sesión activa */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
