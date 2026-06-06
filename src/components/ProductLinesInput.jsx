import { useState } from 'react';

export const ProductLinesInput = ({ lines = [], onChange, productos = [] }) => {
  const addLine = () => {
    onChange([...lines, { nombre: '', cantidad: 1, precio: 0 }]);
  };

  const updateLine = (i, field, value) => {
    const updated = lines.map((l, idx) => {
      if (idx !== i) return l;
      const next = { ...l, [field]: value };
      if (field === 'nombre' && productos.length > 0) {
        const found = productos.find(p => p.nombre === value);
        if (found) next.precio = found.precio;
      }
      return next;
    });
    onChange(updated);
  };

  const removeLine = (i) => {
    onChange(lines.filter((_, idx) => idx !== i));
  };

  const total = lines.reduce((s, l) => s + (Number(l.cantidad) * Number(l.precio)), 0);

  return (
    <div>
      <div className="product-lines">
        {lines.map((line, i) => {
          const isCustom = line.isCustom || line.nombre === '__custom' || (line.nombre && !productos.some(p => p.nombre === line.nombre));
          const selectValue = isCustom ? '__custom' : line.nombre;

          return (
            <div key={i} className="product-line">
              {productos.length > 0 ? (
                isCustom ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <input
                      className="form-input"
                      placeholder="Producto o servicio personalizado"
                      value={line.nombre === '__custom' ? '' : line.nombre}
                      onChange={e => updateLine(i, 'nombre', e.target.value)}
                      required
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '8px', minWidth: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        const updated = lines.map((l, idx) => {
                          if (idx !== i) return l;
                          return { ...l, nombre: '', precio: 0, isCustom: false };
                        });
                        onChange(updated);
                      }}
                      title="Seleccionar del catálogo"
                    >
                      📋
                    </button>
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={selectValue}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom') {
                        const updated = lines.map((l, idx) => {
                          if (idx !== i) return l;
                          return { ...l, nombre: '', precio: 0, isCustom: true };
                        });
                        onChange(updated);
                      } else {
                        const found = productos.find(p => p.nombre === val);
                        const updated = lines.map((l, idx) => {
                          if (idx !== i) return l;
                          return { ...l, nombre: val, precio: found ? found.precio : 0, isCustom: false };
                        });
                        onChange(updated);
                      }
                    }}
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.filter(p => p.activo).map(p => (
                      <option key={p.id} value={p.nombre}>{p.nombre}</option>
                    ))}
                    <option value="__custom">Otro / Personalizado</option>
                  </select>
                )
              ) : (
                <input
                  className="form-input"
                  placeholder="Producto o servicio"
                  value={line.nombre}
                  onChange={e => updateLine(i, 'nombre', e.target.value)}
                  required
                />
              )}
            <input
              className="form-input"
              type="number"
              min="1"
              placeholder="Cant."
              value={line.cantidad}
              onChange={e => updateLine(i, 'cantidad', e.target.value)}
            />
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="Precio"
              value={line.precio}
              onChange={e => updateLine(i, 'precio', e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => removeLine(i)}
              title="Eliminar línea"
            >
              🗑️
            </button>
          </div>
          );
        })}
      </div>

      <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={addLine}>
        + Agregar línea
      </button>

      {lines.length > 0 && (
        <div className="order-total-row">
          <span className="text-muted">Total:</span>
          <span style={{ fontSize: '18px', color: 'hsl(var(--primary))' }}>
            ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
};
