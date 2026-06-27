import { useState, useRef } from 'react';

const METODOS_PAGO = [
  { value: 'transferencia', label: 'Transferencia', icon: '🏦', color: '#2563eb', bg: '#dbeafe' },
  { value: 'efectivo',      label: 'Efectivo',       icon: '💵', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'debito',        label: 'T. Débito',      icon: '💳', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'credito',       label: 'T. Crédito',     icon: '💳', color: '#db2777', bg: '#fce7f3' },
  { value: 'cheque',        label: 'Cheque',          icon: '📄', color: '#d97706', bg: '#fef3c7' },
  { value: 'otro',          label: 'Otro',            icon: '💱', color: '#6b7280', bg: '#f3f4f6' },
];

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const emptyComprobante = () => ({
  monto: '',
  metodoPago: 'transferencia',
  banco: '',
  referencia: '',
  fechaPago: new Date().toISOString().split('T')[0],
  observaciones: '',
  archivo: null,       // { name, type, dataUrl }
});

// ── Badge del método de pago ─────────────────────────────────────────────────
const MetodoBadge = ({ value }) => {
  const m = METODOS_PAGO.find(x => x.value === value) || METODOS_PAGO[0];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: m.bg, color: m.color, whiteSpace: 'nowrap',
    }}>
      {m.icon} {m.label}
    </span>
  );
};

