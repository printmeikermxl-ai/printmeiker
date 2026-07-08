import { useState, useRef } from 'react';
import { useStore, store } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ProductLinesInput } from '../components/ProductLinesInput';
import { ComprobantesSection } from '../components/ComprobantesSection';
import { FieldHelp } from '../components/FieldHelp';
import { KanbanPedidos } from '../components/KanbanPedidos';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const METODOS_PAGO_PED = [
  { value: 'efectivo',      label: 'Efectivo',                  icon: '💵', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'transferencia', label: 'Transferencia',             icon: '🏦', color: '#2563eb', bg: '#dbeafe' },
  { value: 'debito',        label: 'Tarjeta de débito',         icon: '💳', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'credito',       label: 'Tarjeta de crédito',        icon: '💳', color: '#db2777', bg: '#fce7f3' },
  { value: 'mixto',         label: 'Mixto (efectivo+tarjeta)', icon: '🔀', color: '#d97706', bg: '#fef3c7' },
];

const ESTADOS = ['pendiente', 'en_proceso', 'listo', 'completado', 'cancelado'];


// Color del borde izquierdo según estado
const ROW_COLORS = {
  pendiente:  { borderLeft: '3px solid #F59E0B', background: 'transparent' },
  en_proceso: { borderLeft: '3px solid #3B82F6', background: 'rgba(59,130,246,0.03)' },
  listo:      { borderLeft: '3px solid #10B981', background: 'rgba(16,185,129,0.04)' },
  completado: { borderLeft: '3px solid #8B5CF6', background: 'rgba(139,92,246,0.04)' },
  cancelado:  { borderLeft: '3px solid #EF4444', background: 'rgba(239,68,68,0.05)' },
};

const emptyForm = () => ({
  cliente: '', telefono: '', email: '',
  fecha: new Date().toISOString().split('T')[0],
  fechaEntrega: '',
  estado: 'pendiente',
  productos: [{ nombre: '', cantidad: 1, precio: 0 }],
  anticipo: 0, notas: '',
  ajuste: 0,
  etiquetas: [],
});

const fmt = (n) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const COLORES_DISPONIBLES = [
  { bg: '#E8D5FF', text: '#6B21A8', label: 'Morado' },
  { bg: '#D1FAE5', text: '#065F46', label: 'Verde' },
  { bg: '#FEE2E2', text: '#991B1B', label: 'Rojo' },
  { bg: '#FEF9C3', text: '#854D0E', label: 'Amarillo' },
  { bg: '#DBEAFE', text: '#1E40AF', label: 'Azul' },
  { bg: '#FCE7F3', text: '#9D174D', label: 'Rosa' },
  { bg: '#F3F4F6', text: '#374151', label: 'Gris' },
  { bg: '#ECFDF5', text: '#166534', label: 'Menta' },
];

const EMOJIS_DISPONIBLES = ['💬','📸','👤','🏪','🌐','🛍️','📦','🚀','🔥','✨','🎉','⭐','📞','✉️'];

export const CanalBadge = ({ canalId, canalesVenta = [] }) => {
  const canal = (canalesVenta || []).find(c => c.id === canalId || c.nombre === canalId);
  if (canal) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
        background: canal.color, color: canal.text, whiteSpace: 'nowrap',
      }}>
        {canal.emoji || '🌐'} {canal.nombre}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: '#F3F4F6', color: '#374151', whiteSpace: 'nowrap',
    }}>
      🌐 Otro
    </span>
  );
};

