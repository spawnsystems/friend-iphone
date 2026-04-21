-- ============================================================
-- 016_lotes_y_gremio.sql
--
-- Agrega soporte para:
--   1. Lotes de ingreso: N reparaciones agrupadas (Gremio / Franquicia)
--   2. Precios Gremio: tabla de costos/precios fijos por (modelo, tipo_reparación)
--   3. Nuevas columnas en reparaciones: lote_id, precio_gremio_id, precio_venta_franquicia_ars
--   4. cierre_lotes: junction para cerrar cuentas por lote específico
--   5. Vistas de resumen
--   6. RLS, triggers de audit y updated_at
-- ============================================================

BEGIN;

-- ── 1. TABLA lotes ────────────────────────────────────────────
-- Un lote agrupa N reparaciones del mismo cliente ingresadas juntas.
-- numero es auto-secuencial por tenant (ver fn_next_lote_numero).
-- estado 'abierto': aún se pueden agregar/editar reparaciones.
-- estado 'cerrado': lote liquidado, cuenta corriente afectada.

CREATE TABLE lotes (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id)  ON DELETE CASCADE,
  numero      INT          NOT NULL,
  cliente_id  UUID         NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  fecha       DATE         NOT NULL DEFAULT CURRENT_DATE,
  estado      TEXT         NOT NULL DEFAULT 'abierto'
              CHECK (estado IN ('abierto', 'cerrado')),
  notas       TEXT,
  created_by  UUID         REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, numero)
);

CREATE INDEX idx_lotes_tenant_cliente ON lotes (tenant_id, cliente_id);
CREATE INDEX idx_lotes_tenant_estado  ON lotes (tenant_id, estado);
CREATE INDEX idx_lotes_tenant_fecha   ON lotes (tenant_id, fecha DESC);

-- ── 2. TABLA precios_gremio ───────────────────────────────────
-- Lista de costos y precios fijos para clientes Gremio.
-- Indexada por (modelo, tipo_reparacion); repuesto_id es referencia sugerida
-- al stock (no obligatoria — puede ser un insumo externo).
-- Solo dueno/admin puede escribir; todos los miembros pueden leer.

CREATE TABLE precios_gremio (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  modelo           TEXT           NOT NULL,        -- ej: 'iPhone 14 Pro', 'Todos'
  tipo_reparacion  TEXT           NOT NULL,        -- ej: 'Cambio de pantalla'
  repuesto_id      UUID           REFERENCES repuestos(id) ON DELETE SET NULL,
  costo_ars        NUMERIC(14,2)  NOT NULL DEFAULT 0,
  precio_ars       NUMERIC(14,2)  NOT NULL DEFAULT 0,
  activo           BOOLEAN        NOT NULL DEFAULT TRUE,
  updated_by       UUID           REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, modelo, tipo_reparacion)
);

CREATE INDEX idx_precios_gremio_tenant_activo ON precios_gremio (tenant_id, activo);
CREATE INDEX idx_precios_gremio_modelo        ON precios_gremio (tenant_id, modelo);

-- ── 3. NUEVAS COLUMNAS en reparaciones ────────────────────────
-- lote_id:                     Lote al que pertenece (NULL = ingreso individual).
-- precio_gremio_id:            Precio Gremio aplicado al momento del ingreso
--                              (snapshot de referencia, no se recalcula).
-- precio_venta_franquicia_ars: Lo que el cliente Franquicia cobró a su propio
--                              cliente. Necesario para calcular el split.
--                              ganancia = precio_venta_franquicia - costos_repuestos
--                              taller_cut = ganancia × split%

ALTER TABLE reparaciones
  ADD COLUMN lote_id                     UUID          REFERENCES lotes(id)         ON DELETE SET NULL,
  ADD COLUMN precio_gremio_id            UUID          REFERENCES precios_gremio(id) ON DELETE SET NULL,
  ADD COLUMN precio_venta_franquicia_ars NUMERIC(14,2);

