import { useState } from 'react';
import { useStore } from '../store/useStore';

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const TIPOS_MATERIAL = [
  { label: 'Vinil adhesivo', costo: 45 },
  { label: 'Lona', costo: 35 },
  { label: 'Bond', costo: 8 },
  { label: 'Couché', costo: 15 },
  { label: 'Sublimación', costo: 55 },
  { label: 'Tela', costo: 40 },
  { label: 'Otro', costo: 0 },
];

export const CalculadoraPage = () => {
  const { config } = useStore();
  const iva = config.iva || 16;

  const [form, setForm] = useState({
    producto: '',
    cantidad: 1,
    materialTipo: 'Bond',
    materialCosto: 8,
    costoManoObra: 50,
    costoExtra: 0,
    margenGanancia: 30,
    incluirIva: false,
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const costoBase = (Number(form.materialCosto) + Number(form.costoManoObra) + Number(form.costoExtra));
  const costoTotal = costoBase * Number(form.cantidad);
  const margenMonto = costoTotal * (Number(form.margenGanancia) / 100);
  const subtotal = costoTotal + margenMonto;
  const ivaMonto = form.incluirIva ? subtotal * (iva / 100) : 0;
  const precioFinal = subtotal + ivaMonto;
  const precioUnitario = Number(form.cantidad) > 0 ? precioFinal / Number(form.cantidad) : 0;

  const handleMaterialChange = (tipo) => {
    const found = TIPOS_MATERIAL.find(t => t.label === tipo);
    set('materialTipo', tipo);
    if (found) set('materialCosto', found.costo);
  };

  const handleCopiar = () => {
    const text = `
🧮 Cotización calculada
Producto: ${form.producto || 'Sin nombre'}
Cantidad: ${form.cantidad}
Costo unitario: ${fmt(precioUnitario)}
Precio total: ${fmt(precioFinal)}
(Margen de ganancia: ${form.margenGanancia}%)
    `.trim();
    navigator.clipboard.writeText(text).then(() => alert('✅ Copiado al portapapeles'));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">🧮 Calculadora de precios</h2>
          <p className="page-subtitle">Calcula el precio ideal para tus productos</p>
        </div>
      </div>

      <div className="calc-wrapper">
        {/* Form */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: 18 }}>📝</span>
            <span className="card-title">Datos del producto</span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Nombre del producto (opcional)</label>
              <input className="form-input" value={form.producto} onChange={e => set('producto', e.target.value)} placeholder="Ej: Tarjetas de presentación" />
            </div>

            <div className="form-group">
              <label className="form-label">Cantidad a producir</label>
              <input className="form-input" type="number" min="1" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} />
            </div>

            <div className="divider" />
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>📦 Costos</div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tipo de material</label>
                <select className="form-select" value={form.materialTipo} onChange={e => handleMaterialChange(e.target.value)}>
                  {TIPOS_MATERIAL.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Costo del material (por pieza)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.materialCosto} onChange={e => set('materialCosto', e.target.value)} />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Mano de obra (por pieza)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.costoManoObra} onChange={e => set('costoManoObra', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Costos extra (total)</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.costoExtra} onChange={e => set('costoExtra', e.target.value)} placeholder="Envío, diseño..." />
              </div>
            </div>

            <div className="divider" />
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>💹 Precio de venta</div>

            <div className="form-group">
              <label className="form-label">Margen de ganancia: <strong style={{ color: 'hsl(var(--primary))' }}>{form.margenGanancia}%</strong></label>
              <input
                type="range"
                min="0" max="200" step="5"
                value={form.margenGanancia}
                onChange={e => set('margenGanancia', e.target.value)}
                style={{ width: '100%', accentColor: 'hsl(var(--primary))' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'hsl(var(--muted))' }}>
                <span>0%</span><span>50%</span><span>100%</span><span>150%</span><span>200%</span>
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.incluirIva}
                  onChange={e => set('incluirIva', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'hsl(var(--primary))' }}
                />
                <span className="form-label" style={{ margin: 0 }}>Incluir IVA ({iva}%)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Result */}
        <div>
          <div className="calc-result">
            <h3>Precio total sugerido</h3>
            <div className="calc-price">{fmt(precioFinal)}</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              Por unidad: <strong>{fmt(precioUnitario)}</strong>
            </div>

            <div className="calc-breakdown">
              <div className="calc-row">
                <span>Material ({form.cantidad} pzs)</span>
                <span>{fmt(Number(form.materialCosto) * Number(form.cantidad))}</span>
              </div>
              <div className="calc-row">
                <span>Mano de obra</span>
                <span>{fmt(Number(form.costoManoObra) * Number(form.cantidad))}</span>
              </div>
              {Number(form.costoExtra) > 0 && (
                <div className="calc-row">
                  <span>Costos extra</span>
                  <span>{fmt(form.costoExtra)}</span>
                </div>
              )}
              <div className="calc-row">
                <span>Subtotal de producción</span>
                <span>{fmt(costoTotal)}</span>
              </div>
              <div className="calc-row">
                <span>Ganancia ({form.margenGanancia}%)</span>
                <span>{fmt(margenMonto)}</span>
              </div>
              {form.incluirIva && (
                <div className="calc-row">
                  <span>IVA ({iva}%)</span>
                  <span>{fmt(ivaMonto)}</span>
                </div>
              )}
              <div className="calc-row total">
                <span>PRECIO FINAL</span>
                <span>{fmt(precioFinal)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary w-full" onClick={handleCopiar}>
              📋 Copiar resultado
            </button>
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>💡 Resumen</div>
              <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="flex-between"><span className="text-muted">Costo producción:</span><strong>{fmt(costoTotal)}</strong></div>
                <div className="flex-between"><span className="text-muted">Tu ganancia:</span><strong style={{ color: 'hsl(var(--success))' }}>{fmt(margenMonto)}</strong></div>
                <div className="flex-between"><span className="text-muted">Precio/unidad:</span><strong style={{ color: 'hsl(var(--primary))' }}>{fmt(precioUnitario)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
