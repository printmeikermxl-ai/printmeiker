import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

export const Dashboard = () => {
  const { pedidos, cotizaciones, finanzas, config } = useStore();

  // Stats
  const totalPedidos = pedidos.length;
  const pedidosPendientes = pedidos.filter(p => p.estado === 'pendiente').length;
  const pedidosCompletados = pedidos.filter(p => p.estado === 'completado').length;
  const totalVentas = pedidos
    .filter(p => p.estado === 'completado')
    .reduce((s, p) => s + p.total, 0);
  const totalIngresos = finanzas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const totalGastos = finanzas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);

  // Chart data — last 7 days
  const today = new Date();
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
    const ingresos = finanzas
      .filter(f => f.tipo === 'ingreso' && f.fecha === dateStr)
      .reduce((s, f) => s + f.monto, 0);
    const gastos = finanzas
      .filter(f => f.tipo === 'gasto' && f.fecha === dateStr)
      .reduce((s, f) => s + f.monto, 0);
    return { day: dayLabel, ingresos, gastos };
  });

  const recentPedidos = [...pedidos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Bienvenida, {config.propietario} 👋</p>
        </div>
        <div style={{ fontSize: '13px', color: 'hsl(var(--muted))' }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <div className="stat-value">{totalPedidos}</div>
            <div className="stat-label">Total de pedidos</div>
            <div className="stat-change up">⬆ {pedidosCompletados} completados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <div className="stat-value">{pedidosPendientes}</div>
            <div className="stat-label">Pedidos pendientes</div>
            <div className="stat-change" style={{ color: pedidosPendientes > 0 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>
              {pedidosPendientes > 0 ? '⚠ Requieren atención' : '✓ Todo al día'}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: '20px' }}>{fmt(totalIngresos)}</div>
            <div className="stat-label">Ingresos totales</div>
            <div className="stat-change up">⬆ Este periodo</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-info">
            <div className="stat-value" style={{ fontSize: '20px', color: 'hsl(var(--success))' }}>
              {fmt(totalIngresos - totalGastos)}
            </div>
            <div className="stat-label">Balance neto</div>
            <div className="stat-change up">✓ Balance positivo</div>
          </div>
        </div>
      </div>

      {/* Charts + recent */}
      <div className="dashboard-grid">
        {/* Area chart */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '18px' }}>📊</span>
            <span className="card-title">Ingresos vs Gastos (últimos 7 días)</span>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--danger))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--danger))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={(v, n) => [`$${v.toLocaleString('es-MX')}`, n === 'ingresos' ? 'Ingresos' : 'Gastos']}
                  contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 13 }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" fill="url(#gradIngresos)" strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="gastos" stroke="hsl(var(--danger))" fill="url(#gradGastos)" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent orders */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: '18px' }}>🕐</span>
            <span className="card-title">Pedidos recientes</span>
          </div>
          <div className="recent-list">
            {recentPedidos.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                <p>Sin pedidos aún</p>
              </div>
            ) : (
              recentPedidos.map(p => (
                <div key={p.id} className="recent-item">
                  <div className="recent-avatar">{p.cliente[0].toUpperCase()}</div>
                  <div className="recent-info">
                    <div className="recent-name">{p.cliente}</div>
                    <div className="recent-meta">
                      <StatusBadge status={p.estado} />
                    </div>
                  </div>
                  <div className="recent-amount">{fmt(p.total)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cotizaciones summary */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span style={{ fontSize: '18px' }}>📋</span>
          <span className="card-title">Resumen de cotizaciones</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['pendiente', 'aprobada', 'rechazada'].map(estado => {
              const count = cotizaciones.filter(c => c.estado === estado).length;
              const total = cotizaciones.filter(c => c.estado === estado).reduce((s, c) => s + c.total, 0);
              return (
                <div key={estado} style={{ flex: 1, minWidth: 120, textAlign: 'center', padding: '12px', background: 'hsl(var(--bg))', borderRadius: 10 }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{count}</div>
                  <StatusBadge status={estado} />
                  <div style={{ fontSize: 13, color: 'hsl(var(--muted))', marginTop: 4 }}>{fmt(total)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
