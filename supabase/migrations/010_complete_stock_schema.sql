-- ============================================================
-- 010_complete_stock_schema.sql
-- Complete Phase 3 stock schema fixes
-- - Add missing enums: categoria_repuesto, condicion_telefono
-- - Fix reparacion_repuestos: add descontado column
-- - Add missing columns to repuestos and telefonos
-- - Create v_repuestos_con_disponible view
-- ============================================================

-- ── Nuevos enums ─────────────────────────────────────────────

-- Create categoria_repuesto enum if it doesn't exist
DO $$
BEGIN
  CREATE TYPE categoria_repuesto AS ENUM (
    'auricular',
    'sensor_proximidad',
    'flex_carga',
    'parlante',
    'vibrador',
    'lector_sim',
    'bateria',
    'tapa_sin_anclaje',
    'tapa_con_anclaje',
    'modulo_generico',
    'modulo_original',
    'vidrio_oca',
    'camara_trasera',
    'camara_selfie',
    'lente_camara',
    'chapitas'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create condicion_telefono enum if it doesn't exist
DO $$
BEGIN
  CREATE TYPE condicion_telefono AS ENUM (
    'nuevo',
    'como_nuevo',
    'muy_bueno',
    'bueno',
    'regular',
    'para_repuesto'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add 'reservado' to estado_telefono enum if it doesn't exist
DO $$
BEGIN
  ALTER TYPE estado_telefono ADD VALUE IF NOT EXISTS 'reservado';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Fix reparacion_repuestos table ────────────────────────────
-- Add descontado column if it doesn't exist
-- This tracks whether stock has been deducted from the repair
ALTER TABLE reparacion_repuestos
  ADD COLUMN IF NOT EXISTS descontado BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Update repuestos table ───────────────────────────────────

-- Rename modelo_compatible to modelos_compatibles if needed
DO $$
BEGIN
  ALTER TABLE repuestos RENAME COLUMN modelo_compatible TO modelos_compatibles;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN duplicate_column THEN NULL;
END $$;

-- Add missing columns to repuestos if they don't exist
ALTER TABLE repuestos
  ADD COLUMN IF NOT EXISTS categoria categoria_repuesto,
  ADD COLUMN IF NOT EXISTS variante TEXT,
  ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(10,2);

-- ── Update telefonos table ────────────────────────────────────

ALTER TABLE telefonos
  ADD COLUMN IF NOT EXISTS condicion condicion_telefono,
  ADD COLUMN IF NOT EXISTS origen TEXT CHECK (origen IN ('compra_directa', 'trade_in', 'consignacion', 'pasamanos')),
  ADD COLUMN IF NOT EXISTS orden_venta_origen TEXT,
  ADD COLUMN IF NOT EXISTS cliente_reserva_id UUID REFERENCES clientes(id);

-- ── RLS para reparacion_repuestos ─────────────────────────────
-- Las policies de la migración 009 nunca se aplicaron porque la tabla ya existía.
-- Habilitamos RLS y creamos todas las policies idempotentemente.

ALTER TABLE reparacion_repuestos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "autenticados_select_rep_rep"
    ON reparacion_repuestos FOR SELECT TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "autenticados_insert_rep_rep"
    ON reparacion_repuestos FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "autenticados_update_rep_rep"
    ON reparacion_repuestos FOR UPDATE TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "autenticados_delete_rep_rep"
    ON reparacion_repuestos FOR DELETE TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── View: repuestos con disponibilidad real ────────────────────
-- cantidad_disponible = cantidad total − lo reservado en reparaciones activas (no descontadas)
-- Drop existing view if it exists to recreate it
DROP VIEW IF EXISTS v_repuestos_con_disponible;

CREATE VIEW v_repuestos_con_disponible AS
SELECT
  r.*,
  COALESCE((
    SELECT SUM(rr.cantidad)
    FROM   reparacion_repuestos rr
    JOIN   reparaciones         rep ON rep.id = rr.reparacion_id
    WHERE  rr.repuesto_id = r.id
      AND  rr.descontado  = FALSE
      AND  rep.estado     IN ('recibido', 'en_reparacion')
  ), 0) AS cantidad_reservada,
  r.cantidad - COALESCE((
    SELECT SUM(rr.cantidad)
    FROM   reparacion_repuestos rr
    JOIN   reparaciones         rep ON rep.id = rr.reparacion_id
    WHERE  rr.repuesto_id = r.id
      AND  rr.descontado  = FALSE
      AND  rep.estado     IN ('recibido', 'en_reparacion')
  ), 0) AS cantidad_disponible
FROM repuestos r;

ALTER VIEW v_repuestos_con_disponible SET (security_invoker = on);
GRANT SELECT ON v_repuestos_con_disponible TO authenticated;

-- ============================================================
-- End migration 010
-- ============================================================