CREATE INDEX idx_reparaciones_lote          ON reparaciones (lote_id)          WHERE lote_id          IS NOT NULL;
CREATE INDEX idx_reparaciones_precio_gremio ON reparaciones (precio_gremio_id) WHERE precio_gremio_id IS NOT NULL;

-- ── 4. TABLA cierre_lotes ─────────────────────────────────────
-- Junction: un cierre de cuenta puede cubrir N lotes específicos.
-- Si cierre_id no tiene filas en cierre_lotes → cierre por período (comportamiento actual).
-- Si tiene filas → cierre de esos lotes puntuales.

CREATE TABLE cierre_lotes (
  cierre_id  UUID  NOT NULL REFERENCES cierres_cuenta(id) ON DELETE CASCADE,
  lote_id    UUID  NOT NULL REFERENCES lotes(id)          ON DELETE CASCADE,
  PRIMARY KEY (cierre_id, lote_id)
);

CREATE INDEX idx_cierre_lotes_lote   ON cierre_lotes (lote_id);
CREATE INDEX idx_cierre_lotes_cierre ON cierre_lotes (cierre_id);

-- ── 5. FUNCIÓN: siguiente número de lote ─────────────────────
-- Usada dentro de una transacción en el server action para asignar
-- el próximo número secuencial sin gaps. La constraint UNIQUE en
-- (tenant_id, numero) actúa como red de seguridad ante race conditions.

CREATE OR REPLACE FUNCTION fn_next_lote_numero(p_tenant_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero INT;
BEGIN
  -- Lock de fila para serializar inserts concurrentes del mismo tenant
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text));
  SELECT COALESCE(MAX(numero), 0) + 1
  INTO   v_numero
  FROM   lotes
  WHERE  tenant_id = p_tenant_id;
  RETURN v_numero;
END;
$$;

-- ── 6. FUNCIÓN updated_at genérica ───────────────────────────
-- Las tablas existentes manejan updated_at en sus propios triggers.
-- Esta función es para las tablas nuevas de esta migración.

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 7. VISTAS ────────────────────────────────────────────────

-- v_lotes_resumen
-- Resumen de lotes con datos del cliente, conteos por estado y totales.
-- security_invoker = true → respeta RLS del usuario que consulta.
-- El WHERE tenant_id = current_tenant_id() es una capa extra defensiva.

CREATE OR REPLACE VIEW v_lotes_resumen
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.tenant_id,
  l.numero,
  l.cliente_id,
  l.fecha,
  l.estado,
  l.notas,
  l.created_by,
  l.created_at,
  l.updated_at,

  -- Datos del cliente
  c.nombre                            AS cliente_nombre,
  c.nombre_negocio                    AS cliente_nombre_negocio,
  c.tipo                              AS cliente_tipo,

  -- Quién creó el lote
  u.nombre                            AS creado_por_nombre,

  -- Conteo total de reparaciones en el lote
  COUNT(r.id)                         AS total_reparaciones,

  -- Conteos por estado
  COUNT(r.id) FILTER (WHERE r.estado = 'recibido')      AS cant_recibidas,
  COUNT(r.id) FILTER (WHERE r.estado = 'en_reparacion') AS cant_en_reparacion,
  COUNT(r.id) FILTER (WHERE r.estado = 'listo')         AS cant_listas,
  COUNT(r.id) FILTER (WHERE r.estado = 'entregado')     AS cant_entregadas,
  COUNT(r.id) FILTER (WHERE r.estado = 'cancelado')     AS cant_canceladas,

  -- Totales económicos (excluye canceladas)
  COALESCE(SUM(r.precio_cliente_ars) FILTER (WHERE r.estado <> 'cancelado'), 0) AS total_precio_ars,
  COALESCE(SUM(r.precio_cliente_usd) FILTER (WHERE r.estado <> 'cancelado'), 0) AS total_precio_usd,

  -- Franquicia: suma de precios de venta (para mostrar el "volumen" del lote)
  COALESCE(SUM(r.precio_venta_franquicia_ars) FILTER (WHERE r.estado <> 'cancelado'), 0) AS total_venta_franquicia_ars,

  -- true cuando todas las reparaciones tienen estado final (entregado o cancelado)
  BOOL_AND(r.estado IN ('entregado', 'cancelado'))      AS todas_finalizadas

