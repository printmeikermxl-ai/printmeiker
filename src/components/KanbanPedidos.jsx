import { useStore, store } from '../store/useStore';

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',  icon: '⏳', color: '#f59e0b', bg: '#fef3c7', dark: '#d97706' },
  en_proceso: { label: 'En Proceso', icon: '🔄', color: '#3b82f6', bg: '#dbeafe', dark: '#2563eb' },
  listo:      { label: 'Listo',      icon: '✅', color: '#10b981', bg: '#d1fae5', dark: '#059669' },
  completado: { label: 'Completado', icon: '🎉', color: '#8b5cf6', bg: '#ede9fe', dark: '#7c3aed' },
  cancelado:  { label: 'Cancelado',  icon: '❌', color: '#ef4444', bg: '#fee2e2', dark: '#dc2626' },
};

const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'completado', 'cancelado'];

const ETIQUETAS_CONFIG = [
  { id: 'urgente',    label: 'Urgente',     icon: '🔴', bg: '#fee2e2', text: '#991b1b' },
  { id: 'vip',        label: 'VIP',         icon: '⭐', bg: '#fef9c3', text: '#854d0e' },
  { id: 'corporativo',label: 'Corporativo', icon: '🏢', bg: '#dbeafe', text: '#1e40af' },
  { id: 'diseno',     label: 'Diseño',      icon: '🎨', bg: '#ede9fe', text: '#6b21a8' },
  { id: 'repetido',   label: 'Repetido',    icon: '🔁', bg: '#d1fae5', text: '#065f46' },
  { id: 'express',    label: 'Express',     icon: '⚡', bg: '#fce7f3', text: '#9d174d' },
  { id: 'mayoreo',    label: 'Mayoreo',     icon: '📦', bg: '#f3f4f6', text: '#374151' },
];

export { ETIQUETAS_CONFIG };

const KanbanCard = ({ pedido, canalesVenta, etiquetasPedidos = [], onView, onEdit, onUpdateEstado }) => {
  const cfg = ESTADO_CONFIG[pedido.estado] || ESTADO_CONFIG.pendiente;
  const saldo = (pedido.total || 0) - (pedido.anticipo || 0);
  const etiquetas = (pedido.etiquetas || [])
    .map(id => etiquetasPedidos.find(e => e.id === id || e.nombre === id))
    .filter(Boolean);

  const nextEstado = ESTADOS[ESTADOS.indexOf(pedido.estado) + 1];
  const prevEstado = ESTADOS[ESTADOS.indexOf(pedido.estado) - 1];

  return (
    <div className="kanban-card">
      {/* Header */}
      <div className="kanban-card-header" style={{ borderTop: `3px solid ${cfg.color}` }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: cfg.color }}>{pedido.id}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onView(pedido)} title="Ver detalle" style={{ padding: '2px 4px', fontSize: 13 }}>👁️</button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(pedido)} title="Editar" style={{ padding: '2px 4px', fontSize: 13 }}>✏️</button>
        </div>
      </div>

      {/* Cliente */}
      <div style={{ fontWeight: 700, fontSize: 14, margin: '6px 0 2px', lineHeight: 1.3 }}>{pedido.cliente}</div>
      {pedido.telefono && (
        <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 4 }}>{pedido.telefono}</div>
      )}

      {/* Etiquetas */}
      {etiquetas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {etiquetas.map(e => (
            <span key={e.id} style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: e.bg, color: e.text }}>
              {e.icon} {e.label}
            </span>
          ))}
        </div>
      )}

      {/* Totales */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '6px 0', borderTop: '1px solid hsl(var(--border))' }}>
        <div>
          <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>Total</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{fmt(pedido.total || 0)}</div>
        </div>
        {saldo > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'hsl(var(--muted))' }}>Saldo</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>{fmt(saldo)}</div>
          </div>
        )}
      </div>

      {/* Entrega */}
      {pedido.fechaEntrega && (
        <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 4 }}>
          📅 {pedido.fechaEntrega}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {prevEstado && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ flex: 1, fontSize: 10, padding: '3px 0' }}
            onClick={() => onUpdateEstado ? onUpdateEstado(pedido.id, prevEstado) : store.updatePedido(pedido.id, { estado: prevEstado })}
            title={`Mover a ${ESTADO_CONFIG[prevEstado]?.label}`}
          >
            ← {ESTADO_CONFIG[prevEstado]?.icon}
          </button>
        )}
        {nextEstado && (
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1, fontSize: 10, padding: '3px 0', background: ESTADO_CONFIG[nextEstado]?.color, borderColor: ESTADO_CONFIG[nextEstado]?.color }}
            onClick={() => onUpdateEstado ? onUpdateEstado(pedido.id, nextEstado) : store.updatePedido(pedido.id, { estado: nextEstado })}
            title={`Mover a ${ESTADO_CONFIG[nextEstado]?.label}`}
          >
            {ESTADO_CONFIG[nextEstado]?.icon} →
          </button>
        )}
      </div>
    </div>
  );
};

export const KanbanPedidos = ({ pedidos, canalesVenta, etiquetasPedidos = [], onView, onEdit, onUpdateEstado }) => {
  return (
    <div className="kanban-board">
      {ESTADOS.map(estado => {
        const cfg = ESTADO_CONFIG[estado];
        const cols = pedidos.filter(p => p.estado === estado);
        return (
          <div key={estado} className="kanban-col">
            <div className="kanban-col-header" style={{ borderBottom: `2px solid ${cfg.color}` }}>
              <span style={{ fontSize: 16 }}>{cfg.icon}</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{cfg.label}</span>
              <span style={{
                marginLeft: 'auto', minWidth: 22, height: 22,
                background: `${cfg.color}20`, color: cfg.color,
                borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
              }}>
                {cols.length}
              </span>
            </div>
            <div className="kanban-col-body">
              {cols.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '24px 12px',
                  color: 'hsl(var(--muted))', fontSize: 12,
                  border: '1.5px dashed hsl(var(--border))', borderRadius: 10,
                  marginTop: 4,
                }}>
                  Sin pedidos
                </div>
              ) : (
                cols.map(p => (
                  <KanbanCard
                    key={p.id}
                    pedido={p}
                    canalesVenta={canalesVenta}
                    etiquetasPedidos={etiquetasPedidos}
                    onView={onView}
                    onEdit={onEdit}
                    onUpdateEstado={onUpdateEstado}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
