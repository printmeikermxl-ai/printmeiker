import { useState } from 'react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

// Paleta de colores de etiqueta (igual que PedidosPage)
const COLORES_PEDIDO = [
  { value: 'rojo',    label: 'Rojo',    hex: '#EF4444' },
  { value: 'naranja', label: 'Naranja', hex: '#F97316' },
  { value: 'amarillo',label: 'Amarillo',hex: '#EAB308' },
  { value: 'verde',   label: 'Verde',   hex: '#22C55E' },
  { value: 'azul',    label: 'Azul',    hex: '#3B82F6' },
  { value: 'morado',  label: 'Morado',  hex: '#8B5CF6' },
  { value: 'rosa',    label: 'Rosa',    hex: '#EC4899' },
  { value: 'gris',    label: 'Gris',    hex: '#6B7280' },
];

// Color hex de un pedido (usa etiqueta si tiene, si no usa color de estado)
const ESTADO_COLORS = {
  pendiente:  '#F59E0B',
  en_proceso: '#3B82F6',
  listo:      '#10B981',
  completado: '#8B5CF6',
  cancelado:  '#EF4444',
};

const getPedidoColor = (pedido) => {
  if (pedido.color) {
    const found = COLORES_PEDIDO.find(c => c.value === pedido.color);
    return found ? found.hex : ESTADO_COLORS[pedido.estado] || '#6B7280';
  }
  return ESTADO_COLORS[pedido.estado] || '#6B7280';
};

