import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';

const navItems = [
  { path: '/', icon: '🏠', label: 'Dashboard', section: 'Principal' },
  { path: '/pedidos', icon: '📦', label: 'Pedidos', section: 'Gestión' },
  { path: '/calendario', icon: '📅', label: 'Calendario', section: 'Gestión' },
  { path: '/cotizaciones', icon: '📋', label: 'Cotizaciones', section: 'Gestión' },
  { path: '/finanzas', icon: '💰', label: 'Finanzas', section: 'Gestión' },
  { path: '/catalogo', icon: '📚', label: 'Catálogo', section: 'Herramientas' },
  { path: '/clientes', icon: '👥', label: 'Clientes', section: 'Herramientas' },
  { path: '/calculadora', icon: '🧮', label: 'Calculadora', section: 'Herramientas' },
  { path: '/configuracion', icon: '⚙️', label: 'Configuración', section: 'Sistema' },
];

export const Sidebar = ({ open, onClose, onSignOut }) => {
  const store = useStore();
  const location = useLocation();

  const pendientes = store.pedidos.filter(p => p.estado === 'pendiente').length;

  const sections = [...new Set(navItems.map(n => n.section))];

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ paddingLeft: 16, paddingTop: 16, paddingBottom: 16 }}>
          <img
            src="/logo.png"
            alt="PrintMeiker"
            style={{
              width: '140px',
              height: 'auto',
              display: 'block',
              filter: store.darkMode ? 'none' : 'invert(1)',
              mixBlendMode: store.darkMode ? 'screen' : 'multiply',
            }}
          />
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {navItems.filter(n => n.section === section).map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.path === '/pedidos' && pendientes > 0 && (
                    <span className="nav-badge">{pendientes}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" style={{ cursor: 'default', opacity: .8 }}>
            {store.config.profilePhoto ? (
              <img
                src={store.config.profilePhoto}
                alt="Perfil"
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid hsl(var(--primary))' }}
              />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 }}>
                {(store.config.propietario || store.config.negocio || 'U')[0].toUpperCase()}
              </div>
            )}
            <div style={{ marginLeft: 8, flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sidebar-fg)' }}>{store.config.propietario || store.config.negocio || 'Mi Negocio'}</div>
              <div style={{ fontSize: '11px', color: 'hsl(var(--muted))' }}>Administrador</div>
            </div>
          </div>

          {/* Botón de cerrar sesión */}
          <button
            id="sidebar-signout-btn"
            onClick={onSignOut}
            className="nav-item"
            style={{
              width: '100%',
              cursor: 'pointer',
              color: 'hsl(var(--danger))',
              marginTop: 4,
              border: 'none',
              background: 'none',
              textAlign: 'left',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <span className="nav-icon">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};


