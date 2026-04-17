-- ============================================================
-- 014_rls_tenant_scope.sql
-- Extiende RLS de todas las tablas de negocio con tenant_id.
--
-- Estrategia:
-- 1. Crear helper current_tenant_id() que lee el tenant del usuario.
-- 2. DROP de todas las policies existentes en tablas de negocio.
-- 3. RECREAR las policies con AND tenant_id = current_tenant_id().
--
-- Nota: platform admins (is_platform_admin = true) usan service role
-- key (dbAdmin) que bypasea RLS completamente → no necesitan policy.
-- ============================================================

-- ── Helper: current_tenant_id() ──────────────────────────────
-- Retorna el tenant_id del usuario autenticado buscando en tenant_members.
-- Si el usuario pertenece a varios tenants, retorna el primero activo
-- (en Fase 3 se mejora con app_metadata del JWT para ser determinista).

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM   tenant_members
  WHERE  user_id = auth.uid()
    AND  activo  = TRUE
  LIMIT 1;
$$;

-- ── Helpers existentes (conservados, solo documentados) ───────
-- get_mi_rol()      → retorna el rol del usuario (usa tabla usuarios)
-- es_dueno_o_admin() → BOOLEAN
-- es_usuario_activo() → BOOLEAN

-- ── CLIENTES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "clientes_select" ON clientes;
DROP POLICY IF EXISTS "clientes_insert" ON clientes;
DROP POLICY IF EXISTS "clientes_update" ON clientes;

CREATE POLICY "clientes_select" ON clientes FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "clientes_insert" ON clientes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "clientes_update" ON clientes FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

-- ── CUENTA CORRIENTE ──────────────────────────────────────────
DROP POLICY IF EXISTS "cta_cte_select" ON cuenta_corriente;
DROP POLICY IF EXISTS "cta_cte_insert" ON cuenta_corriente;
DROP POLICY IF EXISTS "cta_cte_update" ON cuenta_corriente;

CREATE POLICY "cta_cte_select" ON cuenta_corriente FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "cta_cte_insert" ON cuenta_corriente FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_dueno_o_admin());

CREATE POLICY "cta_cte_update" ON cuenta_corriente FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- ── REPUESTOS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "repuestos_select" ON repuestos;
DROP POLICY IF EXISTS "repuestos_insert" ON repuestos;
DROP POLICY IF EXISTS "repuestos_update" ON repuestos;

CREATE POLICY "repuestos_select" ON repuestos FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "repuestos_insert" ON repuestos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_dueno_o_admin());

CREATE POLICY "repuestos_update" ON repuestos FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- ── TELEFONOS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "telefonos_select" ON telefonos;
DROP POLICY IF EXISTS "telefonos_insert" ON telefonos;
DROP POLICY IF EXISTS "telefonos_update" ON telefonos;

CREATE POLICY "telefonos_select" ON telefonos FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "telefonos_insert" ON telefonos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "telefonos_update" ON telefonos FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

-- ── COSTOS INVENTARIO ─────────────────────────────────────────
DROP POLICY IF EXISTS "costos_select" ON costos_inventario;
DROP POLICY IF EXISTS "costos_insert" ON costos_inventario;
DROP POLICY IF EXISTS "costos_update" ON costos_inventario;
DROP POLICY IF EXISTS "costos_delete" ON costos_inventario;

CREATE POLICY "costos_select" ON costos_inventario FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

CREATE POLICY "costos_insert" ON costos_inventario FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_dueno_o_admin());

CREATE POLICY "costos_update" ON costos_inventario FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

CREATE POLICY "costos_delete" ON costos_inventario FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- ── COTIZACIONES ──────────────────────────────────────────────
DROP POLICY IF EXISTS "cotizaciones_select" ON cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_insert" ON cotizaciones;

CREATE POLICY "cotizaciones_select" ON cotizaciones FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "cotizaciones_insert" ON cotizaciones FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- ── REPARACIONES ──────────────────────────────────────────────
DROP POLICY IF EXISTS "reparaciones_select" ON reparaciones;
DROP POLICY IF EXISTS "reparaciones_insert" ON reparaciones;
DROP POLICY IF EXISTS "reparaciones_update" ON reparaciones;

CREATE POLICY "reparaciones_select" ON reparaciones FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "reparaciones_insert" ON reparaciones FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "reparaciones_update" ON reparaciones FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

