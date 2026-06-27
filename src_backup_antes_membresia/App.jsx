import { useState, useEffect, useCallback } from 'react';
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
  const location = useLocation();
  const { themeColor, config } = useStore();
  const { user, signOut } = useAuth();

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

  // Función para cargar datos de la nube y actualizar el store
  const reloadFromCloud = useCallback(async () => {
    if (!user) return;
    const cloudData = await loadFromCloud(user.id);
    if (cloudData) {
      if (cloudData.pedidos)       localStorage.setItem('sep_pedidos',       JSON.stringify(cloudData.pedidos));
      if (cloudData.cotizaciones)  localStorage.setItem('sep_cotizaciones',  JSON.stringify(cloudData.cotizaciones));
      if (cloudData.finanzas)      localStorage.setItem('sep_finanzas',      JSON.stringify(cloudData.finanzas));
      if (cloudData.clientes)      localStorage.setItem('sep_clientes',      JSON.stringify(cloudData.clientes));
      if (cloudData.productos)     localStorage.setItem('sep_productos',     JSON.stringify(cloudData.productos));
      if (cloudData.config)        localStorage.setItem('sep_config',        JSON.stringify(cloudData.config));
      if (cloudData.negocioConfig) localStorage.setItem('sep_negocio_config', JSON.stringify(cloudData.negocioConfig));
      if (cloudData.themeColor)    localStorage.setItem('sep_theme',         JSON.stringify(cloudData.themeColor));
      // Marcar que estamos recargando desde la nube (no guardar de vuelta)
      window.__isReloadingFromCloud = true;
      store.reloadFromLocalStorage();
      // Pequeño delay para que el subscribe no guarde de vuelta
      setTimeout(() => { window.__isReloadingFromCloud = false; }, 500);
    }
  }, [user]);

  // Cargar datos desde la nube al iniciar sesión y auto-rellenar perfil del usuario
  useEffect(() => {
    if (!user) return;

    const loadAndPopulate = async () => {
      await reloadFromCloud();

      // Esperar un tick para asegurarnos que el store ya se actualizó
      await new Promise(resolve => setTimeout(resolve, 100));

      const currentConfig = store.getState().config;
      const meta = user.user_metadata || {};

      // Datos del usuario autenticado (Google o Email)
      const nombre = meta.full_name || meta.name || meta.nombre || '';
      const email = user.email || '';
      const avatar = meta.avatar_url || meta.picture || '';

      const updates = {};
      const isDifferentUser = currentConfig._authUserId && currentConfig._authUserId !== user.id;

      // Si es un usuario diferente al que estaba guardado, re-rellenar todo
      if (isDifferentUser) {
        if (nombre) updates.propietario = nombre;
        if (email) updates.email = email;
        // No pisar foto manual si ya hay una y es el mismo usuario; sí pisar si es otro usuario
        if (avatar) updates.profilePhoto = avatar;
        else updates.profilePhoto = '';
      } else {
        // Mismo usuario (o primera vez): solo rellenar campos vacíos
        // El email siempre se sincroniza desde auth (fuente más confiable)
        if (email && currentConfig.email !== email) updates.email = email;
        // Propietario: rellenar si está vacío
        if (!currentConfig.propietario && nombre) updates.propietario = nombre;
        // Foto: rellenar desde Google si no hay foto manual
        if (avatar && !currentConfig.profilePhoto) updates.profilePhoto = avatar;
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

  // Auto-guardar en la nube cada vez que CUALQUIER dato cambia (debounced 2s)
  useEffect(() => {
    if (!user) return;
    const unsub = store.subscribe(() => {
      // No guardar si estamos recargando desde la nube
      if (window.__isReloadingFromCloud) return;
      // Usamos un debounce para no saturar la API
      clearTimeout(window.__cloudSaveTimer);
      window.__cloudSaveTimer = setTimeout(() => {
        const s = store.getState();
        saveToCloud(user.id, {
          pedidos:       s.pedidos,
          cotizaciones:  s.cotizaciones,
          finanzas:      s.finanzas,
          clientes:      s.clientes,
          productos:     s.productos,
          config:        s.config,
          negocioConfig: s.negocioConfig,
          themeColor:    s.themeColor,
        });
      }, 2000);
    });
    return () => {
      unsub();
      clearTimeout(window.__cloudSaveTimer);
    };
  }, [user]);

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
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={signOut}
        isCompact={isCompactSidebar}
      />

      <div className="main-content" style={{ marginLeft: isCompactSidebar ? 'var(--sidebar-compact-w)' : 'var(--sidebar-w)' }}>
        <header className="topbar">
          <button className="hamburger btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <span className="topbar-title">{title}</span>
          <div className="topbar-spacer" />
          <div style={{ fontSize: 13, color: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: 8 }}>
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
          {config.profilePhoto ? (
            <div style={{
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