export const CalendarioPage = () => {
  const { pedidos } = useStore();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedPedido, setSelectedPedido] = useState(null);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const setToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Metrics for the current month
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthPedidos = pedidos.filter(p => p.fechaEntrega && p.fechaEntrega.startsWith(currentMonthPrefix));

  const totalPendientes = monthPedidos.filter(p => p.estado === 'pendiente').length;
  const totalEnProceso = monthPedidos.filter(p => p.estado === 'en_proceso').length;
  const totalListos = monthPedidos.filter(p => p.estado === 'listo').length;
  const totalCompletados = monthPedidos.filter(p => p.estado === 'completado').length;

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const daysGrid = [];

  // Padding days from previous month
  const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push({
      day: prevMonthDaysCount - i,
      isPadding: true,
      dateStr: ''
    });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysGrid.push({
      day: d,
      isPadding: false,
      dateStr
    });
  }

  // Padding days for next month to complete the last week grid row
  const totalCells = Math.ceil(daysGrid.length / 7) * 7;
  const nextMonthPaddingCount = totalCells - daysGrid.length;
  for (let i = 1; i <= nextMonthPaddingCount; i++) {
    daysGrid.push({
      day: i,
      isPadding: true,
      dateStr: ''
    });
  }

  // Split grid into weeks
  const weeks = [];
  for (let i = 0; i < daysGrid.length; i += 7) {
    weeks.push(daysGrid.slice(i, i + 7));
  }

  const getPedidosForDate = (dateStr) => {
    if (!dateStr) return [];
    return pedidos.filter(p => p.fechaEntrega === dateStr);
  };

  const handleOpenPedido = (p) => {
    setSelectedPedido(p);
  };

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const tStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateStr === tStr;
  };

  // Remaining balance
  const calculateSaldo = (p) => {
    return Number(p.total) - Number(p.anticipo || 0);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Metrics Header */}
      <div className="calendar-metrics-banner">
        <div className="metric-box">
          <span className="metric-val">{monthPedidos.length}</span>
          <span className="metric-label">📅 Entregas del mes</span>
        </div>
        <div className="metric-box">
          <span className="metric-val yellow">{totalPendientes}</span>
          <span className="metric-label">⏳ Pendientes</span>
        </div>
        <div className="metric-box">
          <span className="metric-val blue">{totalEnProceso}</span>
          <span className="metric-label">⚙️ En proceso</span>
        </div>
        <div className="metric-box">
          <span className="metric-val green">{totalListos}</span>
          <span className="metric-label">✅ Listos</span>
        </div>
        <div className="metric-box">
          <span className="metric-val muted">{totalCompletados}</span>
          <span className="metric-label">📦 Entregados</span>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="calendar-controls">
        <h2 className="calendar-current-month">
          {MESES[currentMonth]} {currentYear}
        </h2>
        <div className="calendar-btn-group">
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◀ Anterior</button>
          <button className="btn btn-secondary btn-sm" onClick={setToday}>Hoy</button>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Siguiente ▶</button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="calendar-card card">
        <div className="calendar-grid-header">
          {DIAS_SEMANA.map(day => (
            <div key={day} className="calendar-grid-header-cell">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-grid-body">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="calendar-grid-row">
              {week.map((cell, cIdx) => {
                const dayPedidos = getPedidosForDate(cell.dateStr);
                return (
                  <div
                    key={cIdx}
                    className={`calendar-day-cell ${cell.isPadding ? 'padding' : ''} ${isToday(cell.dateStr) ? 'today' : ''}`}
                  >
                    <span className="calendar-day-number">{cell.day}</span>
                    <div className="calendar-day-content">
                      {dayPedidos.map(p => {
                          const badgeColor = getPedidoColor(p);
                          return (
                            <div
                              key={p.id}
                              className={`calendar-order-badge badge-${p.estado}`}
                              onClick={() => handleOpenPedido(p)}
                              title={`${p.cliente} - ${p.estado}${p.color ? ' · ' + p.color : ''}`}
                              style={{
                                background: `${badgeColor}22`,
                                borderLeft: `3px solid ${badgeColor}`,
                                color: 'hsl(var(--foreground))',
                              }}
                            >
                              {p.color && (
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: badgeColor, flexShrink: 0, display: 'inline-block', marginRight: 3 }} />
                              )}
                              <span className="order-id">{p.id}</span>
                              <span className="order-client">{p.cliente}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* View Modal */}
      {selectedPedido && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>📦 Pedido {selectedPedido.id}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedPedido(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div>
                  <span className="text-muted">Cliente:</span>
                  <div className="font-bold">{selectedPedido.cliente}</div>
                </div>
                <div>
                  <span className="text-muted">Teléfono:</span>
                  <div>{selectedPedido.telefono || '—'}</div>
                </div>
                <div>
                  <span className="text-muted">Email:</span>
                  <div>{selectedPedido.email || '—'}</div>
                </div>
                <div>
                  <span className="text-muted">Estado:</span>
                  <div><StatusBadge status={selectedPedido.estado} /></div>
                </div>
                <div>
                  <span className="text-muted">Fecha del pedido:</span>
                  <div>{selectedPedido.fecha}</div>
                </div>
                <div>
                  <span className="text-muted">Fecha de entrega:</span>
                  <div className="font-bold">{selectedPedido.fechaEntrega || '—'}</div>
                </div>
              </div>
              
              <div className="divider" />
              <div className="form-label" style={{ marginBottom: 10 }}>Productos</div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPedido.productos.map((line, i) => (
                      <tr key={i}>
                        <td>{line.nombre}</td>
                        <td>{line.cantidad}</td>
                        <td>{fmt(line.precio)}</td>
                        <td><strong>{fmt(line.cantidad * line.precio)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="order-total-row" style={{ marginTop: 12 }}>
                <span className="text-muted">Total:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'hsl(var(--primary))' }}>
                  {fmt(selectedPedido.total)}
                </span>
              </div>
              <div className="order-total-row">
                <span className="text-muted">Anticipo:</span>
                <span style={{ color: 'hsl(var(--success))' }}>
                  {fmt(selectedPedido.anticipo || 0)}
                </span>
              </div>
              <div className="order-total-row">
                <span className="text-muted">Saldo restante:</span>
                <span style={{ 
                  fontWeight: 700, 
                  color: calculateSaldo(selectedPedido) > 0 ? 'hsl(var(--warning))' : 'hsl(var(--success))' 
                }}>
                  {fmt(calculateSaldo(selectedPedido))}
                </span>
              </div>

              {selectedPedido.notas && (
                <>
                  <div className="divider" />
                  <div>
                    <span className="text-muted">Notas:</span>
                    <p style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{selectedPedido.notas}</p>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedPedido(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
