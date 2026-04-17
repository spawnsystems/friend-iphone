-- ============================================================
-- 015_platform_admin.sql
-- Agrega soporte para administradores de plataforma.
--
-- - Columna is_platform_admin en usuarios
-- - RLS para /platform: platform admins usan service role (dbAdmin)
--   por lo que no necesitan policies especiales en las tablas de negocio.
--   Esta migración solo agrega la columna y el helper.
-- ============================================================

-- ── Columna is_platform_admin ─────────────────────────────────
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Helper: es_platform_admin() ──────────────────────────────

CREATE OR REPLACE FUNCTION es_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM usuarios WHERE id = auth.uid()),
    FALSE
  );
$$;

-- ── RLS: usuarios puede leerse a sí mismo + dueño/admin ──────
-- La policy existente de usuarios_select permite a todos los activos leer.
-- Agregamos que platform admins pueden leer también (para gestión cross-tenant).
-- En práctica, platform admins usan dbAdmin (service role), pero por si acaso:

DROP POLICY IF EXISTS "usuarios_select" ON usuarios;
CREATE POLICY "usuarios_select" ON usuarios
  FOR SELECT TO authenticated
  USING (
    es_usuario_activo()
    OR es_platform_admin()
    OR id = auth.uid()   -- siempre puede leer su propia fila
  );

-- ============================================================
-- End migration 015
-- ============================================================
