export const StatusBadge = ({ status }) => {
  const labels = {
    pendiente: '⏳ Pendiente',
    en_proceso: '🔄 En proceso',
    listo: '✅ Listo',
    completado: '🎉 Completado',
    cancelado: '❌ Cancelado',
    aprobada: '✅ Aprobada',
    rechazada: '❌ Rechazada',
    vencida: '⏰ Vencida',
    ingreso: '📈 Ingreso',
    gasto: '📉 Gasto',
  };

  return (
    <span className={`badge badge-${status}`}>
      {labels[status] || status}
    </span>
  );
};
