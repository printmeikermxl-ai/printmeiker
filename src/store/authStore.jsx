import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, nombre) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth',
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out from Supabase:', e);
    }
    
    // Limpiar claves de almacenamiento local para evitar filtrado de datos al cambiar de usuario
    const keysToClear = [
      'sep_productos', 'sep_combos', 'sep_pedidos', 'sep_cotizaciones',
      'sep_finanzas', 'sep_clientes', 'sep_etiquetas', 'sep_categorias_producto',
      'sep_canales_venta', 'sep_config', 'sep_negocio_config', 'sep_alertas_pedidos',
      'sep_theme', 'sep_dark_mode', 'sep_notas', 'sep_categorias_notas',
      'sep_etiquetas_pedidos', 'sep_pending_cloud_sync', 'sep_local_last_save',
      'sep_cot_counter', 'sep_ped_counter', 'sep_cli_counter', 'sep_fin_counter'
    ];
    keysToClear.forEach(key => localStorage.removeItem(key));
    
    // Forzar recarga para limpiar el estado en memoria de React y del Store
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
