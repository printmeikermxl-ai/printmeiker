import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CATEGORIAS_INGRESO = ['Ventas', 'Anticipo', 'Servicio', 'Otro'];
const CATEGORIAS_GASTO = ['Materiales', 'Renta', 'Servicios', 'Salarios', 'Equipo', 'Otro'];

const emptyForm = () => ({
  tipo: 'ingreso', concepto: '', monto: '',
  fecha: new Date().toISOString().split('T')[0],
  categoria: 'Ventas',
});

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export const FinanzasPage = () => {
  const { finanzas } = useStore();
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [confirm, setConfirm] = useState(null);

  const filtered = finanzas.filter(f => {
    const matchSearch = f.concepto.toLowerCase().includes(search.toLowerCase()) || f.categoria.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || f.tipo === filtroTipo;
    return matchSearch && matchTipo;
  });

  const ingresos = finanzas.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + f.monto, 0);
  const gastos = finanzas.filter(f => f.tipo === 'gasto').reduce((s, f) => s + f.monto, 0);
  const balance = ingresos - gastos;

  // Chart data by category
  const categorias = [...new Set(finanzas.map(f => f.categoria))];
  const chartData = categorias.map(cat => {
    const ing = finanzas.filter(f => f.tipo === 'ingreso' && f.categoria === cat).reduce((s, f) => s + f.monto, 0);
    const gas = finanzas.filter(f => f.tipo === 'gasto' && f.categoria === cat).reduce((s, f) => s + f.monto, 0);
    return { cat: cat.length > 10 ? cat.slice(0, 10) + '…' : cat, ingresos: ing, gastos: gas };
  });

  const handleSave = (e) => {
    e.preventDefault();
    store.addFinanza({ ...form, monto: Number(form.monto) });
    setModal(false);
    setForm(emptyForm());
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">💰 Finanzas</h2>
          <p className="page-subtitle">Control de ingresos y gastos</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm()); setModal(true); }}>+ Registrar movimiento</button>
      </div>

      {/* Summary */}
      <div className="finanzas-summary">
        <div className="balance-card positive">
          <div className="balance-label">💚 Total ingresos</div>
          <div className="balance-amount">{fmt(ingresos)}</div>
        </div>
        <div className="balance-card negative">
          <div className="balance-label">❤️ Total gastos</div>
          <div className="balance-amount">{fmt(gastos)}</div>
        </div>
        <div className={`balance-card ${balance >= 0 ? 'neutral' : 'negative'}`}>
          <div className="balance-label">{balance >= 0 ? '✨' : '⚠️'} Balance neto</div>
          <div className="balance-amount">{fmt(balance)}</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span style={{ fontSize: 18 }}>📊</span>
            <span className="card-title">Movimientos por categoría</span>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="cat" tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted))' }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v, n) => [`$${v.toLocaleString('es-MX')}`, n === 'ingresos' ? 'Ingresos' : 'Gastos']} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Legend />
                <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" fill="hsl(142 60% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span>🔍</span>
          <input placeholder="Buscar movimiento..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tabs">
          {['todos', 'ingreso', 'gasto'].map(t => (
            <button key={t} className={`tab ${filtroTipo === t ? 'active' : ''}`} onClick={() => setFiltroTipo(t)}>
              {t === 'todos' ? 'Todos' : t === 'ingreso' ? '📈 Ingresos' : '📉 Gastos'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💰</div>
          <h3>Sin movimientos</h3>
          <p>Registra tu primer ingreso o gasto.</p>
          <button className="btn btn-primary" onClick={() => setModal(true)}>Registrar movimiento</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(f => (
                <tr key={f.id}>
                  <td><StatusBadge status={f.tipo} /></td>
                  <td><div style={{ fontWeight: 600 }}>{f.concepto}</div></td>
                  <td><span style={{ fontSize: 12, background: 'hsl(var(--bg))', padding: '2px 8px', borderRadius: 99, color: 'hsl(var(--muted))' }}>{f.categoria}</span></td>
                  <td style={{ fontSize: 13 }}>{f.fecha}</td>
                  <td>
                    <strong style={{ color: f.tipo === 'ingreso' ? 'hsl(var(--success))' : 'hsl(var(--danger))' }}>
                      {f.tipo === 'ingreso' ? '+' : '-'}{fmt(f.monto)}
                    </strong>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfirm({ id: f.id })} style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>➕ Nuevo movimiento</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <div className="tabs" style={{ width: '100%' }}>
                    {['ingreso', 'gasto'].map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`tab ${form.tipo === t ? 'active' : ''}`}
                        style={{ flex: 1 }}
                        onClick={() => set('tipo', t)}
                      >
                        {t === 'ingreso' ? '📈 Ingreso' : '📉 Gasto'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Concepto *</label>
                  <input className="form-input" required value={form.concepto} onChange={e => set('concepto', e.target.value)} placeholder="Descripción del movimiento" />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                    {(form.tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monto *</label>
                  <input className="form-input" type="number" min="0" step="0.01" required value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input className="form-input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">✓ Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog title="¿Eliminar movimiento?" message="Esta acción no se puede deshacer." onConfirm={() => { store.deleteFinanza(confirm.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
};
