import { useState } from 'react';

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export const ProductLinesInput = ({ lines = [], onChange, productos = [], combos = [] }) => {
  const addLine = () => {
    onChange([...lines, { nombre: '', cantidad: 1, precio: 0 }]);
  };

  /** Calcula el precio correcto según la cantidad y si el producto tiene mayoreo */
  const precioEfectivo = (producto, cantidad) => {
    if (
      producto?.tieneMayoreo &&
      producto?.mayoreoMinPiezas &&
      producto?.mayoreo_precio &&
      Number(cantidad) >= Number(producto.mayoreoMinPiezas)
    ) {
      return Number(producto.mayoreo_precio);
    }
    return Number(producto?.precio ?? 0);
  };

  const updateLine = (i, field, value) => {
    const updated = lines.map((l, idx) => {
      if (idx !== i) return l;
      const next = { ...l, [field]: value };

      if (field === 'nombre' && productos.length > 0) {
        const found = productos.find(p => p.nombre === value);
        if (found) {
          next.precio = precioEfectivo(found, l.cantidad);
          next._productoId = found.id;
        }
      }

      // Re-calcular precio si cambia la cantidad (para aplicar mayoreo)
      if (field === 'cantidad') {
        const productoBase = productos.find(p => p.nombre === l.nombre);
        if (productoBase) {
          next.precio = precioEfectivo(productoBase, value);
        }
      }

      return next;
    });
    onChange(updated);
  };

  const removeLine = (i) => {
    onChange(lines.filter((_, idx) => idx !== i));
  };

  const calcularDescuentoLinea = (l) => {
    if (!l.descuentoActivo || !l.descuentoValor) return 0;
    const base = Number(l.cantidad) * Number(l.precio);
    if (l.descuentoTipo === 'porcentaje') {
      return (base * Number(l.descuentoValor)) / 100;
    } else {
      return Math.min(base, Number(l.descuentoValor));
    }
  };

  const total = lines.reduce((s, l) => {
    const base = Number(l.cantidad) * Number(l.precio);
    const desc = calcularDescuentoLinea(l);
    return s + (base - desc);
  }, 0);

  return (
    <div>
      <div className="product-lines">
        {lines.map((line, i) => {
          const isCustom = line.isCustom || line.nombre === '__custom' || (line.nombre && !productos.some(p => p.nombre === line.nombre) && !combos.some(c => c.nombre === line.nombre));
          const selectValue = isCustom ? '__custom' : (line._comboId ? `combo:${line._comboId}` : (line._productoId ? `prod:${line._productoId}` : (productos.find(p => p.nombre === line.nombre)?.id ? `prod:${productos.find(p => p.nombre === line.nombre).id}` : line.nombre)));
          const productoBase = productos.find(p => p.nombre === line.nombre);
          const tieneMayoreo = productoBase?.tieneMayoreo && productoBase?.mayoreoMinPiezas && productoBase?.mayoreo_precio;
          const mayoreoActivo = tieneMayoreo && Number(line.cantidad) >= Number(productoBase.mayoreoMinPiezas);

          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, borderBottom: '1px solid hsl(var(--border) / 0.3)', paddingBottom: 12 }}>
              <div className="product-line">
                {(productos.length > 0 || combos.length > 0) ? (
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
                            return { ...l, nombre: '', precio: 0, isCustom: false, _esCombo: false, _comboId: null, _comboDescripcion: null };
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
                            return { ...l, nombre: '', precio: 0, isCustom: true, _esCombo: false, _comboId: null, _comboDescripcion: null };
                          });
                          onChange(updated);
                        } else if (val.startsWith('combo:')) {
                          const id = val.replace('combo:', '');
                          const found = combos.find(c => c.id === id);
                          const updated = lines.map((l, idx) => {
                            if (idx !== i) return l;
                            return { 
                              ...l, 
                              nombre: found ? found.nombre : '', 
                              precio: found ? Number(found.precio) : 0, 
                              cantidad: 1,
                              isCustom: false,
                              _esCombo: true,
                              _comboId: id,
                              _comboDescripcion: found ? found.descripcion : '',
                              descuentoActivo: false,
                              descuentoTipo: 'porcentaje',
                              descuentoValor: ''
                            };
                          });
                          onChange(updated);
                        } else if (val.startsWith('prod:')) {
                          const id = val.replace('prod:', '');
                          const found = productos.find(p => p.id === id);
                          const updated = lines.map((l, idx) => {
                            if (idx !== i) return l;
                            return { 
                              ...l, 
                              nombre: found ? found.nombre : '', 
                              precio: found ? precioEfectivo(found, l.cantidad) : 0, 
                              isCustom: false,
                              _esCombo: false,
                              _comboId: null,
                              _comboDescripcion: null,
                              _productoId: id,
                              descuentoActivo: false
                            };
                          });
                          onChange(updated);
                        } else {
                          const updated = lines.map((l, idx) => {
                            if (idx !== i) return l;
                            return { ...l, nombre: val, precio: 0, isCustom: false, _esCombo: false, _comboId: null, _comboDescripcion: null };
                          });
                          onChange(updated);
                        }
                      }}
                    >
                      <option value="">Seleccionar producto o combo</option>
                      {productos.filter(p => p.activo).length > 0 && (
                        <optgroup label="── Productos individuales ──">
                          {productos.filter(p => p.activo).map(p => (
                            <option key={p.id} value={`prod:${p.id}`}>{p.nombre} ({fmt(p.precio)})</option>
                          ))}
                        </optgroup>
                      )}
                      {combos.filter(c => c.activo).length > 0 && (
                        <optgroup label="── Combos / Paquetes ──">
                          {combos.filter(c => c.activo).map(c => (
                            <option key={c.id} value={`combo:${c.id}`}>🎁 {c.nombre} ({fmt(c.precio)})</option>
                          ))}
                        </optgroup>
                      )}
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
                  style={mayoreoActivo ? { borderColor: 'hsl(var(--primary))', background: 'hsl(var(--primary-light))' } : {}}
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

              {/* Resumen de subtotal por cantidad de esta línea */}
              {Number(line.cantidad) > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  padding: '6px 12px',
                  background: 'hsl(var(--primary-light) / 0.4)',
                  borderRadius: 8,
                  color: 'hsl(var(--primary-dark))',
                  fontWeight: 600,
                  marginTop: 4,
                  border: '1px solid hsl(var(--primary) / 0.15)'
                }}>
                  <span>Subtotal por cantidad ({line.cantidad} x {fmt(line.precio)}):</span>
                  <span>
                    {line.descuentoActivo && Number(line.descuentoValor) > 0 ? (
                      <>
                        <span style={{ textDecoration: 'line-through', color: 'hsl(var(--muted))', marginRight: 8 }}>
                          {fmt(Number(line.cantidad) * Number(line.precio))}
                        </span>
                        <span>
                          {fmt(Number(line.cantidad) * Number(line.precio) - calcularDescuentoLinea(line))}
                        </span>
                      </>
                    ) : (
                      fmt(Number(line.cantidad) * Number(line.precio))
                    )}
                  </span>
                </div>
              )}

              {/* Indicador de precio mayoreo activo */}
              {tieneMayoreo && !isCustom && (
                <div style={{
                  marginLeft: 4, fontSize: 11,
                  color: mayoreoActivo ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                  display: 'flex', alignItems: 'center', gap: 5, padding: '0 2px',
                }}>
                  {mayoreoActivo ? (
                    <>
                      <span>✅</span>
                      <span style={{ fontWeight: 600 }}>
                        Precio mayoreo aplicado — {fmt(productoBase.mayoreo_precio)}/pz
                        <span style={{ fontWeight: 400, marginLeft: 4 }}>
                          (precio normal: {fmt(productoBase.precio)}/pz)
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>📦</span>
                      <span>
                        Mayoreo desde <strong>{productoBase.mayoreoMinPiezas} pzs</strong> → {fmt(productoBase.mayoreo_precio)}/pz
                        {' '}(ahorra {fmt(productoBase.precio - productoBase.mayoreo_precio)} por pieza)
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Descuentos e Información para COMBOS */}
              {line._esCombo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, padding: '8px 12px', background: 'hsl(var(--bg) / 0.4)', borderRadius: 10, border: '1px solid hsl(var(--border) / 0.5)' }}>
                  {line._comboDescripcion && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--primary))' }}>📦 Artículos incluidos:</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 4 }}>
                        {line._comboDescripcion.split('\n').filter(Boolean).map((lin, idx) => {
                          const match = lin.match(/^(\d+)\s*(?:x|pz|pzs|pz\.|pzs\.)?\s*(.*)$/i);
                          if (match) {
                            return (
                              <div key={idx} style={{ fontSize: 12, color: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ display: 'inline-block', width: 20, height: 16, background: 'hsl(var(--primary-light))', color: 'hsl(var(--primary))', borderRadius: 4, textAlign: 'center', lineHeight: '16px', fontWeight: 700, fontSize: 9 }}>
                                  {Number(match[1]) * Number(line.cantidad || 1)}
                                </span>
                                <span style={{ fontWeight: 500 }}>{match[2]}</span>
                              </div>
                            );
                          }
                          return (
                            <div key={idx} style={{ fontSize: 12, color: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 10 }}>•</span>
                              <span style={{ fontWeight: 500 }}>{lin}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={!!line.descuentoActivo}
                        onChange={e => updateLine(i, 'descuentoActivo', e.target.checked)}
                        style={{ width: 14, height: 14, accentColor: 'hsl(var(--primary))' }}
                      />
                      <span>Aplicar descuento</span>
                    </label>

                    {line.descuentoActivo && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <select
                          className="form-select"
                          value={line.descuentoTipo || 'porcentaje'}
                          onChange={e => updateLine(i, 'descuentoTipo', e.target.value)}
                          style={{ width: 120, height: 28, padding: '2px 8px', fontSize: 12 }}
                        >
                          <option value="porcentaje">Porcentaje (%)</option>
                          <option value="monto">Monto fijo ($)</option>
                        </select>
                        <input
                          type="number"
                          className="form-input"
                          min="0"
                          step="0.01"
                          value={line.descuentoValor ?? ''}
                          onChange={e => updateLine(i, 'descuentoValor', e.target.value)}
                          placeholder={line.descuentoTipo === 'monto' ? '0.00' : '0'}
                          style={{ width: 80, height: 28, padding: '2px 8px', fontSize: 12 }}
                        />
                        {Number(line.descuentoValor) > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--danger))' }}>
                            Rebaja: -{fmt(calcularDescuentoLinea(line))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