const ModalCanales = ({ canalesVenta = [], onClose }) => {
  const [nueva, setNueva] = useState({ nombre: '', emoji: '💬', color: COLORES_DISPONIBLES[0].bg, text: COLORES_DISPONIBLES[0].text });
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleAgregar = () => {
    if (!nueva.nombre.trim()) return;
    store.addCanalVenta({ nombre: nueva.nombre.trim(), emoji: nueva.emoji, color: nueva.color, text: nueva.text });
    setNueva({ nombre: '', emoji: '💬', color: COLORES_DISPONIBLES[0].bg, text: COLORES_DISPONIBLES[0].text });
  };

  const handleEditar = (c) => {
    setEditandoId(c.id);
    setEditForm({ nombre: c.nombre, emoji: c.emoji || '🌐', color: c.color, text: c.text });
  };

  const handleGuardarEdit = () => {
    if (!editForm.nombre.trim()) return;
    store.updateCanalVenta(editandoId, editForm);
    setEditandoId(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>🌐 Gestionar canales de venta</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Canales existentes */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', marginBottom: 12 }}>
            MIS CANALES DE VENTA ({canalesVenta.length})
          </div>

          {canalesVenta.length === 0 && (
            <div style={{ padding: '12px 0', color: 'hsl(var(--muted))', fontSize: 13, textAlign: 'center' }}>
              Sin canales de venta personalizados aún. ¡Crea el primero!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {canalesVenta.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, background: 'hsl(var(--bg))',
                border: '1px solid hsl(var(--border))',
              }}>
                {editandoId === c.id ? (
                  <>
                    <select
                      value={editForm.emoji}
                      onChange={e => setEditForm(f => ({ ...f, emoji: e.target.value }))}
                      style={{ fontSize: 18, border: 'none', background: 'transparent', cursor: 'pointer', width: 40 }}
                    >
                      {EMOJIS_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                    <input
                      className="form-input"
                      style={{ flex: 1, height: 34 }}
                      value={editForm.nombre}
                      onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Nombre de canal"
                    />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {COLORES_DISPONIBLES.map((col, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, color: col.bg, text: col.text }))}
                          style={{
                            width: 20, height: 20, borderRadius: 99, background: col.bg,
                            border: editForm.color === col.bg ? `2px solid ${col.text}` : '2px solid transparent',
                            cursor: 'pointer',
                          }}
                          title={col.label}
                        />
                      ))}
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleGuardarEdit}>✓</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditandoId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 18 }}>{c.emoji || '🌐'}</span>
                    <span style={{
                      flex: 1, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                      background: c.color, color: c.text, display: 'inline-block',
                    }}>
                      {c.nombre}
                    </span>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEditar(c)}>✏️</button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'hsl(var(--danger))' }}
                      onClick={() => store.deleteCanalVenta(c.id)}
                    >🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Crear nuevo canal */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', margin: '16px 0 12px' }}>
            + NUEVO CANAL DE VENTA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', background: 'hsl(var(--bg))', borderRadius: 10, border: '1px dashed hsl(var(--border))' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={nueva.emoji}
                onChange={e => setNueva(f => ({ ...f, emoji: e.target.value }))}
                style={{ fontSize: 20, border: 'none', background: 'transparent', cursor: 'pointer', width: 44 }}
              >
                {EMOJIS_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={nueva.nombre}
                onChange={e => setNueva(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre del canal (ej. TikTok, Recomendado...)"
                onKeyDown={e => e.key === 'Enter' && handleAgregar()}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>Color:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORES_DISPONIBLES.map((col, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNueva(f => ({ ...f, color: col.bg, text: col.text }))}
                    style={{
                      width: 22, height: 22, borderRadius: 99, background: col.bg,
                      border: nueva.color === col.bg ? `2px solid ${col.text}` : '2px solid transparent',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                    title={col.label}
                  />
                ))}
              </div>
              {/* Preview */}
              {nueva.nombre && (
                <span style={{
                  padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: nueva.color, color: nueva.text,
                }}>
                  {nueva.emoji} {nueva.nombre}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={handleAgregar}
              disabled={!nueva.nombre.trim()}
            >
              + Agregar canal
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn type-primary" style={{ background: 'hsl(var(--primary))', color: '#fff', padding: '9px 16px', borderRadius: 'var(--radius-sm)' }} onClick={onClose}>✓ Listo</button>
        </div>
      </div>
    </div>
  );
};

const ModalEtiquetasPedidos = ({ etiquetasPedidos = [], onClose }) => {
  const [nueva, setNueva] = useState({ nombre: '', emoji: '🏷️', color: COLORES_DISPONIBLES[0].bg, text: COLORES_DISPONIBLES[0].text });
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleAgregar = () => {
    if (!nueva.nombre.trim()) return;
    store.addEtiquetaPedido({ nombre: nueva.nombre.trim(), emoji: nueva.emoji, color: nueva.color, text: nueva.text });
    setNueva({ nombre: '', emoji: '🏷️', color: COLORES_DISPONIBLES[0].bg, text: COLORES_DISPONIBLES[0].text });
  };

  const handleEditar = (e) => {
    setEditandoId(e.id);
    setEditForm({ nombre: e.nombre, emoji: e.emoji || '🏷️', color: e.color, text: e.text });
  };

  const handleGuardarEdit = () => {
    if (!editForm.nombre.trim()) return;
    store.updateEtiquetaPedido(editandoId, editForm);
    setEditandoId(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>🏷️ Gestionar etiquetas de pedidos</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Etiquetas existentes */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', marginBottom: 12 }}>
            MIS ETIQUETAS ({etiquetasPedidos.length})
          </div>

          {etiquetasPedidos.length === 0 && (
            <div style={{ padding: '12px 0', color: 'hsl(var(--muted))', fontSize: 13, textAlign: 'center' }}>
              Sin etiquetas personalizadas aún. ¡Crea una!
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {etiquetasPedidos.map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, background: 'hsl(var(--bg))',
                border: '1px solid hsl(var(--border))',
              }}>
                {editandoId === e.id ? (
                  <>
                    <select
                      value={editForm.emoji}
                      onChange={ev => setEditForm(f => ({ ...f, emoji: ev.target.value }))}
                      style={{ fontSize: 18, border: 'none', background: 'transparent', cursor: 'pointer', width: 40 }}
                    >
                      {EMOJIS_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
                    </select>
                    <input
                      className="form-input"
                      style={{ flex: 1, height: 34 }}
                      value={editForm.nombre}
                      onChange={ev => setEditForm(f => ({ ...f, nombre: ev.target.value }))}
                      placeholder="Nombre de etiqueta"
                    />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {COLORES_DISPONIBLES.map((col, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setEditForm(f => ({ ...f, color: col.bg, text: col.text }))}
                          style={{
                            width: 20, height: 20, borderRadius: 99, background: col.bg,
                            border: editForm.color === col.bg ? `2px solid ${col.text}` : '2px solid transparent',
                            cursor: 'pointer',
                          }}
                          title={col.label}
                        />
                      ))}
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleGuardarEdit}>✓</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditandoId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 18 }}>{e.emoji || '🏷️'}</span>
                    <span style={{
                      flex: 1, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                      background: e.color, color: e.text, display: 'inline-block',
                    }}>
                      {e.nombre}
                    </span>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEditar(e)}>✏️</button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: 'hsl(var(--danger))' }}
                      onClick={() => store.deleteEtiquetaPedido(e.id)}
                    >🗑️</button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="divider" />

          {/* Crear nueva etiqueta */}
          <div style={{ fontWeight: 600, fontSize: 13, color: 'hsl(var(--muted))', margin: '16px 0 12px' }}>
            + NUEVA ETIQUETA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', background: 'hsl(var(--bg))', borderRadius: 10, border: '1px dashed hsl(var(--border))' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select
                value={nueva.emoji}
                onChange={ev => setNueva(f => ({ ...f, emoji: ev.target.value }))}
                style={{ fontSize: 20, border: 'none', background: 'transparent', cursor: 'pointer', width: 44 }}
              >
                {EMOJIS_DISPONIBLES.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={nueva.nombre}
                onChange={ev => setNueva(f => ({ ...f, nombre: ev.target.value }))}
                placeholder="Nombre de la etiqueta (ej. Urgente, VIP...)"
                onKeyDown={ev => ev.key === 'Enter' && handleAgregar()}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>Color:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORES_DISPONIBLES.map((col, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNueva(f => ({ ...f, color: col.bg, text: col.text }))}
                    style={{
                      width: 22, height: 22, borderRadius: 99, background: col.bg,
                      border: nueva.color === col.bg ? `2px solid ${col.text}` : '2px solid transparent',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                    title={col.label}
                  />
                ))}
              </div>
              {/* Preview */}
              {nueva.nombre && (
                <span style={{
                  padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                  background: nueva.color, color: nueva.text,
                }}>
                  {nueva.emoji} {nueva.nombre}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={handleAgregar}
              disabled={!nueva.nombre.trim()}
            >
              + Agregar etiqueta
            </button>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn type-primary" style={{ background: 'hsl(var(--primary))', color: '#fff', padding: '9px 16px', borderRadius: 'var(--radius-sm)' }} onClick={onClose}>✓ Listo</button>
        </div>
      </div>
    </div>
  );
};
const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getWeekRange = () => {
  const now = new Date();
  const currentDay = now.getDay();
  // Ajuste para que la semana empiece en Lunes (1) y termine en Domingo (0 -> +6)
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmtDate(monday), end: fmtDate(sunday) };
};

export const PedidosPage = () => {
  const { pedidos, productos: catalogo, config, canalesVenta, etiquetasPedidos, negocioConfig } = useStore();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCanal, setFiltroCanal] = useState('todos');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todas');
  const [filtroFechaEntrega, setFiltroFechaEntrega] = useState('todos'); // 'todos' | 'hoy' | 'manana' | 'esta_semana' | 'vencidos' | 'personalizado'
  const [fechaEntregaFiltroVal, setFechaEntregaFiltroVal] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'kanban'
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [finanzasDialog, setFinanzasDialog] = useState(null);
  const [finanzasCostoProd, setFinanzasCostoProd] = useState('');
  const [finanzasMetodo, setFinanzasMetodo] = useState('efectivo');
  const [finanzasMontoEfectivo, setFinanzasMontoEfectivo] = useState('');
  const [finanzasMontoTarjeta, setFinanzasMontoTarjeta] = useState('');
  const [finanzasMontoIngreso, setFinanzasMontoIngreso] = useState('');
  // Dialog para registrar anticipo al crear pedido
  const [anticipoDialog, setAnticipóDialog] = useState(null);
  const [anticipoMetodo, setAnticipóMetodo] = useState('efectivo');
  const [anticipoMontoEfectivo, setAnticipóMontoEfectivo] = useState('');
  const [anticipoMontoTarjeta, setAnticipóMontoTarjeta] = useState('');

  const sortedPedidos = [...pedidos].sort((a, b) => {
    if (a.fecha !== b.fecha) {
      return b.fecha.localeCompare(a.fecha);
    }
    return pedidos.indexOf(b) - pedidos.indexOf(a);
  });

  const filtered = sortedPedidos.filter(p => {
    const matchSearch = p.cliente.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const matchCanal = filtroCanal === 'todos' || p.canal === filtroCanal;
    const matchEtiqueta = filtroEtiqueta === 'todas' || (p.etiquetas || []).includes(filtroEtiqueta);
    
    let matchFechaEntrega = true;
    if (filtroFechaEntrega !== 'todos') {
      const todayStr = getLocalDateString(0);
      if (filtroFechaEntrega === 'hoy') {
        matchFechaEntrega = p.fechaEntrega === todayStr;
      } else if (filtroFechaEntrega === 'manana') {
        matchFechaEntrega = p.fechaEntrega === getLocalDateString(1);
      } else if (filtroFechaEntrega === 'esta_semana') {
        if (!p.fechaEntrega) {
          matchFechaEntrega = false;
        } else {
          const { start, end } = getWeekRange();
          matchFechaEntrega = p.fechaEntrega >= start && p.fechaEntrega <= end;
        }
      } else if (filtroFechaEntrega === 'vencidos') {
        matchFechaEntrega = p.fechaEntrega && p.fechaEntrega < todayStr && p.estado !== 'completado' && p.estado !== 'cancelado';
      } else if (filtroFechaEntrega === 'personalizado') {
        matchFechaEntrega = p.fechaEntrega === fechaEntregaFiltroVal;
      }
    }
    
    return matchSearch && matchEstado && matchCanal && matchEtiqueta && matchFechaEntrega;
  });

  const subtotal = form.productos.reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0);
  const total = subtotal + Number(form.ajuste || 0);
  const saldo = total - Number(form.anticipo || 0);

  const openCreate = () => {
    const defaultCanal = (canalesVenta && canalesVenta[0]?.id) || 'canal-1';
    setForm({ ...emptyForm(), canal: defaultCanal, ajuste: 0 });
    setEditId(null);
    setModal('create');
  };

  const openEdit = (p) => {
    const defaultCanal = (canalesVenta && canalesVenta[0]?.id) || 'canal-1';
    const sub = (p.productos || []).reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0);
    const ajuste = p.ajuste !== undefined ? Number(p.ajuste) : ((p.total || sub) - sub);
    setForm({ canal: defaultCanal, ...p, ajuste });
    setEditId(p.id);
    setModal('edit');
  };

  const openView = (p) => {
    const defaultCanal = (canalesVenta && canalesVenta[0]?.id) || 'canal-1';
    const sub = (p.productos || []).reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0);
    const ajuste = p.ajuste !== undefined ? Number(p.ajuste) : ((p.total || sub) - sub);
    setForm({ canal: defaultCanal, ...p, ajuste });
    setEditId(p.id);
    setModal('view');
  };

  // ── Helper: esperar que todas las imágenes del elemento carguen ──────────
  const waitForImages = (el) => {
    const imgs = Array.from(el.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();
    return Promise.all(imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(res => { img.onload = res; img.onerror = res; })
    ));
  };

  // ── Helper: preparar elemento para captura ──────────────────────────────
  const prepareCapture = async (element) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;overflow:visible;background:#fff;z-index:-1;';
    const clone = element.cloneNode(true);
    clone.style.cssText = 'width:794px;margin:0;padding:40px;box-sizing:border-box;border:none;box-shadow:none;min-height:1123px;';
    container.appendChild(clone);
    document.body.appendChild(container);
    await waitForImages(clone);
    return { container, clone };
  };

  const handleDownloadRecibo = async () => {
    const element = document.getElementById('printable-recibo-doc');
    if (!element) return;
    let container;
    try {
      const result = await prepareCapture(element);
      container = result.container;
      const clone = result.clone;
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        height: clone.scrollHeight,
        windowHeight: clone.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = 794;
      const imgHeight = clone.scrollHeight;
      const ratio = pdfWidth / imgWidth;
      const scaledHeight = imgHeight * ratio;

      let heightLeft = scaledHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 1) {
        position = heightLeft - scaledHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`Recibo_Pago_${editId || 'documento'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Hubo un error al generar el Recibo de Pago.');
    } finally {
      if (container && document.body.contains(container)) document.body.removeChild(container);
    }
  };

  const handleDownloadReciboImage = async () => {
    const element = document.getElementById('printable-recibo-doc');
    if (!element) return;
    let container;
    try {
      const result = await prepareCapture(element);
      container = result.container;
      const clone = result.clone;
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        height: clone.scrollHeight,
        windowHeight: clone.scrollHeight,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Recibo_Pago_${editId || 'documento'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Hubo un error al descargar la imagen.');
    } finally {
      if (container && document.body.contains(container)) document.body.removeChild(container);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const data = { ...form, total };
    if (editId) {
      const previousPedido = pedidos.find(p => p.id === editId);
      store.updatePedido(editId, data);
      setModal(null);
      
      // Si el estado cambió a completado y antes no lo estaba, disparar el flujo de liquidación
      if (data.estado === 'completado' && previousPedido && previousPedido.estado !== 'completado') {
        const costoProdCalculado = (data.productos || []).reduce((acc, linea) => {
          const prod = catalogo.find(c => c.nombre === linea.nombre);
          if (prod && prod.costoProd) {
            return acc + (Number(prod.costoProd) * Number(linea.cantidad || 1));
          }
          return acc;
        }, 0);
        setFinanzasCostoProd(costoProdCalculado > 0 ? String(costoProdCalculado) : '');
        const anticipo = Number(data.anticipo || 0);
        const totalPed = Number(total || 0);
        const saldoRestante = totalPed - anticipo;
        setFinanzasMontoIngreso(saldoRestante > 0 ? String(saldoRestante) : '0');
        setFinanzasDialog({ ...data, id: editId });
      }
    } else {
      const newPedido = store.addPedidoReturn(data);
      setModal(null);
      // Si se crea ya completado, abrir diálogo de liquidación
      if (data.estado === 'completado' && newPedido) {
        const costoProdCalculado = (data.productos || []).reduce((acc, linea) => {
          const prod = catalogo.find(c => c.nombre === linea.nombre);
          if (prod && prod.costoProd) {
            return acc + (Number(prod.costoProd) * Number(linea.cantidad || 1));
          }
          return acc;
        }, 0);
        setFinanzasCostoProd(costoProdCalculado > 0 ? String(costoProdCalculado) : '');
        const anticipo = Number(data.anticipo || 0);
        const totalPed = Number(total || 0);
        const saldoRestante = totalPed - anticipo;
        setFinanzasMontoIngreso(saldoRestante > 0 ? String(saldoRestante) : '0');
        setFinanzasDialog(newPedido);
      } else if (Number(data.anticipo || 0) > 0 && newPedido) {
        setAnticipóDialog(newPedido);
        setAnticipóMetodo('efectivo');
        setAnticipóMontoEfectivo('');
        setAnticipóMontoTarjeta('');
      }
    }
  };

  const handleDelete = (id) => {
    setConfirm({ id });
  };

  const confirmDelete = () => {
    store.deletePedido(confirm.id);
    setConfirm(null);
    if (modal) setModal(null);
  };

  const updateEstado = (id, nuevoEstado) => {
    const pedido = pedidos.find(p => p.id === id);
    const anteriorEstado = pedido ? pedido.estado : '';
    store.updatePedido(id, { estado: nuevoEstado });
    if (nuevoEstado === 'completado' && pedido && anteriorEstado !== 'completado') {
      const costoProdCalculado = (pedido.productos || []).reduce((acc, linea) => {
        const prod = catalogo.find(c => c.nombre === linea.nombre);
        if (prod && prod.costoProd) {
          return acc + (Number(prod.costoProd) * Number(linea.cantidad || 1));
        }
        return acc;
      }, 0);
      setFinanzasCostoProd(costoProdCalculado > 0 ? String(costoProdCalculado) : '');
      const anticipo = Number(pedido.anticipo || 0);
      const totalPed = Number(pedido.total || 0);
      const saldoRestante = totalPed - anticipo;
      setFinanzasMontoIngreso(saldoRestante > 0 ? String(saldoRestante) : '0');
      setFinanzasDialog(pedido);
    }
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📦 Pedidos</h2>
          <p className="page-subtitle">{pedidos.length} pedidos registrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'hsl(var(--bg))', borderRadius: 10, padding: 3, border: '1px solid hsl(var(--border))' }}>
            <button
              onClick={() => setViewMode('lista')}
              className={`btn btn-sm ${viewMode === 'lista' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8 }}
              title="Vista de lista"
            >
              ☰ Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8 }}
              title="Vista Kanban"
            >
              ▦ Kanban
            </button>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + Nuevo pedido
          </button>
        </div>
      </div>

      {/* Contenedor de filtros rediseñado y compacto */}
      <div className="filters-bar" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', marginBottom: 16 }}>
        {/* Barra principal siempre visible */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}>
            {/* Buscador */}
            <div className="search-box" style={{ margin: 0, flex: '1 1 240px', minWidth: 180 }}>
              <span>🔍</span>
              <input
                placeholder="Buscar por cliente o ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            {/* Selector de entrega */}
            <div className="filter-select-wrapper" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 6, 
              background: 'hsl(var(--bg))', 
              padding: '6px 12px', 
              borderRadius: 10, 
              border: '1px solid hsl(var(--border))',
              height: 38,
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', gap: 4 }}>
                📅 Entrega:
              </span>
              <select
                value={filtroFechaEntrega}
                onChange={e => setFiltroFechaEntrega(e.target.value)}
                style={{ 
                  border: 'none', 
                  background: 'transparent', 
                  fontSize: 13, 
                  fontWeight: 500, 
                  outline: 'none', 
                  cursor: 'pointer', 
                  color: 'hsl(var(--foreground))',
                  paddingRight: 10
                }}
              >
                <option value="todos">Cualquier fecha</option>
                <option value="hoy">Hoy</option>
                <option value="manana">Mañana</option>
                <option value="esta_semana">Esta semana</option>
                <option value="vencidos">⚠️ Vencidos / Atrasados</option>
                <option value="personalizado">📅 Fecha específica...</option>
              </select>
            </div>

            {/* Calendario condicional para fecha específica */}
            {filtroFechaEntrega === 'personalizado' && (
              <input
                type="date"
                className="form-input"
                style={{ 
                  width: 'auto', 
                  padding: '4px 10px', 
                  height: 38, 
                  fontSize: 13, 
                  borderRadius: 10,
                  boxSizing: 'border-box'
                }}
                value={fechaEntregaFiltroVal}
                onChange={e => setFechaEntregaFiltroVal(e.target.value)}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Botón Filtros Avanzados */}
            <button
              type="button"
              className={`btn btn-sm ${showAdvanced ? 'btn-primary' : 'btn-secondary'}`}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                borderRadius: 10, 
                padding: '0 16px', 
                height: 38, 
                fontSize: 13 
              }}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span>🎛️</span>
              <span>Filtros Avanzados</span>
              {((filtroEstado !== 'todos' ? 1 : 0) + (filtroCanal !== 'todos' ? 1 : 0) + (filtroEtiqueta !== 'todas' ? 1 : 0)) > 0 && (
                <span style={{
                  background: showAdvanced ? 'white' : 'hsl(var(--primary))',
                  color: showAdvanced ? 'hsl(var(--primary))' : 'white',
                  borderRadius: 99,
                  padding: '1px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  marginLeft: 4
                }}>
                  {(filtroEstado !== 'todos' ? 1 : 0) + (filtroCanal !== 'todos' ? 1 : 0) + (filtroEtiqueta !== 'todas' ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Limpiar filtros */}
            {(search.trim() !== '' || filtroEstado !== 'todos' || filtroCanal !== 'todos' || filtroEtiqueta !== 'todas' || filtroFechaEntrega !== 'todos') && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ 
                  color: 'hsl(var(--danger))', 
                  fontSize: 13, 
                  padding: '0 12px', 
                  height: 38, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4 
                }}
                onClick={() => {
                  setSearch('');
                  setFiltroEstado('todos');
                  setFiltroCanal('todos');
                  setFiltroEtiqueta('todas');
                  setFiltroFechaEntrega('todos');
                  setFechaEntregaFiltroVal('');
                }}
                title="Limpiar todos los filtros"
              >
                <span>🧹</span>
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumen de Filtros Activos (si el panel avanzado está cerrado) */}
        {!showAdvanced && (
          (() => {
            const activeChips = [];
            if (filtroEstado !== 'todos') {
              activeChips.push({
                label: `Estado: ${filtroEstado.replace('_', ' ')}`,
                icon: '🚥',
                onClear: () => setFiltroEstado('todos')
              });
            }
            if (filtroCanal !== 'todos') {
              const cObj = (canalesVenta || []).find(c => c.id === filtroCanal);
              activeChips.push({
                label: `Origen: ${cObj ? `${cObj.emoji || ''} ${cObj.nombre}` : filtroCanal}`,
                icon: '🌐',
                onClear: () => setFiltroCanal('todos'),
                color: cObj?.color,
                text: cObj?.text
              });
            }
            if (filtroEtiqueta !== 'todas') {
              const eObj = (etiquetasPedidos || []).find(e => e.id === filtroEtiqueta);
              activeChips.push({
                label: `Etiqueta: ${eObj ? `${eObj.emoji || ''} ${eObj.nombre}` : filtroEtiqueta}`,
                icon: '🏷️',
                onClear: () => setFiltroEtiqueta('todas'),
                color: eObj?.color,
                text: eObj?.text
              });
            }

            if (activeChips.length === 0) return null;

            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--muted))' }}>Filtros activos:</span>
                {activeChips.map((chip, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 10px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 600,
                      background: chip.color || 'hsl(var(--primary-light))',
                      color: chip.text || 'hsl(var(--primary-dark))',
                      border: chip.color ? 'none' : '1px solid hsl(var(--border))'
                    }}
                  >
                    <span>{chip.icon} {chip.label}</span>
                    <button
                      type="button"
                      style={{ 
                        border: 'none', 
                        background: 'transparent', 
                        cursor: 'pointer', 
                        fontSize: 12, 
                        padding: '0 2px', 
                        color: 'inherit',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      onClick={chip.onClear}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            );
          })()
        )}

        {/* Panel Avanzado Colapsable */}
        {showAdvanced && (
          <div style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
            padding: '16px',
            marginTop: '4px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            animation: 'fadeIn 0.2s ease'
          }}>
            {/* Estado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted))' }}>🚥 ESTADO DEL PEDIDO:</span>
              <div className="quote-tabs-container" style={{ margin: 0 }}>
                <div className="quote-tabs">
                  {['todos', ...ESTADOS].map(e => (
                    <button
                      key={e}
                      type="button"
                      className={`tab ${filtroEstado === e ? 'active' : ''}`}
                      onClick={() => setFiltroEstado(e)}
                    >
                      {e === 'todos' ? 'Todos' : e.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Origen */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted))' }}>🌐 ORIGEN / CANAL DE VENTA:</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: '2px 8px', color: 'hsl(var(--primary))', height: 'auto', width: 'auto' }}
                  onClick={() => setModal('canales')}
                >
                  ⚙️ Gestionar canales
                </button>
              </div>
              <div className="quote-tabs-container" style={{ margin: 0 }}>
                <div className="quote-tabs">
                  <button
                    type="button"
                    className={`tab ${filtroCanal === 'todos' ? 'active' : ''}`}
                    onClick={() => setFiltroCanal('todos')}
                  >
                    Todos
                  </button>
                  {(canalesVenta || []).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`tab ${filtroCanal === c.id ? 'active' : ''}`}
                      onClick={() => setFiltroCanal(c.id)}
                    >
                      {c.emoji || '🌐'} {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Etiquetas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--muted))' }}>🏷️ ETIQUETAS:</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11, padding: '2px 8px', color: 'hsl(var(--primary))', height: 'auto', width: 'auto' }}
                  onClick={() => setModal('etiquetas')}
                >
                  ⚙️ Gestionar etiquetas
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${filtroEtiqueta === 'todas' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11, padding: '4px 12px', borderRadius: 99 }}
                  onClick={() => setFiltroEtiqueta('todas')}
                >Todas</button>
                {(etiquetasPedidos || []).map(e => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setFiltroEtiqueta(filtroEtiqueta === e.id ? 'todas' : e.id)}
                    style={{
                      padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', border: '1.5px solid',
                      background: filtroEtiqueta === e.id ? e.color : 'transparent',
                      color: filtroEtiqueta === e.id ? e.text : 'hsl(var(--muted))',
                      borderColor: filtroEtiqueta === e.id ? e.text : 'hsl(var(--border))',
                      transition: 'all 0.15s',
                    }}
                  >
                    {e.emoji || '🏷️'} {e.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <KanbanPedidos
          pedidos={filtered}
          canalesVenta={canalesVenta}
          etiquetasPedidos={etiquetasPedidos}
          onView={openView}
          onEdit={openEdit}
          onUpdateEstado={updateEstado}
        />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>Sin pedidos</h3>
          <p>No se encontraron pedidos con los filtros actuales.</p>
          <button className="btn btn-primary" onClick={openCreate}>Crear primer pedido</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Entrega</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Saldo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const rowStyle = ROW_COLORS[p.estado] || {};
                return (
                  <tr key={p.id} style={rowStyle}>
                    <td><span style={{ fontWeight: 700, color: 'hsl(var(--primary))' }}>{p.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.cliente}</div>
                      {p.telefono && <div style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>{p.telefono}</div>}
                      
                      {/* Etiquetas del pedido en fila */}
                      {(p.etiquetas || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                          {p.etiquetas.map(id => {
                            const e = (etiquetasPedidos || []).find(x => x.id === id || x.nombre === id);
                            return e ? (
                              <span key={id} style={{
                                padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                                background: e.color, color: e.text, display: 'inline-flex', alignItems: 'center', gap: 3
                              }}>
                                {e.emoji || '🏷️'} {e.nombre}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>{p.fecha}</td>
                    <td style={{ fontSize: 13 }}>{p.fechaEntrega || '—'}</td>
                    <td>
                      <CanalBadge canalId={p.canal} canalesVenta={canalesVenta} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusBadge status={p.estado} />
                        <select
                          className="form-select"
                          style={{ padding: '2px 24px 2px 6px', fontSize: 11, width: 'auto', opacity: 0.7 }}
                          value={p.estado}
                          onChange={e => updateEstado(p.id, e.target.value)}
                          title="Cambiar estado"
                        >
                          {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                        </select>
                      </div>
                    </td>
                    <td><strong>{fmt(p.total)}</strong></td>
                    <td style={{ color: (p.total - p.anticipo) > 0 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>
                      {fmt(p.total - p.anticipo)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openView(p)} title="Ver">👁️</button>
                        <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(p)} title="Editar">✏️</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p.id)} title="Eliminar" style={{ color: 'hsl(var(--danger))' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal create/edit */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nuevo pedido' : '✏️ Editar pedido'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      Cliente *
                      <FieldHelp text="Nombre completo de la persona o empresa que hace el pedido." example="María González" />
                    </label>
                    <input className="form-input" required value={form.cliente} onChange={e => set('cliente', e.target.value)} placeholder="Nombre del cliente" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Teléfono
                      <FieldHelp text="Número de WhatsApp o teléfono para contactar al cliente sobre su pedido." example="555-123-4567" />
                    </label>
                    <input className="form-input" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="555-000-0000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Email
                      <FieldHelp text="Correo electrónico del cliente, para enviarle confirmaciones o comprobantes." example="cliente@email.com" />
                    </label>
                    <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Estado
                      <FieldHelp text="Estado actual del pedido: Pendiente (nuevo), En proceso (trabajando), Listo (terminado, por entregar), Completado (entregado y pagado), Cancelado." />
                    </label>
                    <select className="form-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                      {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Fecha del pedido
                      <FieldHelp text="Día en que el cliente realizó o confirmó el pedido." />
                    </label>
                    <input className="form-input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Fecha de entrega
                      <FieldHelp text="Día acordado para entregar el pedido al cliente. Se muestra en la tabla principal." />
                    </label>
                    <input className="form-input" type="date" value={form.fechaEntrega} onChange={e => set('fechaEntrega', e.target.value)} />
                    <span className="field-hint">Deja vacío si aún no tiene fecha confirmada</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Origen / Canal de Venta
                      <FieldHelp text="¿Cómo llegó este cliente a ti? (WhatsApp, Instagram, recomendado, etc.) Útil para saber qué canales generan más ventas." />
                    </label>
                    <select className="form-select" value={form.canal || ''} onChange={e => set('canal', e.target.value)}>
                      {(canalesVenta || []).map(c => (
                        <option key={c.id} value={c.id}>{c.emoji || '🌐'} {c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Etiquetas de color */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>🏷️ Etiquetas del pedido</label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '2px 8px', color: 'hsl(var(--primary))', height: 'auto', width: 'auto', borderRadius: 4 }}
                      onClick={() => setModal('etiquetas')}
                    >
                      ⚙️ Gestionar etiquetas
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {(etiquetasPedidos || []).map(e => {
                      const active = (form.etiquetas || []).includes(e.id);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            const curr = form.etiquetas || [];
                            set('etiquetas', active ? curr.filter(x => x !== e.id) : [...curr, e.id]);
                          }}
                          style={{
                            padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', border: '1.5px solid',
                            background: active ? e.color : 'transparent',
                            color: active ? e.text : 'hsl(var(--muted))',
                            borderColor: active ? e.text : 'hsl(var(--border))',
                            transition: 'all 0.15s',
                            transform: active ? 'scale(1.05)' : 'none',
                          }}
                        >
                          {e.emoji || '🏷️'} {e.nombre}
                        </button>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 4, display: 'block' }}>Selecciona las que apliquen</span>
                </div>

                <div className="divider" />

                <div className="divider" />

                <div className="form-group">
                  <label className="form-label">Productos / Servicios</label>
                  <ProductLinesInput
                    lines={form.productos}
                    onChange={lines => set('productos', lines)}
                    productos={catalogo}
                  />
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">
                      Otros cargos / IVA / Ajuste ($)
                      <FieldHelp text="Agrega aquí cargos extras como envío, IVA, descuentos (valor negativo), o cualquier ajuste al total." example="+50 para envío, -100 para descuento" position="top" />
                    </label>
                    <input className="form-input" type="number" step="0.01" value={form.ajuste || 0} onChange={e => set('ajuste', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Anticipo recibido
                      <FieldHelp text="Dinero que ya pagó el cliente. Se descuenta del total para calcular el saldo que falta por cobrar." example="Si el total es $500 y pagó $200, el saldo será $300" />
                    </label>
                    <input className="form-input" type="number" min="0" step="0.01" value={form.anticipo} onChange={e => set('anticipo', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Saldo restante
                      <FieldHelp text="Lo que aún falta por cobrar. Se calcula automáticamente: Total − Anticipo." />
                    </label>
                    <input className="form-input" value={fmt(saldo)} disabled style={{ background: 'hsl(var(--bg))' }} />
                    <span className="field-hint">Calculado automáticamente</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Notas
                    <FieldHelp text="Especificaciones especiales del pedido, detalles de diseño, tallas, colores, instrucciones, etc." example="Camiseta talla M, color azul marino. Imprimir logo lado derecho." />
                  </label>
                  <textarea className="form-textarea" value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, especificaciones..." />
                </div>

                {/* ── Comprobantes de pago (solo en edición) ── */}
                {editId && (
                  <>
                    <div className="divider" />
                    <ComprobantesSection
                      comprobantes={pedidos.find(p => p.id === editId)?.comprobantes || []}
                      totalPedido={total}
                      onAgregar={(comp) => store.addComprobantePedido(editId, comp)}
                      onEliminar={(cId) => store.deleteComprobantePedido(editId, cId)}
                    />
                  </>
                )}
              </div>

              <div className="modal-footer">
                {editId && (
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(editId)} style={{ marginRight: 'auto' }}>
                    🗑️ Eliminar
                  </button>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {modal === 'create' ? '✓ Crear pedido' : '✓ Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal view */}
      {modal === 'view' && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2>📦 Pedido {editId}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div><span className="text-muted">Cliente:</span><div className="font-bold">{form.cliente}</div></div>
                <div><span className="text-muted">Teléfono:</span><div>{form.telefono || '—'}</div></div>
                <div><span className="text-muted">Email:</span><div>{form.email || '—'}</div></div>
                <div><span className="text-muted">Estado:</span><div><StatusBadge status={form.estado} /></div></div>
                <div><span className="text-muted">Fecha:</span><div>{form.fecha}</div></div>
                <div><span className="text-muted">Entrega:</span><div>{form.fechaEntrega || '—'}</div></div>
                <div><span className="text-muted">Origen del pedido:</span><div style={{ marginTop: 4 }}><CanalBadge canalId={form.canal} canalesVenta={canalesVenta} /></div></div>
              </div>
              {/* Etiquetas en view */}
              {(form.etiquetas || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0' }}>
                  {(form.etiquetas || []).map(id => {
                    const e = (etiquetasPedidos || []).find(x => x.id === id || x.nombre === id);
                    return e ? (
                      <span key={id} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: e.color, color: e.text }}>
                        {e.emoji || '🏷️'} {e.nombre}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              <div className="divider" />
              <div className="form-label" style={{ marginBottom: 10 }}>Productos</div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unit.</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {form.productos.map((line, i) => (
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
                <span className="text-muted">Subtotal:</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {Number(form.ajuste || 0) !== 0 && (
                <div className="order-total-row">
                  <span className="text-muted">Otros cargos / IVA / Ajuste:</span>
                  <span style={{ fontWeight: 600 }}>{fmt(form.ajuste)}</span>
                </div>
              )}
              <div className="order-total-row">
                <span className="text-muted">Total:</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'hsl(var(--primary))' }}>{fmt(total)}</span>
              </div>
              <div className="order-total-row">
                <span className="text-muted">Anticipo:</span>
                <span style={{ color: 'hsl(var(--success))' }}>{fmt(form.anticipo)}</span>
              </div>
              <div className="order-total-row">
                <span className="text-muted">Saldo restante:</span>
                <span style={{ fontWeight: 700, color: saldo > 0 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }}>{fmt(saldo)}</span>
              </div>
              {form.notas && (
                <>
                  <div className="divider" />
                  <div><span className="text-muted">Notas:</span><p style={{ marginTop: 4 }}>{form.notas}</p></div>
                </>
              )}

              {/* ── Comprobantes de pago ── */}
              <div className="divider" />
              <ComprobantesSection
                comprobantes={pedidos.find(p => p.id === editId)?.comprobantes || []}
                totalPedido={total}
                onAgregar={(comp) => store.addComprobantePedido(editId, comp)}
                onEliminar={(cId) => store.deleteComprobantePedido(editId, cId)}
              />
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
              <button className="btn btn-primary" onClick={() => openEdit({ ...form, id: editId })} style={{ marginRight: 'auto' }}>✏️ Editar</button>
              <button className="btn btn-secondary" onClick={handleDownloadReciboImage}>🖼️ Guardar Recibo Imagen</button>
              <button className="btn btn-secondary" onClick={handleDownloadRecibo}>📥 Descargar Recibo PDF</button>
            </div>
          </div>
        </div>
      )}


      {/* Confirm delete */}
      {confirm && (
        <ConfirmDialog
          title="¿Eliminar pedido?"
          message="Esta acción no se puede deshacer."
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Modal canales */}
      {modal === 'canales' && (
        <ModalCanales
          canalesVenta={canalesVenta}
          onClose={() => setModal(null)}
        />
      )}

      {/* Diálogo: registrar en Finanzas al completar */}
      {finanzasDialog && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>🎉 ¡Pedido completado!</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setFinanzasDialog(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 10 }}>🎉</div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, textAlign: 'center' }}>
                Pedido <strong>{finanzasDialog.id}</strong> — {finanzasDialog.cliente}
              </p>

              <div style={{
                background: 'hsl(var(--bg))', borderRadius: 10, padding: '14px 16px',
                marginBottom: 16, border: '1px solid hsl(var(--border))',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>💰 Total del pedido</span>
                  <strong>${Number(finanzasDialog.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                {Number(finanzasDialog.anticipo || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>✅ Anticipo ya registrado</span>
                    <span style={{ color: 'hsl(var(--success))' }}>-${Number(finanzasDialog.anticipo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'hsl(var(--muted))', fontWeight: 600 }}>
                    💵 {Number(finanzasDialog.anticipo || 0) > 0 ? 'Saldo a cobrar (liquidación)' : 'Pago a registrar'}
                  </span>
                  <input
                    style={{
                      width: 110, textAlign: 'right', padding: '3px 8px',
                      border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 13,
                      background: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
                      fontWeight: 'bold',
                    }}
                    type="number" min="0" step="0.01"
                    value={finanzasMontoIngreso}
                    onChange={e => setFinanzasMontoIngreso(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>🏧 Costo de producción</span>
                  <input
                    style={{
                      width: 110, textAlign: 'right', padding: '3px 8px',
                      border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 13,
                      background: 'hsl(var(--card))', color: 'hsl(var(--foreground))',
                    }}
                    type="number" min="0" step="0.01"
                    value={finanzasCostoProd}
                    onChange={e => setFinanzasCostoProd(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {finanzasCostoProd && Number(finanzasCostoProd) > 0 && (
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted))', textAlign: 'right', marginTop: 4 }}>
                    Auto-calculado del catálogo de productos
                  </div>
                )}
                <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 10, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>✨ Ganancia de este pago</span>
                  <strong style={{ color: 'hsl(var(--primary))' }}>
                    ${Math.max(0, Number(finanzasMontoIngreso || 0) - Number(finanzasCostoProd || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--muted))', marginBottom: 8 }}>💳 Método de pago</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {METODOS_PAGO_PED.map(m => (
                    <button key={m.value} type="button"
                      onClick={() => setFinanzasMetodo(m.value)}
                      style={{
                        padding: '7px 8px', borderRadius: 8, border: '1.5px solid',
                        borderColor: finanzasMetodo === m.value ? m.color : 'hsl(var(--border))',
                        background: finanzasMetodo === m.value ? m.bg : 'transparent',
                        color: finanzasMetodo === m.value ? m.color : 'hsl(var(--muted))',
                        cursor: 'pointer', fontWeight: 600, fontSize: 11,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{m.icon}</span>{m.label}
                    </button>
                  ))}
                </div>
              </div>

              {finanzasMetodo === 'mixto' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>💵 Efectivo</label>
                    <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} type="number" min="0" step="0.01" placeholder="0.00" value={finanzasMontoEfectivo} onChange={e => setFinanzasMontoEfectivo(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>💳 Tarjeta</label>
                    <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} type="number" min="0" step="0.01" placeholder="0.00" value={finanzasMontoTarjeta} onChange={e => setFinanzasMontoTarjeta(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexDirection: 'column' }}>
                <button
                  className="btn btn-primary"
                  style={{ background: 'hsl(var(--success))', borderColor: 'hsl(var(--success))' }}
                  onClick={() => {
                    const categoria = finanzasDialog.productos?.[0]?.nombre || 'Ventas';
                    let monto = Number(finanzasMontoIngreso || 0);
                    let mEfectivo = null;
                    let mTarjeta = null;
                    if (finanzasMetodo === 'mixto') {
                      mEfectivo = Number(finanzasMontoEfectivo || 0);
                      mTarjeta = Number(finanzasMontoTarjeta || 0);
                      monto = mEfectivo + mTarjeta;
                    }
                    // Siempre crear un NUEVO registro independiente
                    store.addFinanza({
                      tipo: 'ingreso',
                      concepto: `Liquidación ${finanzasDialog.id} - ${finanzasDialog.cliente}`,
                      monto,
                      montoEfectivo: mEfectivo,
                      montoTarjeta: mTarjeta,
                      costoProd: finanzasCostoProd !== '' ? Number(finanzasCostoProd) : null,
                      fecha: new Date().toISOString().split('T')[0],
                      categoria,
                      metodoPago: finanzasMetodo,
                    });

                    // Actualizar el pedido en el store agregando el pago a su anticipo para liquidar el saldo
                    const actualPedido = store.getState().pedidos.find(p => p.id === finanzasDialog.id);
                    if (actualPedido) {
                      const prevAnticipo = Number(actualPedido.anticipo || 0);
                      const newAnticipo = prevAnticipo + monto;
                      store.updatePedido(actualPedido.id, { anticipo: newAnticipo });
                    }

                    setFinanzasDialog(null);
                    setFinanzasCostoProd('');
                    setFinanzasMontoIngreso('');
                    setFinanzasMetodo('efectivo');
                    setFinanzasMontoEfectivo('');
                    setFinanzasMontoTarjeta('');
                  }}
                >
                  ✅ Registrar liquidación en Finanzas
                </button>
                <button className="btn btn-ghost" onClick={() => {
                  setFinanzasDialog(null);
                  setFinanzasCostoProd('');
                  setFinanzasMetodo('efectivo');
                  setFinanzasMontoEfectivo('');
                  setFinanzasMontoTarjeta('');
                }}>
                  Omitir por ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo: registrar anticipo al crear pedido */}
      {anticipoDialog && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>💵 Registrar anticipo</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setAnticipóDialog(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 10 }}>💵</div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, textAlign: 'center' }}>
                Pedido <strong>{anticipoDialog.id}</strong> — {anticipoDialog.cliente}
              </p>
              <div style={{
                background: 'hsl(var(--bg))', borderRadius: 10, padding: '14px 16px',
                marginBottom: 16, border: '1px solid hsl(var(--border))',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>💰 Total del pedido</span>
                  <strong>${Number(anticipoDialog.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'hsl(var(--muted))', fontWeight: 700 }}>💵 Anticipo a registrar</span>
                  <strong style={{ color: 'hsl(var(--success))' }}>${Number(anticipoDialog.anticipo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid hsl(var(--border))', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>📋 Saldo pendiente</span>
                  <span style={{ fontWeight: 700, color: 'hsl(var(--warning))' }}>
                    ${(Number(anticipoDialog.total || 0) - Number(anticipoDialog.anticipo || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--muted))', marginBottom: 8 }}>💳 Método de pago del anticipo</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {METODOS_PAGO_PED.map(m => (
                    <button key={m.value} type="button"
                      onClick={() => setAnticipóMetodo(m.value)}
                      style={{
                        padding: '7px 8px', borderRadius: 8, border: '1.5px solid',
                        borderColor: anticipoMetodo === m.value ? m.color : 'hsl(var(--border))',
                        background: anticipoMetodo === m.value ? m.bg : 'transparent',
                        color: anticipoMetodo === m.value ? m.color : 'hsl(var(--muted))',
                        cursor: 'pointer', fontWeight: 600, fontSize: 11,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{m.icon}</span>{m.label}
                    </button>
                  ))}
                </div>
              </div>

              {anticipoMetodo === 'mixto' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>💵 Efectivo</label>
                    <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} type="number" min="0" step="0.01" placeholder="0.00" value={anticipoMontoEfectivo} onChange={e => setAnticipóMontoEfectivo(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 11 }}>💳 Tarjeta</label>
                    <input className="form-input" style={{ padding: '6px 10px', fontSize: 12 }} type="number" min="0" step="0.01" placeholder="0.00" value={anticipoMontoTarjeta} onChange={e => setAnticipóMontoTarjeta(e.target.value)} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexDirection: 'column' }}>
                <button
                  className="btn btn-primary"
                  style={{ background: 'hsl(var(--success))', borderColor: 'hsl(var(--success))' }}
                  onClick={() => {
                    let monto = Number(anticipoDialog.anticipo || 0);
                    let mEfectivo = null;
                    let mTarjeta = null;
                    if (anticipoMetodo === 'mixto') {
                      mEfectivo = Number(anticipoMontoEfectivo || 0);
                      mTarjeta = Number(anticipoMontoTarjeta || 0);
                      monto = mEfectivo + mTarjeta;
                    }
                    store.addFinanza({
                      tipo: 'ingreso',
                      concepto: `Anticipo ${anticipoDialog.id} - ${anticipoDialog.cliente}`,
                      monto,
                      montoEfectivo: mEfectivo,
                      montoTarjeta: mTarjeta,
                      costoProd: null,
                      fecha: new Date().toISOString().split('T')[0],
                      categoria: 'Anticipo',
                      metodoPago: anticipoMetodo,
                    });
                    setAnticipóDialog(null);
                    setAnticipóMetodo('efectivo');
                    setAnticipóMontoEfectivo('');
                    setAnticipóMontoTarjeta('');
                  }}
                >
                  ✅ Registrar anticipo en Finanzas
                </button>
                <button className="btn btn-ghost" onClick={() => {
                  setAnticipóDialog(null);
                  setAnticipóMetodo('efectivo');
                  setAnticipóMontoEfectivo('');
                  setAnticipóMontoTarjeta('');
                }}>
                  Omitir por ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal etiquetas */}
      {modal === 'etiquetas' && (
        <ModalEtiquetasPedidos
          etiquetasPedidos={etiquetasPedidos}
          onClose={() => setModal(null)}
        />
      )}

      {/* Documentos ocultos para la captura PDF */}
      <div style={{ position: 'absolute', left: -9999, top: -9999, pointerEvents: 'none', opacity: 0 }}>
        <ReciboDocument
          formData={form}
          pedidoId={editId}
          config={config}
          canalesVenta={canalesVenta}
          negocioConfig={negocioConfig}
        />
      </div>
    </div>
  );
};

// ── Componente Imprimible: Recibo de Pago ─────────────────────────────────────
const ReciboDocument = ({ formData, pedidoId, config, canalesVenta, negocioConfig }) => {
  const negocioNombre = config.negocio || 'Mi Negocio';
  const negocioInicial = (config.propietario || negocioNombre || 'U')[0].toUpperCase();
  const subtotal = (formData.productos || []).reduce((s, l) => s + Number(l.cantidad) * Number(l.precio), 0);
  const total = subtotal + Number(formData.ajuste || 0);
  const anticipo = Number(formData.anticipo || 0);
  const saldo = total - anticipo;

  return (
    <div className="qd-doc" id="printable-recibo-doc">
      {/* ── HEADER ── */}
      <div className="qd-header">
        {/* Left: Logo + Company */}
        <div className="qd-header-left">
          <div className="qd-logo-block">
            {config.profilePhoto ? (
              <img src={config.profilePhoto} alt="Logo" className="qd-logo-img" />
            ) : (
              <div className="qd-logo-placeholder">{negocioInicial}</div>
            )}
            <div className="qd-company-info">
              <div className="qd-company-name">{negocioNombre}</div>
              {config.telefono && <div className="qd-company-detail">📞 {config.telefono}</div>}
              {config.email && <div className="qd-company-detail">✉️ {config.email}</div>}
            </div>
          </div>
        </div>

        {/* Right: RECIBO title + meta */}
        <div className="qd-header-right">
          <div className="qd-invoice-title">RECIBO DE PAGO</div>
          <div className="qd-meta-grid">
            <span className="qd-meta-label">Pedido No.:</span>
            <span className="qd-meta-value">{pedidoId}</span>
            <span className="qd-meta-label">Fecha Emisión:</span>
            <span className="qd-meta-value">{new Date().toISOString().split('T')[0]}</span>
            <span className="qd-meta-label">Fecha Pedido:</span>
            <span className="qd-meta-value">{formData.fecha}</span>
            {formData.canal && (() => {
              const canalObj = (canalesVenta || []).find(c => c.id === formData.canal || c.nombre === formData.canal);
              return canalObj ? (
                <>
                  <span className="qd-meta-label">Origen:</span>
                  <span className="qd-meta-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {canalObj.emoji || '🌐'} {canalObj.nombre}
                  </span>
                </>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      {/* ── DIVIDER ACCENT ── */}
      <div className="qd-accent-bar" />

      {/* ── CLIENT + PAYMENT INFO ── */}
      <div className="qd-info-row">
        {/* Client Info */}
        <div className="qd-info-block">
          <div className="qd-info-label">RECIBIDO DE:</div>
          <div className="qd-client-name">{formData.cliente || '—'}</div>
          {formData.telefono && <div className="qd-client-detail">📞 {formData.telefono}</div>}
          {formData.email && <div className="qd-client-detail">✉️ {formData.email}</div>}
        </div>

        {/* Payment Detail Info */}
        <div className="qd-info-block">
          <div className="qd-info-label">DETALLES DEL PAGO:</div>
          <div className="qd-client-detail">
            <div><strong>Método de pago:</strong> {formData.metodoPago ? formData.metodoPago.toUpperCase() : 'EFECTIVO'}</div>
            {anticipo > 0 && <div style={{ marginTop: 2 }}><strong>Anticipo registrado:</strong> {fmt(anticipo)}</div>}
            {saldo <= 0 ? (
              <div style={{ color: '#16a34a', fontWeight: 'bold', marginTop: 6, fontSize: 12 }}>🎉 PEDIDO TOTALMENTE LIQUIDADO</div>
            ) : (
              <div style={{ color: '#d97706', fontWeight: 'bold', marginTop: 6, fontSize: 12 }}>⚠️ SALDO RESTANTE: {fmt(saldo)}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE ── */}
      <div className="qd-table-wrap">
        <table className="qd-table">
          <thead>
            <tr>
              <th className="qd-th qd-th-no">No.</th>
              <th className="qd-th qd-th-desc">Concepto / Producto</th>
              <th className="qd-th qd-th-price">Precio</th>
              <th className="qd-th qd-th-qty">Cant.</th>
              <th className="qd-th qd-th-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {(formData.productos || []).map((line, i) => (
              <tr key={i} className={i % 2 === 1 ? 'qd-tr-alt' : ''}>
                <td className="qd-td qd-td-no">{String(i + 1).padStart(2, '0')}</td>
                <td className="qd-td qd-td-desc">{line.nombre || '—'}</td>
                <td className="qd-td qd-td-price">{fmt(line.precio)}</td>
                <td className="qd-td qd-td-qty">{line.cantidad}</td>
                <td className="qd-td qd-td-total">{fmt(Number(line.cantidad) * Number(line.precio))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── BOTTOM: Notes + Totals ── */}
      <div className="qd-bottom-row">
        {/* Left: Notes */}
        <div className="qd-bottom-left">
          {formData.notas && (
            <div className="qd-notes-block">
              <div className="qd-terms-title">Notas:</div>
              <p className="qd-terms-text">{formData.notas}</p>
            </div>
          )}
        </div>

        {/* Right: Totals Box */}
        <div className="qd-totals-box">
          <div className="qd-total-row">
            <span>Total del Pedido:</span>
            <span>{fmt(total)}</span>
          </div>
          <div className="qd-total-row" style={{ color: '#16a34a', fontWeight: 'bold' }}>
            <span>Monto Pagado:</span>
            <span>{fmt(anticipo)}</span>
          </div>
          <div className="qd-grand-total-row">
            <span>Saldo Restante:</span>
            <span style={{ color: saldo > 0 ? '#d97706' : '#16a34a' }}>{fmt(saldo)}</span>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="qd-footer">
        <span>{config.mensajePie || '¡Gracias por su preferencia!'}</span>
      </div>
    </div>
  );
};
