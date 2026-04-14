-- ============================================================
-- 004_rls_policies.sql
-- Row Level Security para todas las tablas
-- ============================================================

-- ========== USUARIOS ==========
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_select" ON usuarios
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

CREATE POLICY "usuarios_insert" ON usuarios
    FOR INSERT TO authenticated
    WITH CHECK (es_dueno_o_admin());

CREATE POLICY "usuarios_update" ON usuarios
    FOR UPDATE TO authenticated
    USING (es_dueno_o_admin());

-- ========== CLIENTES ==========
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select" ON clientes
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

CREATE POLICY "clientes_insert" ON clientes
    FOR INSERT TO authenticated
    WITH CHECK (es_usuario_activo());

CREATE POLICY "clientes_update" ON clientes
    FOR UPDATE TO authenticated
    USING (es_usuario_activo());

-- ========== CUENTA CORRIENTE ==========
ALTER TABLE cuenta_corriente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cta_cte_select" ON cuenta_corriente
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

-- Solo dueño/admin crean cuentas corrientes
CREATE POLICY "cta_cte_insert" ON cuenta_corriente
    FOR INSERT TO authenticated
    WITH CHECK (es_dueno_o_admin());

-- Saldo se actualiza por trigger, no directamente
CREATE POLICY "cta_cte_update" ON cuenta_corriente
    FOR UPDATE TO authenticated
    USING (es_dueno_o_admin());

-- ========== REPUESTOS ==========
ALTER TABLE repuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repuestos_select" ON repuestos
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

-- Solo dueño carga repuestos
CREATE POLICY "repuestos_insert" ON repuestos
    FOR INSERT TO authenticated
    WITH CHECK (es_dueno_o_admin());

CREATE POLICY "repuestos_update" ON repuestos
    FOR UPDATE TO authenticated
    USING (es_dueno_o_admin());

-- ========== TELEFONOS ==========
ALTER TABLE telefonos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telefonos_select" ON telefonos
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

CREATE POLICY "telefonos_insert" ON telefonos
    FOR INSERT TO authenticated
    WITH CHECK (es_usuario_activo());

CREATE POLICY "telefonos_update" ON telefonos
    FOR UPDATE TO authenticated
    USING (es_usuario_activo());

-- ========== COSTOS INVENTARIO — BLOQUEADO PARA EMPLEADOS ==========
ALTER TABLE costos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "costos_select" ON costos_inventario
    FOR SELECT TO authenticated
    USING (es_dueno_o_admin());

CREATE POLICY "costos_insert" ON costos_inventario
    FOR INSERT TO authenticated
    WITH CHECK (es_dueno_o_admin());

CREATE POLICY "costos_update" ON costos_inventario
    FOR UPDATE TO authenticated
    USING (es_dueno_o_admin());

CREATE POLICY "costos_delete" ON costos_inventario
    FOR DELETE TO authenticated
    USING (es_dueno_o_admin());

-- ========== COTIZACIONES ==========
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer la cotización actual
CREATE POLICY "cotizaciones_select" ON cotizaciones
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

-- Solo dueño/admin cargan cotizaciones
CREATE POLICY "cotizaciones_insert" ON cotizaciones
    FOR INSERT TO authenticated
    WITH CHECK (es_dueno_o_admin());

-- ========== REPARACIONES ==========
ALTER TABLE reparaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reparaciones_select" ON reparaciones
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

CREATE POLICY "reparaciones_insert" ON reparaciones
    FOR INSERT TO authenticated
    WITH CHECK (es_usuario_activo());

CREATE POLICY "reparaciones_update" ON reparaciones
    FOR UPDATE TO authenticated
    USING (es_usuario_activo());

-- ========== REPARACION_REPUESTOS ==========
ALTER TABLE reparacion_repuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rep_repuestos_select" ON reparacion_repuestos
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

CREATE POLICY "rep_repuestos_insert" ON reparacion_repuestos
    FOR INSERT TO authenticated
    WITH CHECK (es_usuario_activo());

-- ========== CIERRES DE CUENTA ==========
ALTER TABLE cierres_cuenta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cierres_select" ON cierres_cuenta
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

-- Solo dueño/admin pueden cerrar cuentas
CREATE POLICY "cierres_insert" ON cierres_cuenta
    FOR INSERT TO authenticated
    WITH CHECK (es_dueno_o_admin());

-- ========== PAGOS ==========
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagos_select" ON pagos
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

CREATE POLICY "pagos_insert" ON pagos
    FOR INSERT TO authenticated
    WITH CHECK (es_usuario_activo());

-- ========== PAGO_METODOS ==========
ALTER TABLE pago_metodos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pago_metodos_select" ON pago_metodos
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

CREATE POLICY "pago_metodos_insert" ON pago_metodos
    FOR INSERT TO authenticated
    WITH CHECK (es_usuario_activo());

-- ========== MOVIMIENTOS CUENTA CORRIENTE ==========
ALTER TABLE movimientos_cuenta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mov_cuenta_select" ON movimientos_cuenta
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

CREATE POLICY "mov_cuenta_insert" ON movimientos_cuenta
    FOR INSERT TO authenticated
    WITH CHECK (es_usuario_activo());

-- ========== MOVIMIENTOS DE CAJA — Movimientos personales ocultos para empleados ==========
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;

-- Empleados solo ven movimientos NO personales
CREATE POLICY "mov_caja_select" ON movimientos_caja
    FOR SELECT TO authenticated
    USING (
        CASE
            WHEN get_mi_rol() = 'empleado' THEN es_movimiento_personal = FALSE
            ELSE TRUE
        END
    );

-- Empleados solo pueden crear movimientos NO personales
CREATE POLICY "mov_caja_insert" ON movimientos_caja
    FOR INSERT TO authenticated
    WITH CHECK (
        CASE
            WHEN get_mi_rol() = 'empleado' THEN es_movimiento_personal = FALSE
            ELSE TRUE
        END
    );

-- Solo dueño/admin pueden modificar movimientos (sujeto a trigger de cierre diario)
CREATE POLICY "mov_caja_update" ON movimientos_caja
    FOR UPDATE TO authenticated
    USING (es_dueno_o_admin());

CREATE POLICY "mov_caja_delete" ON movimientos_caja
    FOR DELETE TO authenticated
    USING (es_dueno_o_admin());

-- ========== CIERRES DIARIOS DE CAJA ==========
ALTER TABLE cierres_diarios_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cierres_diarios_select" ON cierres_diarios_caja
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

-- Solo dueño/admin cierran la caja del día
CREATE POLICY "cierres_diarios_insert" ON cierres_diarios_caja
    FOR INSERT TO authenticated
    WITH CHECK (es_dueno_o_admin());

-- ========== ARQUEOS DE CAJA ==========
ALTER TABLE arqueos_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arqueos_select" ON arqueos_caja
    FOR SELECT TO authenticated
    USING (es_usuario_activo());

-- Empleado puede hacer el arqueo (cuenta la plata)
CREATE POLICY "arqueos_insert" ON arqueos_caja
    FOR INSERT TO authenticated
    WITH CHECK (es_usuario_activo());

-- ========== AUDIT LOG — Solo dueño/admin leen ==========
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON audit_log
    FOR SELECT TO authenticated
    USING (es_dueno_o_admin());

-- INSERT se hace por trigger SECURITY DEFINER, no necesita policy directa
