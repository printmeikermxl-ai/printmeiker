-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT DE CONFIGURACIÓN DE SUPABASE PARA SISTEMA PRO
-- Copia este contenido y pégalo en: Supabase Dashboard → SQL Editor → New Query
-- Luego haz clic en "Run" para ejecutarlo
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Crear la tabla user_data para almacenar datos por usuario
CREATE TABLE IF NOT EXISTS public.user_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Habilitar Row Level Security (RLS) para que cada usuario solo vea sus datos
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad: cada usuario solo puede ver/editar SUS propios datos
-- Política de lectura
DROP POLICY IF EXISTS "Users can read own data" ON public.user_data;
CREATE POLICY "Users can read own data"
  ON public.user_data
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política de inserción
DROP POLICY IF EXISTS "Users can insert own data" ON public.user_data;
CREATE POLICY "Users can insert own data"
  ON public.user_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política de actualización
DROP POLICY IF EXISTS "Users can update own data" ON public.user_data;
CREATE POLICY "Users can update own data"
  ON public.user_data
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política de eliminación
DROP POLICY IF EXISTS "Users can delete own data" ON public.user_data;
CREATE POLICY "Users can delete own data"
  ON public.user_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Crear índice para búsquedas rápidas por user_id
CREATE INDEX IF NOT EXISTS idx_user_data_user_id ON public.user_data(user_id);

-- 5. Función para actualizar el timestamp automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para auto-actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_updated_at ON public.user_data;
CREATE TRIGGER trigger_update_updated_at
  BEFORE UPDATE ON public.user_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 7. Habilitar Realtime para la tabla user_data para recibir cambios al instante entre dispositivos/pestañas
alter publication supabase_realtime add table public.user_data;

-- ✅ ¡Listo! La tabla user_data está creada y configurada.
-- Ahora ve a: Authentication → Providers → Email → Desactiva "Confirm email"