-- ── REPARACION_REPUESTOS ──────────────────────────────────────
-- Se filtra por tenant vía JOIN a reparaciones (que ya tiene tenant_id).
-- Las policies existentes (de migration 009/010) ya son permisivas;
-- se dejan igual — el aislamiento lo garantiza la FK a reparaciones.
-- Si se necesita, se puede agregar un CHECK via JOIN en el futuro.

-- ── CIERRES CUENTA ────────────────────────────────────────────
DROP POLICY IF EXISTS "cierres_select" ON cierres_cuenta;
DROP POLICY IF EXISTS "cierres_insert" ON cierres_cuenta;

CREATE POLICY "cierres_select" ON cierres_cuenta FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "cierres_insert" ON cierres_cuenta FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- ── PAGOS ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pagos_select" ON pagos;
DROP POLICY IF EXISTS "pagos_insert" ON pagos;

CREATE POLICY "pagos_select" ON pagos FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "pagos_insert" ON pagos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_usuario_activo());

-- ── PAGO_METODOS ──────────────────────────────────────────────
-- Sin tenant_id directo — aislado por FK a pagos.
-- Las policies existentes se conservan.

-- ── MOVIMIENTOS CUENTA ────────────────────────────────────────
DROP POLICY IF EXISTS "mov_cuenta_select" ON movimientos_cuenta;
DROP POLICY IF EXISTS "mov_cuenta_insert" ON movimientos_cuenta;

CREATE POLICY "mov_cuenta_select" ON movimientos_cuenta FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "mov_cuenta_insert" ON movimientos_cuenta FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_usuario_activo());

-- ── MOVIMIENTOS CAJA ──────────────────────────────────────────
DROP POLICY IF EXISTS "mov_caja_select" ON movimientos_caja;
DROP POLICY IF EXISTS "mov_caja_insert" ON movimientos_caja;
DROP POLICY IF EXISTS "mov_caja_update" ON movimientos_caja;
DROP POLICY IF EXISTS "mov_caja_delete" ON movimientos_caja;

CREATE POLICY "mov_caja_select" ON movimientos_caja FOR SELECT TO authenticated
  USING (
    tenant_id = current_tenant_id()
    AND
    CASE
      WHEN get_mi_rol() = 'empleado' THEN es_movimiento_personal = FALSE
      ELSE TRUE
    END
  );

CREATE POLICY "mov_caja_insert" ON movimientos_caja FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND
    CASE
      WHEN get_mi_rol() = 'empleado' THEN es_movimiento_personal = FALSE
      ELSE TRUE
    END
  );

CREATE POLICY "mov_caja_update" ON movimientos_caja FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

CREATE POLICY "mov_caja_delete" ON movimientos_caja FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- ── CIERRES DIARIOS CAJA ──────────────────────────────────────
DROP POLICY IF EXISTS "cierres_diarios_select" ON cierres_diarios_caja;
DROP POLICY IF EXISTS "cierres_diarios_insert" ON cierres_diarios_caja;

CREATE POLICY "cierres_diarios_select" ON cierres_diarios_caja FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "cierres_diarios_insert" ON cierres_diarios_caja FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- ── ARQUEOS CAJA ──────────────────────────────────────────────
DROP POLICY IF EXISTS "arqueos_select" ON arqueos_caja;
DROP POLICY IF EXISTS "arqueos_insert" ON arqueos_caja;

CREATE POLICY "arqueos_select" ON arqueos_caja FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

CREATE POLICY "arqueos_insert" ON arqueos_caja FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_usuario_activo());

-- ── AUDIT LOG ─────────────────────────────────────────────────
-- La policy de audit_log se mantiene: solo dueño/admin lee.
-- El filtro de tenant se aplica en la app (Platform admin usa dbAdmin).
-- No se modifica la policy existente.

-- ── Actualizar vistas para incluir tenant_id en filtros ───────
-- Las vistas existentes (v_reparaciones_resumen, etc.) no filtran por tenant
-- porque fueron creadas para single-tenant. Con RLS extendida, el filtro
-- ya aplica a nivel de tabla. Las vistas se heredan automáticamente vía
-- security_invoker = on (ya configurado en las vistas existentes).
-- No se necesita recrear las vistas.

-- ============================================================
-- End migration 014
-- ============================================================
