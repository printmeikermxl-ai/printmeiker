import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { useStore, store } from '../store/useStore';

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

// Configuración de Marca y Textos en la Pantalla de Registro / Inicio de Sesión
// Puedes modificar estos valores libremente para personalizar la pantalla de bienvenida
const BRANDING = {
  appName: 'PrintMeiker',
  tagline: 'Gestión inteligente para tu negocio de personalización y estampados',
  logoUrl: '/logo.png', // Coloca tu logo en public/logo.png
  fallbackIcon: '✨',    // Emoji o ícono fallback si no hay imagen de logo
  features: [
    { icon: '📦', text: 'Gestión de pedidos en tiempo real' },
    { icon: '💰', text: 'Control de finanzas, abonos y gastos' },
    { icon: '📋', text: 'Cotizaciones rápidas para tus clientes' },
    { icon: '☁️', text: 'Sincronización automática en la nube' },
  ],
  footerText: 'Tu negocio, siempre a mano.',
};

export const AuthPage = () => {
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { darkMode } = useStore();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoError, setLogoError] = useState(false);

  // Si el usuario ya está autenticado, redirigir al inicio
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);



  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión con Google.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'register') {
      if (!nombre.trim()) return setError('Por favor ingresa tu nombre.');
      if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');
      if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        // signIn exitoso → onAuthStateChange actualizará user → useEffect redirige
      } else {
        // 1. Registrar al usuario
        const data = await signUp(email, password, nombre);
        
        // 2. Si Supabase devolvió sesión directa (confirm email OFF), ya está logueado
        if (data?.session) {
          // onAuthStateChange se encargará de redirigir
          return;
        }
        
        // 3. Si no hay sesión, intentar login automático
        try {
          await signIn(email, password);
          // Login exitoso → redirige automáticamente
          return;
        } catch (loginErr) {
          // Si falla el auto-login (email confirmation activa), mostrar mensaje
          const loginMsg = loginErr.message || '';
          if (loginMsg.includes('Email not confirmed')) {
            setSuccess('¡Cuenta creada! Revisa tu correo para confirmar tu registro y luego inicia sesión.');
            setMode('login');
          } else {
            // Registro exitoso pero login falló por otra razón
            setSuccess('¡Cuenta creada exitosamente! Ahora inicia sesión con tus datos.');
            setMode('login');
          }
        }
      }
    } catch (err) {
      const msg = err.message || 'Ocurrió un error. Intenta de nuevo.';
      if (msg.includes('Invalid login credentials')) setError('Correo o contraseña incorrectos.');
      else if (msg.includes('User already registered')) setError('Este correo ya está registrado. Inicia sesión.');
      else if (msg.includes('Email not confirmed')) setError('Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Botón flotante para cambiar de tema (Modo Oscuro/Claro) */}
      <button
        onClick={() => store.setDarkMode(!darkMode)}
        className="theme-toggle-btn"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10,
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '18px',
        }}
        title={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      {/* Fondo decorativo */}
      <div className="auth-bg">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
      </div>

      {/* Panel izquierdo — Branding */}
      <div className="auth-left">
        <div className="auth-brand">
          <img
            src="/logo.png"
            alt="PrintMeiker"
            style={{
              width: '320px',
              height: 'auto',
              display: 'block',
              marginBottom: '24px',
              mixBlendMode: 'screen',
            }}
          />
          <p className="auth-brand-tagline" style={{ marginTop: 12 }}>{BRANDING.tagline}</p>
        </div>

        <div className="auth-features">
          {BRANDING.features.map((f, i) => (
            <div className="auth-feature" key={i}>
              <span className="auth-feature-icon">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        <p className="auth-left-footer">{BRANDING.footerText}</p>
      </div>

      {/* Panel derecho — Formulario */}
      <div className="auth-right">
        <div className="auth-card">
          {/* Tabs Login / Registro */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            >
              Iniciar sesión
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
            >
              Crear cuenta
            </button>
          </div>

          <div className="auth-form-body">
            <h2 className="auth-heading">
              {mode === 'login' ? '¡Bienvenido de vuelta! 👋' : 'Crea tu cuenta gratis'}
            </h2>
            <p className="auth-subheading">
              {mode === 'login'
                ? 'Ingresa tus datos para continuar'
                : 'Empieza a gestionar tu negocio hoy'}
            </p>

            {error && (
              <div className="auth-alert auth-alert-error">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="auth-alert auth-alert-success">
                ✅ {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              {mode === 'register' && (
                <div className="auth-field">
                  <label className="auth-label">Nombre completo</label>
                  <input
                    id="auth-nombre"
                    className="auth-input"
                    type="text"
                    placeholder="Ej: María García"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Correo electrónico</label>
                <input
                  id="auth-email"
                  className="auth-input"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus={mode === 'login'}
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Contraseña</label>
                <div className="auth-input-wrapper">
                  <input
                    id="auth-password"
                    className="auth-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-btn"
                    onClick={() => setShowPass(v => !v)}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="auth-field">
                  <label className="auth-label">Confirmar contraseña</label>
                  <input
                    id="auth-confirm-password"
                    className="auth-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <button
                id="auth-submit-btn"
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="auth-spinner" />
                ) : mode === 'login' ? (
                  'Iniciar sesión →'
                ) : (
                  'Crear cuenta →'
                )}
              </button>
            </form>

            <div className="auth-divider">o continúa con</div>

            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="auth-google-btn-icon" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.4 7.56l3.85 2.98C6.2 7.73 8.89 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.66-2.33 3.48v2.89h3.77c2.2-2.03 3.62-5.01 3.62-8.52z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.25 14.5c-.25-.75-.39-1.55-.39-2.38s.14-1.63.39-2.38L1.4 6.76C.5 8.56 0 10.56 0 12.72s.5 4.16 1.4 5.96l3.85-2.98z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.77-2.89c-1.05.7-2.4 1.12-4.19 1.12-3.11 0-5.8-2.69-6.75-5.5L1.4 16.7C3.37 20.61 7.35 23 12 23z"
                />
              </svg>
              Continuar con Google
            </button>

            <p className="auth-switch">
              {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                className="auth-switch-btn"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
              >
                {mode === 'login' ? 'Regístrate gratis' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
