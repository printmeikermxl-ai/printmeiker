import { NavLink } from 'react-router-dom';
import { useStore } from '../store/useStore';

export const BottomNav = ({ onMenuClick }) => {
  const storeState = useStore();
  const { pedidos } = storeState;

  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span className="bottom-nav-icon">🏠</span>
        <span className="bottom-nav-label">Inicio</span>
      </NavLink>

      <NavLink to="/pedidos" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <div style={{ position: 'relative' }}>
          <span className="bottom-nav-icon">📦</span>
          {pendientes > 0 && (
            <span className="bottom-nav-badge">
              {pendientes}
            </span>
          )}
        </div>
        <span className="bottom-nav-label">Pedidos</span>
      </NavLink>

      <NavLink to="/calendario" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span className="bottom-nav-icon">📅</span>
        <span className="bottom-nav-label">Calendario</span>
      </NavLink>

      <NavLink to="/finanzas" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <span className="bottom-nav-icon">💰</span>
        <span className="bottom-nav-label">Finanzas</span>
      </NavLink>

      <button onClick={onMenuClick} className="bottom-nav-item">
        <span className="bottom-nav-icon">☰</span>
        <span className="bottom-nav-label">Menú</span>
      </button>
    </nav>
  );
};
