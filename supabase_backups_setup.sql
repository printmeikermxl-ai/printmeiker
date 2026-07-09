-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT DE CONFIGURACIÓN DE TABLA DE COPIAS DE SEGURIDAD (BACKUPS) EN SUPABASE
-- Copia este contenido y pégalo en: Supabase Dashboard → SQL Editor → New Query
-- Luego haz clic en "Run" para ejecutarlo
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Crear la tabla user_backups para almacenar copias de seguridad de datos por usuario
CREATE TABLE IF NOT EXISTS public.user_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT 'Copia automática',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Habilitar Row Level Security (RLS) para que cada usuario solo vea sus copias de seguridad
ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad: cada usuario solo puede ver/crear/borrar SUS propias copias de seguridad
-- Política de lectura
DROP POLICY IF EXISTS "Users can read own backups" ON public.user_backups;
CREATE POLICY "Users can read own backups"
  ON public.user_backups
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política de inserción
DROP POLICY IF EXISTS "Users can insert own backups" ON public.user_backups;
CREATE POLICY "Users can insert own backups"
  ON public.user_backups
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política de eliminación
DROP POLICY IF EXISTS "Users can delete own backups" ON public.user_backups;
CREATE POLICY "Users can delete own backups"
  ON public.user_backups
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Crear índice para búsquedas rápidas por user_id
CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON public.user_backups(user_id);

-- 5. Habilitar Realtime para la tabla user_backups
alter publication supabase_realtime add table public.user_backups;
