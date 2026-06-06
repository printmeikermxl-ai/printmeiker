export const StatusBadge = ({ status }) => {
  const config = {
    pendiente:  { label: 'Pendiente',   emoji: '⏳', style: { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' } },
    en_proceso: { label: 'En proceso',  emoji: '⚙️', style: { background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' } },
    listo:      { label: 'Listo',       emoji: '✅', style: { background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' } },
    completado: { label: 'Completado',  emoji: '🎉', style: { background: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' } },
    cancelado:  { label: 'Cancelado',   emoji: '✕',  style: { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' } },
    aprobada:   { label: 'Aprobada',    emoji: '✅', style: { background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' } },
    rechazada:  { label: 'Rechazada',   emoji: '✕',  style: { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' } },
    vencida:    { label: 'Vencida',     emoji: '⏰', style: { background: '#FFEDD5', color: '#9A3412', border: '1px solid #FED7AA' } },
    ingreso:    { label: 'Ingreso',     emoji: '📈', style: { background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' } },
    gasto:      { label: 'Gasto',       emoji: '📉', style: { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' } },
  };

  const item = config[status];
  if (!item) return <span className="badge">{status}</span>;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        ...item.style,
      }}
    >
      <span style={{ fontSize: 11 }}>{item.emoji}</span>
      {item.label}
    </span>
  );
};