FROM  lotes        l
JOIN  clientes     c ON c.id = l.cliente_id
LEFT JOIN reparaciones r ON r.lote_id   = l.id
LEFT JOIN usuarios     u ON u.id        = l.created_by
WHERE l.tenant_id = current_tenant_id()
GROUP BY l.id, c.nombre, c.nombre_negocio, c.tipo, u.nombre;

-- v_precios_gremio_activos
-- Lista de precios activos con nombre del repuesto y quién lo actualizó por última vez.

CREATE OR REPLACE VIEW v_precios_gremio_activos
WITH (security_invoker = true)
AS
SELECT
  pg.id,
  pg.tenant_id,
  pg.modelo,
  pg.tipo_reparacion,
  pg.repuesto_id,
  rep.nombre        AS repuesto_nombre,
  pg.costo_ars,
  pg.precio_ars,
  pg.activo,
  pg.updated_at,
  u.nombre          AS actualizado_por
FROM  precios_gremio pg
LEFT JOIN repuestos rep ON rep.id = pg.repuesto_id
LEFT JOIN usuarios    u ON u.id  = pg.updated_by
WHERE pg.activo     = TRUE
  AND pg.tenant_id  = current_tenant_id();

-- v_reparaciones_lote
-- Reparaciones con su contexto de lote + datos del cliente.
-- Útil para mostrar el detalle de un lote específico.

CREATE OR REPLACE VIEW v_reparaciones_lote
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.tenant_id,
  r.lote_id,
  r.cliente_id,
  r.imei,
  r.modelo,
  r.descripcion_problema,
  r.tipo_servicio,
  r.estado,
  r.precio_cliente_ars,
  r.precio_cliente_usd,
  r.precio_venta_franquicia_ars,
  r.franquicia_split_override,
  r.precio_gremio_id,
  r.presupuesto_aprobado,
  r.diagnostico,
  r.notas_internas,
  r.fecha_ingreso,
  r.fecha_listo,
  r.fecha_entrega,
  r.created_at,
  r.updated_at,

  -- Datos del cliente
  c.nombre                  AS cliente_nombre,
  c.nombre_negocio          AS cliente_nombre_negocio,
  c.tipo                    AS cliente_tipo,
  c.franquicia_split        AS cliente_split_default,

  -- Precio Gremio aplicado (snapshot al momento del ingreso)
  pg.tipo_reparacion        AS gremio_tipo_reparacion,
  pg.costo_ars              AS gremio_costo_ars,
  pg.precio_ars             AS gremio_precio_ars,

  -- Quién la creó
  u.nombre                  AS creado_por_nombre

FROM  reparaciones   r
JOIN  clientes       c  ON c.id  = r.cliente_id
LEFT JOIN precios_gremio pg ON pg.id = r.precio_gremio_id
LEFT JOIN usuarios       u  ON u.id  = r.created_by
WHERE r.tenant_id = current_tenant_id();

-- ── 8. RLS ────────────────────────────────────────────────────
-- Patrón del proyecto: TO authenticated + es_usuario_activo() en SELECT/INSERT.
-- Escritura de datos sensibles restringida a es_dueno_o_admin().

ALTER TABLE lotes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios_gremio ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierre_lotes   ENABLE ROW LEVEL SECURITY;

-- lotes ────────────────────────────────────────────────────────
-- Lectura: cualquier miembro activo del tenant
CREATE POLICY "lotes_select" ON lotes FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

