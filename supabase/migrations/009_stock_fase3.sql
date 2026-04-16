-- ============================================================
-- 009_stock_fase3.sql
-- Stock enhancements for Phase 3
-- - New enums: categoria_repuesto, condicion_telefono
-- - Update repuestos: category, multi-model compatibility, cost
-- - Update telefonos: condicion, origen, reserva link
-- - New table: reparacion_repuestos (junction)
-- - New view: v_repuestos_con_disponible
-- ============================================================

-- ── Nuevos enums ─────────────────────────────────────────────

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

CREATE TYPE condicion_telefono AS ENUM (
  'nuevo',
  'como_nuevo',
  'muy_bueno',
  'bueno',
  'regular',
  'para_repuesto'
);

-- Agregar 'reservado' al enum existente de estado_telefono
ALTER TYPE estado_telefono ADD VALUE IF NOT EXISTS 'reservado';

-- ── Modificar tabla repuestos ─────────────────────────────────

-- Renombrar modelo_compatible → modelos_compatibles
ALTER TABLE repuestos RENAME COLUMN modelo_compatible TO modelos_compatibles;

ALTER TABLE repuestos
  ADD COLUMN categoria      categoria_repuesto,
  ADD COLUMN variante       TEXT,
  ADD COLUMN costo_unitario NUMERIC(10,2);

-- ── Modificar tabla telefonos ─────────────────────────────────

ALTER TABLE telefonos
  ADD COLUMN condicion          condicion_telefono,
  ADD COLUMN origen             TEXT
    CHECK (origen IN ('compra_directa', 'trade_in', 'consignacion', 'pasamanos')),
  ADD COLUMN orden_venta_origen TEXT,
  ADD COLUMN cliente_reserva_id UUID REFERENCES clientes(id);

-- ── Nueva tabla: reparacion_repuestos ─────────────────────────
-- Junction table linking repairs to parts used.
-- descontado = false while repair is active (stock reserved but not deducted)
-- descontado = true  once repair reaches 'listo' (stock formally deducted)

CREATE TABLE reparacion_repuestos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reparacion_id UUID        NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
  repuesto_id   UUID        NOT NULL REFERENCES repuestos(id)    ON DELETE RESTRICT,
  cantidad      INT         NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  descontado    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reparacion_repuesto UNIQUE (reparacion_id, repuesto_id)
);

CREATE INDEX idx_rep_rep_reparacion ON reparacion_repuestos(reparacion_id);
CREATE INDEX idx_rep_rep_repuesto   ON reparacion_repuestos(repuesto_id);

-- ── RLS para reparacion_repuestos ─────────────────────────────

ALTER TABLE reparacion_repuestos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados_select_rep_rep"
  ON reparacion_repuestos FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticados_insert_rep_rep"
  ON reparacion_repuestos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "autenticados_update_rep_rep"
  ON reparacion_repuestos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "autenticados_delete_rep_rep"
  ON reparacion_repuestos FOR DELETE TO authenticated USING (true);

-- ── View: repuestos con disponibilidad real ───────────────────
-- cantidad_disponible = cantidad total − lo reservado en reparaciones activas (no descontadas)

CREATE OR REPLACE VIEW v_repuestos_con_disponible AS
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
