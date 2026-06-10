import { useState, useEffect } from 'react';
import { useStore, store, THEMES } from '../store/useStore';
import { useAuth } from '../store/authStore';

export const ConfiguracionPage = () => {
  const { config, themeColor, pedidos, cotizaciones, productos, finanzas, clientes } = useStore();
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Forms states
  const [formConfig, setFormConfig] = useState({ ...config });

  // Edit mode toggles
  const [editConfig, setEditConfig] = useState(false);

  // Sync form state when store state changes (and not in edit mode)
  useEffect(() => {
    if (!editConfig) {
      setFormConfig({ ...config });
    }
  }, [config, editConfig]);



  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 80% quality to significantly reduce size for localStorage
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

  // Sincronizar datos personales desde la cuenta de Google / correo
  const handleSyncFromAuth = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const meta = user.user_metadata || {};
      // Solo sincronizamos nombre personal, email y foto — NUNCA el nombre del negocio
      const nombre = meta.full_name || meta.name || meta.nombre || '';
      const email = user.email || '';
      const avatar = meta.avatar_url || meta.picture || '';

      const updates = { _authUserId: user.id };
      if (nombre) updates.propietario = nombre;
      if (email) updates.email = email;
      if (avatar) updates.profilePhoto = avatar;

      // Si el "nombre del negocio" parece ser un usuario de Google (sin espacios, todo minúsculas)
      // lo limpiamos para que el usuario lo ingrese correctamente
      const currentNegocio = store.getState().config.negocio || '';
      const looksLikeUsername = currentNegocio && !/\s/.test(currentNegocio) && currentNegocio === currentNegocio.toLowerCase();
      if (looksLikeUsername) {
        updates.negocio = '';
      }

      store.updateConfig(updates);
      // Actualizar también el form local para reflejar el cambio inmediatamente
      setFormConfig(prev => ({ ...prev, ...updates }));
      showSaved();
    } finally {
      setSyncing(false);
    }
  };

  const handleTheme = (color) => {
    store.setTheme(color);
  };

  const handleReset = () => {
    if (confirmReset) {
      localStorage.clear();
      window.location.reload();
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const inputClass = (isEditing) => `form-input ${!isEditing ? 'disabled' : ''}`;
  const textareaClass = (isEditing) => `form-textarea ${!isEditing ? 'disabled' : ''}`;

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">⚙️ Configuración</h2>
          <p className="page-subtitle">Administra tu organización y plataforma</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, maxWidth: 800, margin: '0 auto' }}>
        
        {/* Info del Negocio */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  title="Rellenar con datos de tu cuenta de Google o correo"
                  style={{ fontSize: 12 }}
                >
                  {syncing ? '⏳' : '🔄'} Sincronizar cuenta
                </button>
              )}
              {!editConfig && (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditConfig(true)}>✏️ Editar</button>
              )}
            </div>
          </div>
          <form onSubmit={handleSaveConfig}>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  {formConfig.profilePhoto ? (
                    <img 
                      src={formConfig.profilePhoto} 
                      alt="Perfil" 
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid hsl(var(--primary))` }} 
                    />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'hsl(var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 32 }}>
                      {(formConfig.propietario || formConfig.negocio || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  {editConfig && (
                    <label style={{ cursor: 'pointer', fontSize: 13, color: 'hsl(var(--primary))', fontWeight: 600 }}>
                      Cambiar foto
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                    </label>
                  )}
                  {editConfig && formConfig.profilePhoto && (
                    <span style={{ cursor: 'pointer', fontSize: 12, color: 'hsl(var(--danger))' }} onClick={() => setFormConfig({...formConfig, profilePhoto: ''})}>
                      Quitar
                    </span>
                  )}
                </div>
                
                <div className="form-grid" style={{ flex: 1, marginTop: 0 }}>
                  <div className="form-group">
                    <label className="form-label">Nombre del sistema / App</label>
                    <input className={inputClass(editConfig)} disabled={!editConfig} value={formConfig.appName || 'CotizaPro'} onChange={e => setFormConfig({...formConfig, appName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre de tu negocio</label>
                    <input className={inputClass(editConfig)} disabled={!editConfig} value={formConfig.negocio} onChange={e => setFormConfig({...formConfig, negocio: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Propietario / Administrador</label>
                  <input className={inputClass(editConfig)} disabled={!editConfig} value={formConfig.propietario} onChange={e => setFormConfig({...formConfig, propietario: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono de contacto</label>
                  <input className={inputClass(editConfig)} disabled={!editConfig} value={formConfig.telefono} onChange={e => setFormConfig({...formConfig, telefono: e.target.value})} />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Email de contacto</label>
                  <input className={inputClass(editConfig)} disabled={!editConfig} type="email" value={formConfig.email} onChange={e => setFormConfig({...formConfig, email: e.target.value})} />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Moneda</label>
                  <select className={`form-select ${!editConfig ? 'disabled' : ''}`} disabled={!editConfig} value={formConfig.moneda} onChange={e => setFormConfig({...formConfig, moneda: e.target.value})}>
                    <option value="MXN">🇲🇽 MXN - Peso mexicano</option>
                    <option value="USD">🇺🇸 USD - Dólar</option>
                    <option value="EUR">🇪🇺 EUR - Euro</option>
                  </select>
                </div>
              </div>

              {/* Cotizaciones */}
              <div style={{ background: 'hsl(var(--bg))', padding: 16, borderRadius: 12, marginTop: 4 }}>
                <h4 style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📋 Configuración de Cotizaciones
                </h4>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Método de pago (aparece en el documento)</label>
                  <textarea
                    className={textareaClass(editConfig)}
                    disabled={!editConfig}
                    rows={3}
                    value={formConfig.infoPago || ''}
                    onChange={e => setFormConfig({...formConfig, infoPago: e.target.value})}
                    placeholder={'Ej:\nCuenta BBVA: 1234 5678 9012\nNombre: Mi Negocio\nClabe: 012 345 6789'}
                  />
                  <span style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>Cada línea aparece como una fila en el bloque de método de pago del documento. Si está vacío, el bloque no aparece.</span>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Mensaje de pie de cotización</label>
                  <input
                    className={inputClass(editConfig)}
                    disabled={!editConfig}
                    value={formConfig.mensajePie || ''}
                    onChange={e => setFormConfig({...formConfig, mensajePie: e.target.value})}
                    placeholder="¡Gracias por su preferencia!"
                  />
                  <span style={{ fontSize: 12, color: 'hsl(var(--muted))' }}>Texto que aparece al pie de cada cotización generada.</span>
                </div>
              </div>

              {editConfig && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setFormConfig(config); setEditConfig(false); }}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              )}
            </div>
          </form>
        </div>


        {/* Tema */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: 20 }}>🎨</span>
            <span className="card-title">Color del tema</span>
          </div>
          <div className="card-body">
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 20 }}>
              Elige el color principal de la aplicación. Se aplica al instante.
            </p>
            <div className="theme-picker" style={{ justifyContent: 'flex-start' }}>
              {Object.entries(THEMES).map(([color, theme]) => (
                <div key={color} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div
                    className={`theme-swatch ${themeColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleTheme(color)}
                    title={theme.name}
                  />
                  <span style={{ fontSize: 12, color: 'hsl(var(--muted))', fontWeight: 500 }}>{theme.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Acerca de */}
        <div className="card">
          <div className="card-header">
            <span style={{ fontSize: 20 }}>ℹ️</span>
            <span className="card-title">Acerca de la app</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Aplicación', config.appName || 'CotizaPro'],
                ['Versión', '1.0.0'],
                ['Tecnología', 'React + Vite'],
                ['Almacenamiento', 'Local (tu dispositivo)'],
                ['Clientes registrados', clientes.length],
                ['Pedidos guardados', pedidos.length],
                ['Cotizaciones', cotizaciones.length],
                ['Productos en catálogo', productos.length],
                ['Movimientos financieros', finanzas.length],
              ].map(([label, value]) => (
                <div key={label} className="flex-between">
                  <span style={{ fontSize: 14, color: 'hsl(var(--muted))' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zona de peligro */}
        <div className="card" style={{ border: '2px solid hsl(var(--danger))', backgroundColor: 'hsl(var(--danger) / 0.05)' }}>
          <div className="card-header">
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span className="card-title" style={{ color: 'hsl(var(--danger))' }}>Zona de peligro</span>
          </div>
          <div className="card-body">
            <p className="text-muted" style={{ fontSize: 14, marginBottom: 16 }}>
              Esta acción eliminará <strong>todos los datos</strong> de la aplicación incluyendo pedidos, cotizaciones, finanzas y catálogo. No se puede deshacer.
            </p>
            <button className="btn btn-danger" onClick={handleReset}>
              {confirmReset ? '⚠️ ¿Estás segura? Presiona de nuevo para confirmar' : '🗑️ Borrar todos los datos'}
            </button>
            {confirmReset && (
              <button className="btn btn-ghost" style={{ marginLeft: 12 }} onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