-- Insertar: cualquier miembro activo (el empleado puede ingresar lotes)
CREATE POLICY "lotes_insert" ON lotes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_usuario_activo());

-- Actualizar: solo dueno/admin (cerrar un lote es una operación financiera)
CREATE POLICY "lotes_update" ON lotes FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- No se permite DELETE de lotes (los datos son inmutables una vez cerrados)

-- precios_gremio ───────────────────────────────────────────────
-- Lectura: cualquier miembro activo (necesitan los precios al crear reparaciones)
CREATE POLICY "precios_gremio_select" ON precios_gremio FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND es_usuario_activo());

-- Escritura: solo dueno/admin
CREATE POLICY "precios_gremio_insert" ON precios_gremio FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id() AND es_dueno_o_admin());

CREATE POLICY "precios_gremio_update" ON precios_gremio FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

CREATE POLICY "precios_gremio_delete" ON precios_gremio FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id() AND es_dueno_o_admin());

-- cierre_lotes ─────────────────────────────────────────────────
-- Lectura: cualquier miembro activo del tenant (via cierres_cuenta)
CREATE POLICY "cierre_lotes_select" ON cierre_lotes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cierres_cuenta cc
      WHERE  cc.id        = cierre_lotes.cierre_id
        AND  cc.tenant_id = current_tenant_id()
    )
    AND es_usuario_activo()
  );

-- Escritura: solo dueno/admin (crear/cerrar un cierre es financiero)
CREATE POLICY "cierre_lotes_insert" ON cierre_lotes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cierres_cuenta cc
      WHERE  cc.id        = cierre_lotes.cierre_id
        AND  cc.tenant_id = current_tenant_id()
    )
    AND es_dueno_o_admin()
  );

CREATE POLICY "cierre_lotes_delete" ON cierre_lotes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cierres_cuenta cc
      WHERE  cc.id        = cierre_lotes.cierre_id
        AND  cc.tenant_id = current_tenant_id()
    )
    AND es_dueno_o_admin()
  );

-- ── 9. TRIGGERS updated_at ───────────────────────────────────

CREATE TRIGGER trg_lotes_updated_at
  BEFORE UPDATE ON lotes
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_precios_gremio_updated_at
  BEFORE UPDATE ON precios_gremio
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── 10. TRIGGERS audit_log ───────────────────────────────────

CREATE TRIGGER trg_audit_lotes
  AFTER INSERT OR UPDATE OR DELETE ON lotes
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_precios_gremio
  AFTER INSERT OR UPDATE OR DELETE ON precios_gremio
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ── 11. ACTUALIZAR v_reparaciones_resumen ────────────────────
-- Agrega lote_id + lote_numero para mostrar badges en repair cards.

CREATE OR REPLACE VIEW v_reparaciones_resumen AS
SELECT
    r.id,
    r.imei,
    r.modelo,
    r.descripcion_problema,
    r.estado,
    r.tipo_servicio,
    r.precio_cliente_ars,
    r.precio_cliente_usd,
    r.presupuesto_aprobado,
    r.fecha_ingreso,
    r.fecha_listo,
    r.fecha_entrega,
    r.diagnostico,
    r.notas_internas,
    r.created_at,
    -- Lote (NULL si ingreso individual)
    r.lote_id,
    l.numero AS lote_numero,
    -- Datos del cliente
    c.nombre        AS cliente_nombre,
    c.telefono      AS cliente_telefono,
    c.tipo          AS cliente_tipo,
    c.nombre_negocio AS cliente_negocio
FROM reparaciones r
JOIN  clientes c ON c.id = r.cliente_id
LEFT JOIN lotes l ON l.id = r.lote_id;

ALTER VIEW v_reparaciones_resumen SET (security_invoker = on);
GRANT SELECT ON v_reparaciones_resumen TO authenticated;

COMMIT;
