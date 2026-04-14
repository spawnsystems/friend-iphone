-- ============================================================
-- 003_functions_helpers.sql
-- Funciones helper para RLS y lógica de permisos
-- ============================================================

-- Obtener el rol del usuario autenticado actual
CREATE OR REPLACE FUNCTION get_mi_rol()
RETURNS app_role AS $$
    SELECT rol FROM usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ¿Es dueño o admin?
CREATE OR REPLACE FUNCTION es_dueno_o_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(get_mi_rol() IN ('dueno', 'admin'), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ¿Es un usuario activo del sistema?
CREATE OR REPLACE FUNCTION es_usuario_activo()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid() AND activo = TRUE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