// ── Modal para ver el archivo adjunto ────────────────────────────────────────
const ArchivoModal = ({ archivo, onClose }) => {
  const isPdf = archivo?.type === 'application/pdf';
  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 1100 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{
        maxWidth: 820, width: '95vw', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div className="modal-header">
          <h2>📎 {archivo?.name || 'Comprobante'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={archivo?.dataUrl}
              download={archivo?.name || 'comprobante'}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ⬇️ Descargar
            </a>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          {isPdf ? (
            <iframe
              src={archivo.dataUrl}
              title="Comprobante PDF"
              style={{ width: '100%', height: 600, border: 'none', borderRadius: 8 }}
            />
          ) : (
            <img
              src={archivo.dataUrl}
              alt={archivo?.name}
              style={{
                maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain',
                borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,.15)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Formulario de nuevo comprobante ─────────────────────────────────────────
const NuevoComprobanteForm = ({ onGuardar, onCancelar }) => {
  const [form, setForm] = useState(emptyComprobante());
  const [archivoPreview, setArchivoPreview] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const fileRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const archivoData = { name: file.name, type: file.type, dataUrl };
      set('archivo', archivoData);
      setArchivoPreview(archivoData);
    };
    reader.readAsDataURL(file);
  };

  const handleGuardar = () => {
    if (!form.monto || Number(form.monto) <= 0) {
      alert('El monto debe ser mayor a $0');
      return;
    }
    setGuardando(true);
    setTimeout(() => {
      onGuardar({
        ...form,
        id: Date.now().toString(),
        fechaRegistro: new Date().toISOString(),
      });
    }, 300);
  };

  const metodoActual = METODOS_PAGO.find(m => m.value === form.metodoPago);

  return (
    <div style={{
      background: 'hsl(var(--card))',
      border: '1.5px solid hsl(var(--primary) / 0.25)',
      borderRadius: 14,
      padding: '20px 20px 16px',
      marginTop: 14,
      boxShadow: '0 4px 20px hsl(var(--primary) / 0.08)',
      animation: 'fadeInUp 0.2s ease',
    }}>
      {/* Header del formulario */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'hsl(var(--primary-light))',
          display: 'grid', placeItems: 'center', fontSize: 16,
        }}>🧾</div>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Nuevo comprobante</span>
      </div>

      {/* Fila 1: Monto + Método */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Monto *</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'hsl(var(--muted))', fontSize: 13, pointerEvents: 'none',
            }}>$</span>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.monto}
              onChange={e => set('monto', e.target.value)}
              style={{ paddingLeft: 24 }}
            />
          </div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Método de pago *</label>
          <select
            className="form-select"
            value={form.metodoPago}
            onChange={e => set('metodoPago', e.target.value)}
          >
            {METODOS_PAGO.map(m => (
              <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Fila 2: Banco + Referencia */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Banco / Plataforma</label>
          <input
            className="form-input"
            placeholder="Ej. BBVA, PayPal, OXXO..."
            value={form.banco}
            onChange={e => set('banco', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Referencia / No. operación</label>
          <input
            className="form-input"
            placeholder="Número de referencia"
            value={form.referencia}
            onChange={e => set('referencia', e.target.value)}
          />
        </div>
      </div>

      {/* Fila 3: Fecha + Archivo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Fecha del pago *</label>
          <input
            className="form-input"
            type="date"
            value={form.fechaPago}
            onChange={e => set('fechaPago', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Comprobante (imagen/PDF)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileRef.current?.click()}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {form.archivo ? '🔄 Cambiar' : '📎 Adjuntar'}
            </button>
            <span style={{
              fontSize: 12, color: form.archivo ? 'hsl(var(--success))' : 'hsl(var(--muted))',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>
              {form.archivo ? `✓ ${form.archivo.name}` : 'Sin archivo seleccionado'}
            </span>
          </div>
          {/* Preview miniatura */}
          {archivoPreview && archivoPreview.type?.startsWith('image/') && (
            <div style={{ marginTop: 8 }}>
              <img
                src={archivoPreview.dataUrl}
                alt="preview"
                style={{
                  height: 56, width: 'auto', maxWidth: '100%', borderRadius: 8,
                  objectFit: 'cover', border: '1px solid hsl(var(--border))',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Observaciones */}
      <div className="form-group" style={{ margin: '0 0 16px' }}>
        <label className="form-label">Observaciones</label>
        <input
          className="form-input"
          placeholder="Notas adicionales"
          value={form.observaciones}
          onChange={e => set('observaciones', e.target.value)}
        />
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancelar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGuardar}
          disabled={guardando}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {guardando ? (
            <>
              <span style={{
                width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite',
                display: 'inline-block',
              }} />
              Guardando...
            </>
          ) : '✓ Guardar comprobante'}
        </button>
      </div>
    </div>
  );
};

// ── Tarjeta de comprobante existente ────────────────────────────────────────
const ComprobanteCard = ({ comp, index, onEliminar }) => {
  const [verArchivo, setVerArchivo] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const m = METODOS_PAGO.find(x => x.value === comp.metodoPago) || METODOS_PAGO[0];
  const isImg = comp.archivo?.type?.startsWith('image/');
  const isPdf = comp.archivo?.type === 'application/pdf';

  return (
    <>
      <div style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        transition: 'box-shadow 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      >
        {/* Número */}
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: m.bg, color: m.color,
          display: 'grid', placeItems: 'center',
          fontWeight: 800, fontSize: 13,
        }}>
          {m.icon}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 16, color: 'hsl(var(--primary))' }}>
              {fmt(comp.monto)}
            </span>
            <MetodoBadge value={comp.metodoPago} />
            <span style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>
              {comp.fechaPago}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'hsl(var(--muted))' }}>
            {comp.banco && (
              <span>🏦 {comp.banco}</span>
            )}
            {comp.referencia && (
              <span style={{ fontFamily: 'monospace', background: 'hsl(var(--bg))', padding: '1px 6px', borderRadius: 4 }}>
                #{comp.referencia}
              </span>
            )}
            {comp.observaciones && (
              <span>💬 {comp.observaciones}</span>
            )}
          </div>

          {/* Archivo adjunto */}
          {comp.archivo && (
            <div style={{ marginTop: 8 }}>
              {isImg ? (
                <button
                  type="button"
                  onClick={() => setVerArchivo(true)}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <img
                    src={comp.archivo.dataUrl}
                    alt="comprobante"
                    style={{
                      height: 52, width: 'auto', maxWidth: 80, objectFit: 'cover',
                      borderRadius: 7, border: '1px solid hsl(var(--border))',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                  />
                  <span style={{ fontSize: 11, color: 'hsl(var(--primary))' }}>Ver imagen</span>
                </button>
              ) : isPdf ? (
                <button
                  type="button"
                  onClick={() => setVerArchivo(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                    background: '#fee2e2', color: '#b91c1c', borderRadius: 8, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}
                >
                  📄 {comp.archivo.name}
                </button>
              ) : (
                <a
                  href={comp.archivo.dataUrl}
                  download={comp.archivo.name}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12,
                    color: 'hsl(var(--primary))', textDecoration: 'none',
                  }}
                >
                  📎 {comp.archivo.name}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {comp.archivo && (
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setVerArchivo(true)}
              title="Ver archivo"
            >
              👁️
            </button>
          )}
          {comp.archivo && (
            <a
              href={comp.archivo.dataUrl}
              download={comp.archivo.name}
              className="btn btn-ghost btn-icon btn-sm"
              title="Descargar"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ⬇️
            </a>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            title="Eliminar"
            style={{ color: 'hsl(var(--danger))' }}
            onClick={() => setConfirmEliminar(true)}
          >
            🗑️
          </button>
        </div>

        {/* Confirm delete inline */}
        {confirmEliminar && (
          <div style={{
            position: 'absolute', inset: 0, background: 'hsl(var(--card) / 0.96)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, borderRadius: 12, animation: 'fadeIn 0.15s ease',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>¿Eliminar este comprobante?</span>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => { setConfirmEliminar(false); onEliminar(comp.id); }}
            >
              Sí, eliminar
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmEliminar(false)}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Modal archivo */}
      {verArchivo && comp.archivo && (
        <ArchivoModal archivo={comp.archivo} onClose={() => setVerArchivo(false)} />
      )}
    </>
  );
};

// ── Componente principal exportado ───────────────────────────────────────────
export const ComprobantesSection = ({
  comprobantes = [],
  onAgregar,
  onEliminar,
  totalPedido = 0,
  readOnly = false,
}) => {
  const [mostrarForm, setMostrarForm] = useState(false);

  const totalComprobado = comprobantes.reduce((s, c) => s + Number(c.monto || 0), 0);
  const pendiente = totalPedido - totalComprobado;
  const completado = totalComprobado >= totalPedido && totalPedido > 0;

  const handleGuardar = (comp) => {
    onAgregar(comp);
    setMostrarForm(false);
  };

  return (
    <div style={{ marginTop: 4 }}>
      {/* ── Header de la sección ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: comprobantes.length > 0 ? 14 : (mostrarForm ? 0 : 14),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontWeight: 700, fontSize: 14,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: 7, background: 'hsl(var(--primary-light))',
              display: 'grid', placeItems: 'center', fontSize: 14,
            }}>🧾</span>
            Comprobantes de pago
            {comprobantes.length > 0 && (
              <span style={{
                background: 'hsl(var(--primary))', color: '#fff',
                fontSize: 11, fontWeight: 700, borderRadius: 99,
                padding: '1px 7px', minWidth: 20, textAlign: 'center',
              }}>
                {comprobantes.length}
              </span>
            )}
          </div>

          {/* Resumen financiero inline */}
          {totalPedido > 0 && comprobantes.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 99,
              background: completado ? '#f0fdf4' : '#fef3c7',
              border: `1px solid ${completado ? '#bbf7d0' : '#fde68a'}`,
              fontSize: 12, fontWeight: 600,
              color: completado ? '#16a34a' : '#d97706',
            }}>
              {completado ? '✅ Pagado completo' : `⏳ Pendiente: ${fmt(pendiente)}`}
            </div>
          )}
        </div>

        {!readOnly && !mostrarForm && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setMostrarForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: 15 }}>↑</span> Agregar comprobante
          </button>
        )}
      </div>

      {/* ── Resumen totales (si hay comprobantes y hay total) ── */}
      {totalPedido > 0 && comprobantes.length > 0 && (
        <div style={{
          display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap',
        }}>
          {[
            { label: 'Total pedido', value: fmt(totalPedido), color: 'hsl(var(--foreground))' },
            { label: 'Comprobado', value: fmt(totalComprobado), color: '#16a34a' },
            { label: 'Por comprobar', value: fmt(Math.max(0, pendiente)), color: pendiente > 0 ? '#d97706' : '#16a34a' },
          ].map(item => (
            <div key={item.label} style={{
              flex: '1 1 120px', padding: '10px 14px', borderRadius: 10,
              background: 'hsl(var(--bg))', border: '1px solid hsl(var(--border))',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lista de comprobantes ── */}
      {comprobantes.length === 0 && !mostrarForm && (
        <div style={{
          border: '1.5px dashed hsl(var(--border))',
          borderRadius: 12, padding: '20px 16px',
          textAlign: 'center', color: 'hsl(var(--muted))',
          fontSize: 13,
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Sin comprobantes registrados</div>
          {!readOnly && (
            <div style={{ fontSize: 12 }}>Agrega imágenes o PDFs de los pagos recibidos</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comprobantes.map((comp, i) => (
          <ComprobanteCard
            key={comp.id}
            comp={comp}
            index={i}
            onEliminar={readOnly ? undefined : onEliminar}
          />
        ))}
      </div>

      {/* ── Formulario de nuevo comprobante ── */}
      {mostrarForm && (
        <NuevoComprobanteForm
          onGuardar={handleGuardar}
          onCancelar={() => setMostrarForm(false)}
        />
      )}
    </div>
  );
};

export default ComprobantesSection;
