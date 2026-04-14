-- ============================================================
-- 007_views.sql
-- Vistas seguras para el rol empleado
-- Excluyen columnas de costo y movimientos personales
-- Todas usan security_invoker = on para respetar RLS
-- ============================================================

-- --------------------------------------------------------
-- REPUESTOS SIN COSTOS
-- El empleado ve nombre, cantidad, ubicación pero NO el costo
-- --------------------------------------------------------
CREATE OR REPLACE VIEW v_repuestos_empleado AS
SELECT
    id,
    nombre,
    modelo_compatible,
    cantidad,
    cantidad_minima,
    ubicacion,
    created_at,
    updated_at
FROM repuestos;

ALTER VIEW v_repuestos_empleado SET (security_invoker = on);
GRANT SELECT ON v_repuestos_empleado TO authenticated;

-- --------------------------------------------------------
-- TELÉFONOS SIN DATOS SENSIBLES
-- Sin pendiente_de_costo (dato interno del dueño)
-- Sin join a costos_inventario
-- --------------------------------------------------------
CREATE OR REPLACE VIEW v_telefonos_empleado AS
SELECT
    t.id,
    t.imei,
    t.modelo,
    t.color,
    t.capacidad,
    t.estado_bateria,
    t.tipo,
    t.estado,
    t.consignante_id,
    t.precio_venta_ars,
    t.precio_venta_usd,
    t.fecha_venta,
    t.comprador_id,
    t.notas,
    t.created_by,
    t.created_at,
    t.updated_at
FROM telefonos t;

ALTER VIEW v_telefonos_empleado SET (security_invoker = on);
GRANT SELECT ON v_telefonos_empleado TO authenticated;

-- --------------------------------------------------------
-- REPUESTOS USADOS EN REPARACIÓN SIN COSTOS
-- El empleado ve qué repuesto se usó y cuánto,
-- pero NO el costo unitario snapshot
-- --------------------------------------------------------
CREATE OR REPLACE VIEW v_reparacion_repuestos_empleado AS
SELECT
    rr.id,
    rr.reparacion_id,
    rr.repuesto_id,
    rr.cantidad,
    rr.created_at,
    -- Join al nombre del repuesto para comodidad
    r.nombre AS repuesto_nombre
FROM reparacion_repuestos rr
JOIN repuestos r ON r.id = rr.repuesto_id;

ALTER VIEW v_reparacion_repuestos_empleado SET (security_invoker = on);
GRANT SELECT ON v_reparacion_repuestos_empleado TO authenticated;

-- --------------------------------------------------------
-- MOVIMIENTOS DE CAJA SIN PERSONALES
-- Filtra movimientos del dueño (aportes/retiros personales)
-- Belt-and-suspenders: RLS ya filtra, pero la vista es la interfaz principal
-- --------------------------------------------------------
CREATE OR REPLACE VIEW v_movimientos_caja_empleado AS
SELECT
    id,
    caja,
    tipo,
    monto,
    descripcion,
    pago_id,
    reparacion_id,
    created_by,
    created_at
FROM movimientos_caja
WHERE es_movimiento_personal = FALSE;

ALTER VIEW v_movimientos_caja_empleado SET (security_invoker = on);
GRANT SELECT ON v_movimientos_caja_empleado TO authenticated;

-- --------------------------------------------------------
-- VISTA RESUMEN: REPARACIONES CON DATOS DE CLIENTE
-- Útil para ambos roles (el empleado la usa todo el día)
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
    -- Datos del cliente
    c.nombre AS cliente_nombre,
    c.telefono AS cliente_telefono,
    c.tipo AS cliente_tipo,
    c.nombre_negocio AS cliente_negocio
FROM reparaciones r
JOIN clientes c ON c.id = r.cliente_id;

ALTER VIEW v_reparaciones_resumen SET (security_invoker = on);
GRANT SELECT ON v_reparaciones_resumen TO authenticated;

-- --------------------------------------------------------
-- VISTA: CUENTAS CORRIENTES CON DATOS DE CLIENTE
-- --------------------------------------------------------
CREATE OR REPLACE VIEW v_cuentas_corrientes_resumen AS
SELECT
    cc.id,
    cc.cliente_id,
    cc.saldo_ars,
    cc.saldo_usd,
    cc.updated_at,
    c.nombre AS cliente_nombre,
    c.tipo AS cliente_tipo,
    c.nombre_negocio,
    c.telefono AS cliente_telefono
FROM cuenta_corriente cc
JOIN clientes c ON c.id = cc.cliente_id;

ALTER VIEW v_cuentas_corrientes_resumen SET (security_invoker = on);
GRANT SELECT ON v_cuentas_corrientes_resumen TO authenticated;

-- --------------------------------------------------------
-- VISTA: RESUMEN DE CAJA DEL DÍA
-- Agrupa movimientos por caja y tipo para el día actual
-- --------------------------------------------------------
CREATE OR REPLACE VIEW v_resumen_caja_hoy AS
SELECT
    caja,
    tipo,
    COUNT(*) AS cantidad_movimientos,
    SUM(monto) AS total,
    (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS fecha
FROM movimientos_caja
WHERE (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date = (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
  AND (
      CASE
          WHEN (SELECT get_mi_rol()) = 'empleado' THEN es_movimiento_personal = FALSE
          ELSE TRUE
      END
  )
GROUP BY caja, tipo, (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

ALTER VIEW v_resumen_caja_hoy SET (security_invoker = on);
GRANT SELECT ON v_resumen_caja_hoy TO authenticated;

-- --------------------------------------------------------
-- VISTA: ALERTAS PARA EL DUEÑO
-- Stock bajo + pasamanos sin costo + equipos pendientes
-- (Solo tiene sentido para dueño, pero RLS en tablas base protege)
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

ALTER VIEW v_alertas_dueno SET (security_invoker = on);
GRANT SELECT ON v_alertas_dueno TO authenticated;
