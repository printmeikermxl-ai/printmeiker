import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';

const navItems = [
  { path: '/',              icon: '🏠', label: 'Dashboard',    section: 'Principal'    },
  { path: '/pedidos',       icon: '📦', label: 'Pedidos',      section: 'Gestión'      },
  { path: '/calendario',    icon: '📅', label: 'Calendario',   section: 'Gestión'      },
  { path: '/cotizaciones',  icon: '📋', label: 'Cotizaciones', section: 'Gestión'      },
  { path: '/finanzas',      icon: '💰', label: 'Finanzas',     section: 'Gestión'      },
  { path: '/catalogo',      icon: '📚', label: 'Catálogo',     section: 'Herramientas' },
  { path: '/clientes',      icon: '👥', label: 'Clientes',     section: 'Herramientas' },
  { path: '/calculadora',   icon: '🧮', label: 'Calculadora',  section: 'Herramientas' },
  { path: '/configuracion', icon: '⚙️', label: 'Configuración',section: 'Sistema'      },
];

// Gradientes de avatar llamativos según el color del tema
export const getAvatarGradient = (themeColor) => {
  const MAP = {
    '#1f51d3': 'linear-gradient(135deg, #1f51d3, #4f46e5, #7c3aed)',
    '#c9506b': 'linear-gradient(135deg, #c9506b, #db2777, #f43f5e)',
    '#8ecae6': 'linear-gradient(135deg, #219ebc, #0ea5e9, #38bdf8)',
    '#219ebc': 'linear-gradient(135deg, #0ea5e9, #219ebc, #0891b2)',
    '#023047': 'linear-gradient(135deg, #023047, #0ea5e9, #06b6d4)',
    '#ffb703': 'linear-gradient(135deg, #ffb703, #fb8500, #f59e0b)',
    '#fb8500': 'linear-gradient(135deg, #fb8500, #ef4444, #f97316)',
    '#7c3aed': 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
    '#059669': 'linear-gradient(135deg, #059669, #10b981, #34d399)',
    '#dc2626': 'linear-gradient(135deg, #dc2626, #ef4444, #f97316)',
    '#db2777': 'linear-gradient(135deg, #db2777, #ec4899, #f43f5e)',
    '#0ea5e9': 'linear-gradient(135deg, #0ea5e9, #38bdf8, #7dd3fc)',
    '#ca8a04': 'linear-gradient(135deg, #ca8a04, #d97706, #f59e0b)',
    '#65a30d': 'linear-gradient(135deg, #65a30d, #84cc16, #a3e635)',
    '#0891b2': 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)',
    '#4f46e5': 'linear-gradient(135deg, #4f46e5, #7c3aed, #a78bfa)',
  };
  return MAP[themeColor] || `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))`;
};

export const Sidebar = ({ open, onClose, onSignOut, isCompact }) => {
  const storeState = useStore();
  const { pedidos, config, darkMode, themeColor } = storeState;

  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
  const sections   = [...new Set(navItems.map(n => n.section))];
  const avatarGrad = getAvatarGradient(themeColor);
  const avatarLetter = (config.propietario || config.negocio || 'U')[0].toUpperCase();

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''} ${isCompact ? 'sidebar-compact' : ''}`}>

        {/* ── Logo ── */}
        <div className="sidebar-logo" style={{ padding: isCompact ? '14px 0' : '16px 16px 16px', justifyContent: isCompact ? 'center' : 'flex-start' }}>
          {isCompact ? (
            // Modo compacto: logo original en miniatura (negro en fondo claro, blanco en fondo oscuro)
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
              border: darkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.05)',
            }}>
              <img
                src="/logo-icon.png"
                alt="P"
                style={{
                  height: '24px',
                  width: '24px',
                  objectFit: 'contain',
                  filter: darkMode ? 'none' : 'brightness(0)',
                  transition: 'filter 0.2s ease',
                }}
              />
            </div>
          ) : (
            <img
              src="/logo.png"
              alt="PrintMeiker"
              style={{
                width: '140px',
                height: 'auto',
                display: 'block',
                filter: darkMode ? 'none' : 'invert(1)',
                mixBlendMode: darkMode ? 'screen' : 'multiply',
              }}
            />
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="sidebar-nav" style={{ padding: isCompact ? '10px 6px' : '12px 10px' }}>
          {sections.map(section => (
            <div key={section}>
              {!isCompact && <div className="nav-section-label">{section}</div>}
              {navItems.filter(n => n.section === section).map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  style={isCompact ? {
                    justifyContent: 'center',
                    padding: '10px',
                    borderRadius: 10,
                    position: 'relative',
                  } : {}}
                  title={isCompact ? item.label : undefined}
                >
                  <span className="nav-icon" style={{ fontSize: isCompact ? 20 : 18 }}>
                    {item.icon}
                  </span>
                  {!isCompact && item.label}
                  {item.path === '/pedidos' && pendientes > 0 && (
                    <span className="nav-badge" style={isCompact ? {
                      position: 'absolute', top: 4, right: 4,
                      minWidth: 14, height: 14, fontSize: 9, padding: '0 3px',
                    } : {}}>
                      {pendientes}
                    </span>
                  )}
                </NavLink>
              ))}
              {!isCompact && section !== sections[sections.length - 1] && (
                <div style={{ height: 1, background: 'hsl(var(--border))', margin: '6px 8px' }} />
              )}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="sidebar-footer" style={{ padding: isCompact ? '10px 6px' : '14px 10px' }}>
          <div className="nav-item" style={{
            cursor: 'default', opacity: 0.9,
            justifyContent: isCompact ? 'center' : 'flex-start',
            padding: isCompact ? '8px' : undefined,
          }}
          title={isCompact ? (config.propietario || config.negocio || 'Mi Negocio') : undefined}
          >
            {/* Avatar llamativo con gradiente */}
            {config.profilePhoto ? (
              <div style={{
                position: 'relative',
                padding: '2px',
                background: avatarGrad,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 3px 10px hsl(var(--primary) / 0.35)`,
                flexShrink: 0,
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
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: avatarGrad,
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 900, fontSize: 15,
                boxShadow: `0 3px 10px rgba(0,0,0,0.25)`,
                flexShrink: 0,
                letterSpacing: '-0.02em',
              }}>
                {avatarLetter}
              </div>
            )}
            {!isCompact && (
              <div style={{ marginLeft: 10, flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {config.propietario || config.negocio || 'Mi Negocio'}
                </div>
                <div style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>Administrador</div>
              </div>
            )}
          </div>

          <button
            id="sidebar-signout-btn"
            onClick={onSignOut}
            className="nav-item"
            title={isCompact ? 'Cerrar sesión' : undefined}
            style={{
              width: '100%', cursor: 'pointer', color: 'hsl(var(--danger))',
              marginTop: 4, border: 'none', background: 'none',
              textAlign: 'left', fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
              justifyContent: isCompact ? 'center' : 'flex-start',
              padding: isCompact ? '10px' : undefined,
            }}
          >
            <span className="nav-icon" style={{ fontSize: isCompact ? 20 : 18 }}>
              🚪
            </span>
            {!isCompact && 'Cerrar sesión'}
          </button>
        </div>
      </aside>
    </>
  );
};
