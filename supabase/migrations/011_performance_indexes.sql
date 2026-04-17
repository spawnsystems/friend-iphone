-- ============================================================
-- 011_performance_indexes.sql
-- Índices de performance para queries frecuentes
-- Todos son CONCURRENTLY para no bloquear la DB en producción
-- ============================================================

-- ── reparaciones ──────────────────────────────────────────────

-- Dashboard: filtro por estado (recibido, en_reparacion, listo)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reparaciones_estado
  ON reparaciones(estado);

-- Dashboard: ordenamiento por fecha de ingreso
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reparaciones_fecha_ingreso
  ON reparaciones(fecha_ingreso DESC);

-- Dashboard combinado: estado + fecha (la query más frecuente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reparaciones_estado_fecha
  ON reparaciones(estado, fecha_ingreso DESC);

-- Detalle de reparación por cliente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reparaciones_cliente_id
  ON reparaciones(cliente_id);

-- ── clientes ──────────────────────────────────────────────────

-- Fetch de clientes activos (dropdown de nueva reparación)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientes_activo_nombre
  ON clientes(activo, nombre);

-- ── reparacion_repuestos ──────────────────────────────────────

-- Fetch de repuestos de una reparación (detail sheet)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rep_rep_reparacion_id
  ON reparacion_repuestos(reparacion_id);

-- Deducción de stock al marcar como listo (filtra descontado = false)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rep_rep_reparacion_descontado
  ON reparacion_repuestos(reparacion_id, descontado);

-- ── repuestos ─────────────────────────────────────────────────

-- Vista v_repuestos_con_disponible: JOIN por repuesto_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rep_rep_repuesto_id
  ON reparacion_repuestos(repuesto_id);

-- Alertas de stock bajo (cantidad <= cantidad_minima)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_repuestos_stock_alerta
  ON repuestos(cantidad, cantidad_minima);

-- ── telefonos ─────────────────────────────────────────────────

-- Alertas de pasamanos sin costo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_telefonos_pendiente_costo
  ON telefonos(pendiente_de_costo)
  WHERE pendiente_de_costo = TRUE;

-- ============================================================
-- End migration 011
-- ============================================================
