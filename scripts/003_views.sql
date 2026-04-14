-- ============================================================
-- 003_views.sql
-- Vistas seguras para el rol empleado
-- ============================================================

-- --------------------------------------------------------
-- VISTA RESUMEN: REPARACIONES CON DATOS DE CLIENTE
-- --------------------------------------------------------
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
    c.nombre AS cliente_nombre,
    c.telefono AS cliente_telefono,
    c.tipo AS cliente_tipo,
    c.nombre_negocio AS cliente_negocio
FROM reparaciones r
JOIN clientes c ON c.id = r.cliente_id;

GRANT SELECT ON v_reparaciones_resumen TO authenticated;

-- --------------------------------------------------------
-- VISTA: ALERTAS PARA EL DUEÑO
-- --------------------------------------------------------
CREATE OR REPLACE VIEW v_alertas_dueno AS

-- Repuestos con stock bajo
SELECT
    'stock_bajo' AS tipo_alerta,
    r.id AS referencia_id,
    r.nombre || ' — Stock: ' || r.cantidad || ' (mín: ' || r.cantidad_minima || ')' AS mensaje,
    r.updated_at AS fecha
FROM repuestos r
WHERE r.cantidad <= r.cantidad_minima

UNION ALL

-- Teléfonos pasamanos sin costo cargado
SELECT
    'pasamanos_sin_costo' AS tipo_alerta,
    t.id AS referencia_id,
    t.modelo || ' (IMEI: ' || t.imei || ') — Falta cargar costo' AS mensaje,
    t.created_at AS fecha
FROM telefonos t
WHERE t.pendiente_de_costo = TRUE

UNION ALL

-- Reparaciones en estado "recibido" hace más de 48hs sin presupuesto
SELECT
    'sin_presupuesto' AS tipo_alerta,
    r.id AS referencia_id,
    r.modelo || ' — Sin presupuesto desde ' || TO_CHAR(r.fecha_ingreso, 'DD/MM HH24:MI') AS mensaje,
    r.fecha_ingreso AS fecha
FROM reparaciones r
WHERE r.estado = 'recibido'
  AND r.presupuesto_aprobado = FALSE
  AND r.fecha_ingreso < NOW() - INTERVAL '48 hours';

GRANT SELECT ON v_alertas_dueno TO authenticated;
