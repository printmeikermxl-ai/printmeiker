import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore, store, THEMES } from '../store/useStore';
import { useAuth } from '../store/authStore';

const DEFAULT_TERMINOS_LOCALES = 'Entrega en punto acordado o recolección en taller.\nAnticipo del 50% para apartar fecha. Saldo al entregar.\nTiempo de producción: 3 a 7 días hábiles según la pieza.';
const DEFAULT_TERMINOS_NACIONALES = 'Envío por paquetería a tu cargo o cotizado aparte.\nAnticipo del 70% antes de iniciar producción.\nSaldo antes de enviar. Tiempo: 5 a 10 días hábiles.';

// ── Sidebar width options ──
const SIDEBAR_MODES = [
  { label: 'Compacto', value: 'compact', icon: '⬛', desc: 'Solo íconos' },
  { label: 'Normal',   value: 'normal',  icon: '▬',  desc: 'Íconos + texto' },
];

export const ConfiguracionPage = () => {
  const { config, themeColor, darkMode, pedidos, cotizaciones, productos, finanzas, clientes, negocioConfig } = useStore();
  const { user } = useAuth();
  const [syncing, setSyncing]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeTab, setActiveTab]   = useState('negocio');
  const [copied, setCopied]         = useState(false);
  const [configPhotoErr, setConfigPhotoErr] = useState(false);

  // Forms states
  const [formConfig, setFormConfig] = useState({ ...config });
  const [editConfig, setEditConfig] = useState(false);

  // Terminos y Condiciones state
  const [editTerminos, setEditTerminos] = useState(false);
  const [formTerminos, setFormTerminos] = useState({
    terminosLocales: negocioConfig?.terminosLocales || DEFAULT_TERMINOS_LOCALES,
    terminosNacionales: negocioConfig?.terminosNacionales || DEFAULT_TERMINOS_NACIONALES,
  });

  useEffect(() => {
    if (!editTerminos) {
      setFormTerminos({
        terminosLocales: negocioConfig?.terminosLocales || DEFAULT_TERMINOS_LOCALES,
        terminosNacionales: negocioConfig?.terminosNacionales || DEFAULT_TERMINOS_NACIONALES,
      });
    }
  }, [negocioConfig, editTerminos]);

  const handleSaveTerminos = (e) => {
    e.preventDefault();
    store.updateNegocioConfig(formTerminos);
    setEditTerminos(false);
    showSaved();
  };

  // Personalization local state (persisted to localStorage immediately)
  const [sidebarMode, setSidebarMode]   = useState(() => localStorage.getItem('sep_sidebar_mode') || 'normal');
  const [animaciones, setAnimaciones]   = useState(() => localStorage.getItem('sep_animaciones') !== 'false');
  const [compactCards, setCompactCards] = useState(() => localStorage.getItem('sep_compact_cards') === 'true');

  useEffect(() => {
    if (!editConfig) setFormConfig({ ...config });
  }, [config, editConfig]);

  // Resetear error de foto al cambiar la foto
  useEffect(() => {
    setConfigPhotoErr(false);
  }, [formConfig.profilePhoto]);

  // Apply sidebar mode — also fires custom event so App.jsx reacts immediately
  useEffect(() => {
    localStorage.setItem('sep_sidebar_mode', sidebarMode);
    window.dispatchEvent(new Event('sep_sidebar_changed'));
    if (sidebarMode === 'compact') {
      document.documentElement.classList.add('sidebar-compact');
    } else {
      document.documentElement.classList.remove('sidebar-compact');
    }
  }, [sidebarMode]);

  // Apply animations toggle
  useEffect(() => {
    localStorage.setItem('sep_animaciones', animaciones);
    if (!animaciones) {
      document.documentElement.classList.add('no-animations');
    } else {
      document.documentElement.classList.remove('no-animations');
    }
  }, [animaciones]);

  // Apply compact cards
  useEffect(() => {
    localStorage.setItem('sep_compact_cards', compactCards);
    if (compactCards) {
      document.documentElement.classList.add('compact-cards');
    } else {
      document.documentElement.classList.remove('compact-cards');
    }
  }, [compactCards]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 256;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
          else        { if (h > MAX) { w *= MAX / h; h = MAX; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setFormConfig(prev => ({ ...prev, profilePhoto: dataUrl }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    store.updateConfig(formConfig);
    setEditConfig(false);
    showSaved();
  };

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSyncFromAuth = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const meta = user.user_metadata || {};
      const nombre = meta.full_name || meta.name || meta.nombre || '';
      const email  = user.email || '';
      const avatar = meta.avatar_url || meta.picture || '';
      const updates = { _authUserId: user.id };
      if (nombre) updates.propietario = nombre;
      if (email)  updates.email       = email;
      if (avatar) updates.profilePhoto = avatar;
      const currentNegocio = store.getState().config.negocio || '';
      const looksLikeUsername = currentNegocio && !/\s/.test(currentNegocio) && currentNegocio === currentNegocio.toLowerCase();
      if (looksLikeUsername) updates.negocio = '';
      store.updateConfig(updates);
      setFormConfig(prev => ({ ...prev, ...updates }));
      showSaved();
    } finally {
      setSyncing(false);
    }
  };

  const handleTheme = (color) => store.setTheme(color);
  const handleDarkMode = (val) => store.setDarkMode(val);

  const handleReset = () => {
    if (confirmReset) {
      localStorage.clear();
      window.location.reload();
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const inputClass    = (ed) => `form-input ${!ed ? 'disabled' : ''}`;
  const textareaClass = (ed) => `form-textarea ${!ed ? 'disabled' : ''}`;

  // ── Tab definitions ──
  const TABS = [
    { id: 'negocio',        label: 'Negocio',          icon: '🏢' },
    { id: 'apariencia',     label: 'Apariencia',        icon: '🎨' },
    { id: 'acerca',         label: 'Acerca de',         icon: 'ℹ️' },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">⚙️ Configuración</h2>
          <p className="page-subtitle">Personaliza tu experiencia y gestiona tu negocio</p>
        </div>
        {saved && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 99,
            background: 'hsl(var(--success) / 0.12)',
            color: 'hsl(var(--success))', fontWeight: 700, fontSize: 13,
            animation: 'fadeIn 0.3s ease',
          }}>
            ✅ Guardado
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'hsl(var(--bg))', padding: 4, borderRadius: 14, width: 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
              background: activeTab === t.id ? 'hsl(var(--card))' : 'transparent',
              color: activeTab === t.id ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              boxShadow: activeTab === t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* ═══════════════════════════════════════════════════════════════
            TAB: NEGOCIO
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'negocio' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🏢</span>
                  <span className="card-title">Información del negocio</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {user && !editConfig && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={handleSyncFromAuth}
                      disabled={syncing}
                      style={{ fontSize: 12 }}
                    >
                      {syncing ? '⏳' : '🔄'} Sincronizar cuenta
                    </button>
                  )}
                  {!editConfig && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditConfig(true)}>✏️ Editar</button>
                  )}
                </div>
              </div>
              <form onSubmit={handleSaveConfig}>
                <div className="card-body">
                  {/* Avatar + nombre */}
                  <div className="configuracion-profile-block" style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ position: 'relative' }}>
                          {formConfig.profilePhoto && !configPhotoErr ? (
                            <img
                              src={formConfig.profilePhoto}
                              alt="Perfil"
                              onError={() => setConfigPhotoErr(true)}
                              style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: `3px solid hsl(var(--primary))`, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                            />
                          ) : (
                            <div style={{
                              width: 88, height: 88, borderRadius: '50%',
                              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                              color: 'white', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontWeight: 900, fontSize: 36,
                              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            }}>
                              {(formConfig.propietario || formConfig.negocio || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          {editConfig && (
                            <label style={{
                              position: 'absolute', bottom: 0, right: 0,
                              width: 28, height: 28, borderRadius: '50%',
                              background: 'hsl(var(--primary))', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            }}>
                              📷
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                            </label>
                          )}
                        </div>
                        {editConfig && formConfig.profilePhoto && (
                          <span
                            style={{ cursor: 'pointer', fontSize: 11, color: 'hsl(var(--danger))', fontWeight: 600, marginTop: 4 }}
                            onClick={() => setFormConfig({ ...formConfig, profilePhoto: '' })}
                          >
                            🗑️ Quitar foto
                          </span>
                        )}
                    </div>

                    <div className="form-grid" style={{ flex: 1, marginTop: 0 }}>
                      <div className="form-group">
                        <label className="form-label configuracion-form-label">Nombre del sistema / App</label>
                        <input className={inputClass(editConfig)} disabled={!editConfig}
                          value={formConfig.appName || 'PrintMeiker'}
                          onChange={e => setFormConfig({ ...formConfig, appName: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label configuracion-form-label">Nombre de tu negocio</label>
                        <input className={inputClass(editConfig)} disabled={!editConfig}
                          value={formConfig.negocio}
                          onChange={e => setFormConfig({ ...formConfig, negocio: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Propietario / Administrador</label>
                      <input className={inputClass(editConfig)} disabled={!editConfig}
                        value={formConfig.propietario}
                        onChange={e => setFormConfig({ ...formConfig, propietario: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teléfono de contacto</label>
                      <input className={inputClass(editConfig)} disabled={!editConfig}
                        value={formConfig.telefono}
                        onChange={e => setFormConfig({ ...formConfig, telefono: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Email de contacto</label>
                      <input className={inputClass(editConfig)} disabled={!editConfig} type="email"
                        value={formConfig.email}
                        onChange={e => setFormConfig({ ...formConfig, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Moneda</label>
                      <select className={`form-select ${!editConfig ? 'disabled' : ''}`} disabled={!editConfig}
                        value={formConfig.moneda}
                        onChange={e => setFormConfig({ ...formConfig, moneda: e.target.value })}>
                        <option value="MXN">🇲🇽 MXN - Peso mexicano</option>
                        <option value="USD">🇺🇸 USD - Dólar</option>
                        <option value="EUR">🇪🇺 EUR - Euro</option>
                      </select>
                    </div>
                  </div>

                  {/* Cotizaciones config */}
                  <div style={{ background: 'hsl(var(--bg))', padding: 16, borderRadius: 12, marginTop: 8 }}>
                    <h4 style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, color: 'hsl(var(--muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      📋 Configuración de Cotizaciones
                    </h4>
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label className="form-label">Método de pago (en el documento)</label>
                      <textarea
                        className={textareaClass(editConfig)} disabled={!editConfig} rows={3}
                        value={formConfig.infoPago || ''}
                        onChange={e => setFormConfig({ ...formConfig, infoPago: e.target.value })}
                        placeholder="Escribe aquí tu información de pago (cada línea = una fila en el documento)"
                      />
                      <span style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>Cada línea aparece como una fila en el bloque de método de pago.</span>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Mensaje de pie de cotización</label>
                      <input
                        className={inputClass(editConfig)} disabled={!editConfig}
                        value={formConfig.mensajePie || ''}
                        onChange={e => setFormConfig({ ...formConfig, mensajePie: e.target.value })}
                        placeholder="¡Gracias por su preferencia!"
                      />
                    </div>
                  </div>

                  {editConfig && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                      <button type="button" className="btn btn-ghost" onClick={() => { setFormConfig(config); setEditConfig(false); }}>Cancelar</button>
                      <button type="submit" className="btn btn-primary">✓ Guardar</button>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* ── Términos y condiciones ── */}
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>📜</span>
                  <span className="card-title">Términos y condiciones</span>
                </div>
                {!editTerminos && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditTerminos(true)}>✏️ Editar</button>
                )}
              </div>
              <form onSubmit={handleSaveTerminos}>
                <div className="card-body">
                  <p style={{ fontSize: 13, color: 'hsl(var(--muted))', marginBottom: 16, lineHeight: 1.6 }}>
                    Define los textos predeterminados que aparecerán al generar una cotización. Podrás elegirlos con los botones <strong>"Usar términos locales"</strong> y <strong>"Usar términos nacionales"</strong>.
                  </p>

                  {/* Términos locales */}
                  <div style={{ background: 'hsl(var(--bg))', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>📌</span>
                      <h4 style={{ fontWeight: 700, fontSize: 13, margin: 0, color: 'hsl(var(--muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Términos Locales</h4>
                    </div>
                    <p style={{ fontSize: 12, color: 'hsl(var(--muted))', marginBottom: 8, lineHeight: 1.5 }}>
                      Para entregas en ciudad / recolección en taller.
                    </p>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <textarea
                        className={`form-textarea ${!editTerminos ? 'disabled' : ''}`}
                        disabled={!editTerminos}
                        rows={5}
                        value={formTerminos.terminosLocales}
                        onChange={e => setFormTerminos(prev => ({ ...prev, terminosLocales: e.target.value }))}
                        placeholder="Ej. Anticipo del 50% para apartar fecha. Saldo al entregar..."
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {/* Términos nacionales */}
                  <div style={{ background: 'hsl(var(--bg))', borderRadius: 12, padding: 16, marginBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 18 }}>🚚</span>
                      <h4 style={{ fontWeight: 700, fontSize: 13, margin: 0, color: 'hsl(var(--muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Términos Nacionales</h4>
                    </div>
                    <p style={{ fontSize: 12, color: 'hsl(var(--muted))', marginBottom: 8, lineHeight: 1.5 }}>
                      Para envíos por paquetería a todo México.
                    </p>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <textarea
                        className={`form-textarea ${!editTerminos ? 'disabled' : ''}`}
                        disabled={!editTerminos}
                        rows={5}
                        value={formTerminos.terminosNacionales}
                        onChange={e => setFormTerminos(prev => ({ ...prev, terminosNacionales: e.target.value }))}
                        placeholder="Ej. Anticipo del 70% antes de iniciar producción. Saldo antes de enviar..."
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {editTerminos && (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => { setFormTerminos({ terminosLocales: negocioConfig?.terminosLocales || DEFAULT_TERMINOS_LOCALES, terminosNacionales: negocioConfig?.terminosNacionales || DEFAULT_TERMINOS_NACIONALES }); setEditTerminos(false); }}
                      >Cancelar</button>
                      <button type="submit" className="btn btn-primary">✓ Guardar términos</button>
                    </div>
                  )}

                  {!editTerminos && (
                    <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'hsl(var(--primary) / 0.06)', border: '1px solid hsl(var(--primary) / 0.15)', fontSize: 12, color: 'hsl(var(--muted))' }}>
                      💡 Estos textos se cargarán automáticamente en nuevas cotizaciones y podrás elegirlos con un clic desde el formulario de cotización.
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB: APARIENCIA
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'apariencia' && (
          <div style={{ display: 'grid', gap: 20 }}>

            {/* ── Preview Card ── */}
            <div style={{
              borderRadius: 16, overflow: 'hidden',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, backdropFilter: 'blur(6px)',
                }}>🎨</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>Vista previa en tiempo real</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>Los cambios se aplican al instante</div>
                </div>
              </div>

              {/* Mini UI preview */}
              <div style={{ background: 'hsl(var(--card))', padding: '18px 24px', display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'hsl(var(--primary))' }} />
                <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'hsl(var(--primary))', opacity: 0.2 }} />
                <div style={{ padding: '4px 12px', borderRadius: 99, background: 'hsl(var(--primary))', color: '#fff', fontSize: 11, fontWeight: 700 }}>Botón</div>
              </div>

              <div style={{ background: 'hsl(var(--bg))', padding: '14px 24px', display: 'flex', gap: 10 }}>
                {['Pedidos', 'Finanzas', 'Catálogo'].map((item, i) => (
                  <div key={item} style={{
                    padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: i === 0 ? 'hsl(var(--primary-light))' : 'transparent',
                    color: i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                    border: i === 0 ? '1.5px solid hsl(var(--primary) / 0.3)' : '1.5px solid transparent',
                  }}>{item}</div>
                ))}
              </div>
            </div>

            {/* ── Color del tema ── */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontSize: 20 }}>🌈</span>
                <span className="card-title">Color del tema</span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 13, color: 'hsl(var(--muted))', marginBottom: 20 }}>
                  Elige el color que define el estilo visual de toda la aplicación.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                  {Object.entries(THEMES).map(([color, theme]) => {
                    const isActive = themeColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => handleTheme(color)}
                        style={{
                          border: isActive ? `2px solid ${color}` : '2px solid hsl(var(--border))',
                          borderRadius: 14, padding: '12px 8px', cursor: 'pointer',
                          background: isActive ? `${color}15` : 'hsl(var(--bg))',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                          transition: 'all 0.2s', outline: 'none',
                          boxShadow: isActive ? `0 4px 16px ${color}40` : 'none',
                          transform: isActive ? 'translateY(-2px)' : 'none',
                        }}
                      >
                        {/* Gradient preview circle */}
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${color}, ${color}99)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 4px 12px ${color}55`,
                        }}>
                          {isActive && <span style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? color : 'hsl(var(--muted))', textAlign: 'center', lineHeight: 1.3 }}>
                          {theme.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Modo oscuro ── */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontSize: 20 }}>{darkMode ? '🌙' : '☀️'}</span>
                <span className="card-title">Modo de pantalla</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Claro', value: false, icon: '☀️', desc: 'Fondo blanco, ideal para ambientes con luz' },
                    { label: 'Oscuro', value: true,  icon: '🌙', desc: 'Fondo oscuro, reduce fatiga visual en la noche' },
                  ].map(opt => {
                    const isActive = darkMode === opt.value;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleDarkMode(opt.value)}
                        style={{
                          border: `2px solid ${isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                          borderRadius: 14, padding: '20px 16px', cursor: 'pointer',
                          background: isActive ? 'hsl(var(--primary-light))' : 'hsl(var(--bg))',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                          transition: 'all 0.2s', outline: 'none',
                          boxShadow: isActive ? '0 4px 20px hsl(var(--primary) / 0.2)' : 'none',
                          transform: isActive ? 'translateY(-2px)' : 'none',
                        }}
                      >
                        {/* Mini preview */}
                        <div style={{
                          width: 64, height: 40, borderRadius: 8,
                          background: opt.value ? '#1a1a2e' : '#f8fafc',
                          border: '1.5px solid hsl(var(--border))',
                          display: 'flex', alignItems: 'center', padding: '0 8px', gap: 5,
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.value ? '#4f46e5' : 'hsl(var(--primary))' }} />
                          <div style={{ flex: 1, height: 4, borderRadius: 99, background: opt.value ? '#333' : '#e2e8f0' }} />
                        </div>
                        <span style={{ fontSize: 22 }}>{opt.icon}</span>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: 'hsl(var(--muted))', marginTop: 2, lineHeight: 1.4 }}>{opt.desc}</div>
                        </div>
                        {isActive && (
                          <div style={{
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'hsl(var(--primary))', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 900,
                          }}>✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>


            {/* ── Opciones de interfaz ── */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontSize: 20 }}>🖥️</span>
                <span className="card-title">Preferencias de interfaz</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                {/* Toggle item */}
                {[
                  {
                    label: 'Animaciones',
                    desc: 'Efectos de transición y micro-animaciones',
                    icon: '✨',
                    value: animaciones,
                    onChange: setAnimaciones,
                  },
                  {
                    label: 'Tarjetas compactas',
                    desc: 'Reduce el espacio en tablas y listas',
                    icon: '📋',
                    value: compactCards,
                    onChange: setCompactCards,
                  },
                ].map((item, i, arr) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'hsl(var(--bg))',
                        border: '1px solid hsl(var(--border))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }}>
                        {item.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                        <div style={{ fontSize: 12, color: 'hsl(var(--muted))', marginTop: 2 }}>{item.desc}</div>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      onClick={() => item.onChange(!item.value)}
                      style={{
                        width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
                        background: item.value ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                        position: 'relative', transition: 'background 0.25s', flexShrink: 0,
                        padding: 0,
                      }}
                      aria-checked={item.value}
                      role="switch"
                    >
                      <div style={{
                        position: 'absolute', top: 3, left: item.value ? 26 : 3,
                        width: 22, height: 22, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.25s',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                  </div>
                ))}

                {/* Sidebar mode */}
                <div style={{ paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: 'hsl(var(--bg))', border: '1px solid hsl(var(--border))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>📐</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Barra lateral</div>
                      <div style={{ fontSize: 12, color: 'hsl(var(--muted))', marginTop: 2 }}>Ajusta el ancho del menú de navegación</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {SIDEBAR_MODES.map(m => {
                      const isActive = sidebarMode === m.value;
                      return (
                        <button
                          key={m.value}
                          onClick={() => setSidebarMode(m.value)}
                          style={{
                            flex: 1, padding: '10px', borderRadius: 10,
                            border: `2px solid ${isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                            background: isActive ? 'hsl(var(--primary-light))' : 'hsl(var(--bg))',
                            cursor: 'pointer', fontWeight: isActive ? 700 : 500,
                            fontSize: 13, color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                            transition: 'all 0.2s', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          {m.icon} {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>



              </div>
            </div>

            {/* ── Restablecer apariencia ── */}
            <div style={{ textAlign: 'center', paddingTop: 4 }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  handleTheme('#1f51d3');
                  handleDarkMode(false);
                  setAnimaciones(true);
                  setCompactCards(false);
                  setSidebarMode('normal');
                  showSaved();
                }}
                style={{ color: 'hsl(var(--muted))', fontSize: 12 }}
              >
                🔄 Restablecer apariencia predeterminada
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB: ACERCA DE
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'acerca' && (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* App info */}
            <div className="card">
              <div style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)))',
                padding: '28px 28px', borderRadius: '12px 12px 0 0',
                display: 'flex', alignItems: 'center', gap: 18,
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
                  backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                }}>🖨️</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>{config.appName || 'PrintMeiker'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>Sistema de gestión para impresoras y diseñadores</div>
                  <div style={{
                    display: 'inline-block', marginTop: 8,
                    padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.2)',
                    color: '#fff', fontSize: 11, fontWeight: 700,
                  }}>v1.0.0 — Estable</div>
                </div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {[
                  { label: '⚡ Tecnología',         value: 'React + Vite + Supabase' },
                  { label: '💾 Almacenamiento',     value: user ? '☁️ Nube (Supabase)' : '💾 Local (tu dispositivo)' },
                  { label: '🔒 Autenticación',      value: user ? `✅ Conectado (${user.email})` : '❌ Sin sesión' },
                ].map(({ label, value }, i) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 24px',
                    borderBottom: i < 2 ? '1px solid hsl(var(--border))' : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: 'hsl(var(--muted))' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
                {/* Stats */}
                {store.getState().deferredPrompt && !store.getState().pwaInstalled && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 24px',
                    background: 'hsl(var(--primary) / 0.05)',
                    border: '1px dashed hsl(var(--primary) / 0.3)',
                    borderRadius: 10,
                    margin: '12px 24px',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>📲 Aplicación de escritorio / móvil</span>
                      <span style={{ fontSize: 11, color: 'hsl(var(--muted))' }}>Instala PrintMeiker para acceso rápido offline y pantalla completa</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={async () => {
                        const prompt = store.getState().deferredPrompt;
                        if (!prompt) return;
                        prompt.prompt();
                        const { outcome } = await prompt.userChoice;
                        if (outcome === 'accepted') store.setPwaInstalled(true);
                        store.setDeferredPrompt(null);
                      }}
                      style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                    >
                      Instalar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="card">
              <div className="card-header">
                <span style={{ fontSize: 20 }}>📊</span>
                <span className="card-title">Resumen de datos</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Clientes',     value: clientes.length,     icon: '👥', link: '/clientes',     color: '#6366f1' },
                    { label: 'Pedidos',      value: pedidos.length,      icon: '📦', link: '/pedidos',      color: '#f59e0b' },
                    { label: 'Cotizaciones', value: cotizaciones.length, icon: '📋', link: '/cotizaciones', color: '#10b981' },
                    { label: 'Productos',    value: productos.length,    icon: '🏷️', link: '/catalogo',     color: '#ec4899' },
                    { label: 'Transacciones',value: finanzas.length,     icon: '💰', link: '/finanzas',     color: '#3b82f6' },
                  ].map(item => (
                    <Link
                      key={item.label}
                      to={item.link}
                      style={{
                        textDecoration: 'none', borderRadius: 12,
                        padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        background: `${item.color}10`, border: `1.5px solid ${item.color}30`,
                        transition: 'all 0.2s', cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                    >
                      <span style={{ fontSize: 24 }}>{item.icon}</span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.value}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: item.color, opacity: 0.8 }}>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Zona de peligro */}
            <div className="card" style={{ border: '2px solid hsl(var(--danger))', background: 'hsl(var(--danger) / 0.03)' }}>
              <div className="card-header">
                <span style={{ fontSize: 20 }}>⚠️</span>
                <span className="card-title" style={{ color: 'hsl(var(--danger))' }}>Zona de peligro</span>
              </div>
              <div className="card-body">
                <div style={{
                  padding: '12px 16px', borderRadius: 10,
                  background: 'hsl(var(--danger) / 0.07)', border: '1px solid hsl(var(--danger) / 0.2)',
                  marginBottom: 16, fontSize: 13, color: 'hsl(var(--muted))', lineHeight: 1.6,
                }}>
                  ⚡ Esta acción eliminará <strong>todos los datos</strong> de la aplicación incluyendo pedidos, cotizaciones, finanzas y catálogo. <strong>No se puede deshacer.</strong>
                </div>
                <div className="configuracion-danger-zone" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button className="btn btn-danger" onClick={handleReset}>
                    {confirmReset ? '⚠️ ¿Confirmas? Presiona de nuevo' : '🗑️ Borrar todos los datos'}
                  </button>
                  {confirmReset && (
                    <button type="button" className="btn btn-ghost btn-modal-cancel" onClick={() => setConfirmReset(false)}>Cancelar</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
