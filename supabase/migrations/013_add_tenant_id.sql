-- ============================================================
-- 013_add_tenant_id.sql
-- Agrega tenant_id a todas las tablas de negocio.
-- Como es greenfield (no hay data), se pueden agregar como NOT NULL
-- con DEFAULT (se llena con el seed del tenant "Friend iPhone").
--
-- IMPORTANTE: Correr DESPUÉS de 012 (que crea la tabla tenants)
-- y DESPUÉS del seed que crea el primer tenant.
-- El DEFAULT se especifica en el ALTER y puede removerse después.
-- ============================================================

-- ── Función auxiliar: obtener tenant default para el seed ─────
-- Se usa como DEFAULT temporario durante la migración.
-- Se remueve al final de esta misma migración.

CREATE OR REPLACE FUNCTION _get_default_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM tenants LIMIT 1;
$$;

-- ── clientes ──────────────────────────────────────────────────
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE clientes SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE clientes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id, activo, nombre);

-- ── cuenta_corriente ──────────────────────────────────────────
ALTER TABLE cuenta_corriente
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE cuenta_corriente SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE cuenta_corriente ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cta_cte_tenant ON cuenta_corriente(tenant_id);

-- ── repuestos ─────────────────────────────────────────────────
ALTER TABLE repuestos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE repuestos SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE repuestos ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_repuestos_tenant ON repuestos(tenant_id);

-- ── telefonos ─────────────────────────────────────────────────
ALTER TABLE telefonos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE telefonos SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE telefonos ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_telefonos_tenant ON telefonos(tenant_id, estado);

-- ── costos_inventario ─────────────────────────────────────────
ALTER TABLE costos_inventario
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE costos_inventario SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE costos_inventario ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_costos_tenant ON costos_inventario(tenant_id);

-- ── cotizaciones ──────────────────────────────────────────────
ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE cotizaciones SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE cotizaciones ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cotizaciones_tenant ON cotizaciones(tenant_id, moneda_tipo, created_at DESC);

-- ── reparaciones ──────────────────────────────────────────────
ALTER TABLE reparaciones
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE reparaciones SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE reparaciones ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reparaciones_tenant       ON reparaciones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reparaciones_tenant_estado ON reparaciones(tenant_id, estado, fecha_ingreso DESC);

-- ── reparacion_repuestos ──────────────────────────────────────
-- Esta tabla no tiene tenant_id directo: se filtra a través de reparacion_id
-- (que sí tiene tenant_id). No se le agrega tenant_id para evitar redundancia.
-- El aislamiento se garantiza por la FK a reparaciones + RLS de reparaciones.

-- ── cierres_cuenta ────────────────────────────────────────────
ALTER TABLE cierres_cuenta
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE cierres_cuenta SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE cierres_cuenta ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cierres_cuenta_tenant ON cierres_cuenta(tenant_id);

-- ── pagos ─────────────────────────────────────────────────────
ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE pagos SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE pagos ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagos_tenant ON pagos(tenant_id, created_at DESC);

-- ── movimientos_cuenta ────────────────────────────────────────
ALTER TABLE movimientos_cuenta
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE movimientos_cuenta SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE movimientos_cuenta ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mov_cuenta_tenant ON movimientos_cuenta(tenant_id);

-- ── movimientos_caja ──────────────────────────────────────────
ALTER TABLE movimientos_caja
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE movimientos_caja SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE movimientos_caja ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mov_caja_tenant ON movimientos_caja(tenant_id, caja, created_at DESC);

-- ── cierres_diarios_caja ──────────────────────────────────────
ALTER TABLE cierres_diarios_caja
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE cierres_diarios_caja SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE cierres_diarios_caja ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cierres_diarios_tenant ON cierres_diarios_caja(tenant_id, fecha DESC);

-- ── arqueos_caja ──────────────────────────────────────────────
ALTER TABLE arqueos_caja
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE RESTRICT;

UPDATE arqueos_caja SET tenant_id = _get_default_tenant_id() WHERE tenant_id IS NULL;
ALTER TABLE arqueos_caja ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_arqueos_tenant ON arqueos_caja(tenant_id, fecha DESC);

-- ── audit_log — tenant_id opcional ───────────────────────────
ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- audit_log puede tener eventos de plataforma (sin tenant), por eso es nullable
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;

-- ── Limpiar función auxiliar ──────────────────────────────────
DROP FUNCTION IF EXISTS _get_default_tenant_id();

-- ============================================================
-- End migration 013
-- ============================================================
