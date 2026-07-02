import { useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const hoy = () => new Date().toISOString().split('T')[0];
const manana = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export const useNotificaciones = () => {
  const { pedidos, cotizaciones } = useStore();
  const today = hoy();
  const tom = manana();

  return useMemo(() => {
    const lista = [];

    // Pedidos pendientes sin fecha de entrega
    const sinFecha = pedidos.filter(p => p.estado === 'pendiente' && !p.fechaEntrega);
    if (sinFecha.length > 0) {
      lista.push({
        id: 'sin-fecha',
        tipo: 'warning',
        icon: '⚠️',
        titulo: `${sinFecha.length} pedido${sinFecha.length > 1 ? 's' : ''} sin fecha de entrega`,
        descripcion: sinFecha.map(p => p.cliente).slice(0, 3).join(', ') + (sinFecha.length > 3 ? '...' : ''),
        link: '/pedidos',
        color: '#f59e0b',
      });
    }

    // Pedidos que entregan HOY
    const paraHoy = pedidos.filter(p => p.fechaEntrega === today && p.estado !== 'completado' && p.estado !== 'cancelado');
    if (paraHoy.length > 0) {
      lista.push({
        id: 'entrega-hoy',
        tipo: 'urgente',
        icon: '📅',
        titulo: `${paraHoy.length} entrega${paraHoy.length > 1 ? 's' : ''} programada${paraHoy.length > 1 ? 's' : ''} hoy`,
        descripcion: paraHoy.map(p => p.cliente).slice(0, 3).join(', '),
        link: '/pedidos',
        color: '#ef4444',
      });
    }

    // Pedidos que entregan MAÑANA
    const paraManana = pedidos.filter(p => p.fechaEntrega === tom && p.estado !== 'completado' && p.estado !== 'cancelado');
    if (paraManana.length > 0) {
      lista.push({
        id: 'entrega-manana',
        tipo: 'info',
        icon: '🗓️',
        titulo: `${paraManana.length} entrega${paraManana.length > 1 ? 's' : ''} para mañana`,
        descripcion: paraManana.map(p => p.cliente).slice(0, 3).join(', '),
        link: '/pedidos',
        color: '#3b82f6',
      });
    }

    // Cotizaciones vencidas (fecha de validez pasada, estado pendiente)
    const cotVencidas = cotizaciones.filter(c => {
      if (c.estado !== 'pendiente') return false;
      if (!c.validez) return false;
      return c.validez < today;
    });
    if (cotVencidas.length > 0) {
      lista.push({
        id: 'cot-vencidas',
        tipo: 'warning',
        icon: '📋',
        titulo: `${cotVencidas.length} cotización${cotVencidas.length > 1 ? 'es' : ''} vencida${cotVencidas.length > 1 ? 's' : ''}`,
        descripcion: cotVencidas.map(c => c.cliente).slice(0, 3).join(', '),
        link: '/cotizaciones',
        color: '#8b5cf6',
      });
    }

    // Pedidos en proceso (recordatorio)
    const enProceso = pedidos.filter(p => p.estado === 'en_proceso');
    if (enProceso.length > 0) {
      lista.push({
        id: 'en-proceso',
        tipo: 'info',
        icon: '🔄',
        titulo: `${enProceso.length} pedido${enProceso.length > 1 ? 's' : ''} en producción`,
        descripcion: enProceso.map(p => p.cliente).slice(0, 3).join(', '),
        link: '/pedidos',
        color: '#0ea5e9',
      });
    }

    return lista;
  }, [pedidos, cotizaciones, today, tom]);
};

export const NotificacionesPanel = ({ open, onClose }) => {
  const navigate = useNavigate();
  const notificaciones = useNotificaciones();
  const panelRef = useRef();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="notif-panel" ref={panelRef}>
      <div className="notif-header">
        <span style={{ fontWeight: 700, fontSize: 15 }}>🔔 Notificaciones</span>
        <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 500 }}>
          {notificaciones.length} {notificaciones.length === 1 ? 'alerta' : 'alertas'}
        </span>
      </div>

      <div className="notif-list">
        {notificaciones.length === 0 ? (
          <div className="notif-empty">
            <span style={{ fontSize: 36 }}>✅</span>
            <p style={{ fontWeight: 600, marginTop: 8 }}>¡Todo al día!</p>
            <p style={{ fontSize: 12, opacity: 0.6 }}>No tienes alertas pendientes</p>
          </div>
        ) : (
          notificaciones.map(n => (
            <button
              key={n.id}
              className="notif-item"
              onClick={() => { navigate(n.link); onClose(); }}
              style={{ borderLeft: `3px solid ${n.color}` }}
            >
              <span className="notif-item-icon" style={{ background: `${n.color}18`, color: n.color }}>
                {n.icon}
              </span>
              <div className="notif-item-content">
                <div className="notif-item-titulo">{n.titulo}</div>
                <div className="notif-item-desc">{n.descripcion}</div>
              </div>
              <span style={{ color: n.color, fontSize: 14, flexShrink: 0 }}>→</span>
            </button>
          ))
        )}
      </div>

      {notificaciones.length > 0 && (
        <div className="notif-footer">
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => { navigate('/pedidos'); onClose(); }}
          >
            Ver todos los pedidos →
          </button>
        </div>
      )}
    </div>
  );
};

export const NotifBell = () => {
  const notificaciones = useNotificaciones();
  const count = notificaciones.length;

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <span style={{ fontSize: 18 }}>🔔</span>
      {count > 0 && (
        <span style={{
          position: 'absolute', top: -4, right: -5,
          minWidth: 16, height: 16, borderRadius: 99,
          background: '#ef4444', color: '#fff',
          fontSize: 9, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 3px', lineHeight: 1,
          boxShadow: '0 1px 4px rgba(239,68,68,0.5)',
        }}>
          {count > 9 ? '9+' : count}
        </span>
      )}
    </div>
  );
};
