-- ============================================================
-- 006_rpc_functions.sql
-- Funciones RPC llamadas desde la aplicación
-- ============================================================

-- --------------------------------------------------------
-- 1. CERRAR CUENTA CORRIENTE
--    Transacción completa: lock, snapshot, pago, movimiento
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_cerrar_cuenta(
    p_cuenta_id         UUID,
    p_monto_pago_ars    NUMERIC,
    p_monto_pago_usd    NUMERIC,
    p_periodo_desde      TIMESTAMPTZ,
    p_periodo_hasta      TIMESTAMPTZ,
    p_notas             TEXT DEFAULT NULL,
    p_detalle_franquicia JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_cierre_id     UUID;
    v_saldo_ars     NUMERIC;
    v_saldo_usd     NUMERIC;
    v_cliente_id    UUID;
BEGIN
    -- Lockear la fila de cuenta corriente para evitar races
    SELECT saldo_ars, saldo_usd, cliente_id
    INTO v_saldo_ars, v_saldo_usd, v_cliente_id
    FROM cuenta_corriente
    WHERE id = p_cuenta_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cuenta corriente % no encontrada.', p_cuenta_id;
    END IF;

    -- Validar que no se pague más de lo que se debe
    IF p_monto_pago_ars > v_saldo_ars THEN
        RAISE EXCEPTION 'Monto de pago ARS (%) excede el saldo (%).', p_monto_pago_ars, v_saldo_ars;
    END IF;

    IF p_monto_pago_usd > v_saldo_usd THEN
        RAISE EXCEPTION 'Monto de pago USD (%) excede el saldo (%).', p_monto_pago_usd, v_saldo_usd;
    END IF;

    -- Crear registro de cierre (snapshot inmutable)
    INSERT INTO cierres_cuenta (
        cuenta_id, cliente_id,
        saldo_previo_ars, saldo_previo_usd,
        monto_pagado_ars, monto_pagado_usd,
        saldo_restante_ars, saldo_restante_usd,
        periodo_desde, periodo_hasta,
        detalle_franquicia, notas, created_by
    ) VALUES (
        p_cuenta_id, v_cliente_id,
        v_saldo_ars, v_saldo_usd,
        p_monto_pago_ars, p_monto_pago_usd,
        v_saldo_ars - p_monto_pago_ars, v_saldo_usd - p_monto_pago_usd,
        p_periodo_desde, p_periodo_hasta,
        p_detalle_franquicia, p_notas, auth.uid()
    )
    RETURNING id INTO v_cierre_id;

    -- Crear movimiento negativo en la cuenta (reduce deuda)
    -- El trigger trg_actualizar_saldo actualizará automáticamente cuenta_corriente
    INSERT INTO movimientos_cuenta (
        cuenta_id, tipo,
        monto_ars, monto_usd,
        descripcion, cierre_id, created_by
    ) VALUES (
        p_cuenta_id, 'pago_cierre',
        -p_monto_pago_ars, -p_monto_pago_usd,
        'Pago por cierre de cuenta — Período ' ||
            TO_CHAR(p_periodo_desde, 'DD/MM/YYYY') || ' a ' ||
            TO_CHAR(p_periodo_hasta, 'DD/MM/YYYY'),
        v_cierre_id, auth.uid()
    );

    RETURN v_cierre_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------
-- 2. CALCULAR DETALLE DE FRANQUICIA
--    Preview del split de ganancia para un período
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_detalle_franquicia(
    p_cuenta_id     UUID,
    p_desde         TIMESTAMPTZ,
    p_hasta         TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    v_cliente_id    UUID;
    v_split         NUMERIC;
    v_resultado     JSONB;
BEGIN
    -- Obtener cliente y split default
    SELECT cc.cliente_id, c.franquicia_split
    INTO v_cliente_id, v_split
    FROM cuenta_corriente cc
    JOIN clientes c ON c.id = cc.cliente_id
    WHERE cc.id = p_cuenta_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cuenta corriente % no encontrada.', p_cuenta_id;
    END IF;

    -- Calcular detalle por reparación entregada en el período
    SELECT COALESCE(jsonb_agg(detalle ORDER BY r.fecha_entrega), '[]'::jsonb)
    INTO v_resultado
    FROM reparaciones r
    CROSS JOIN LATERAL (
        SELECT jsonb_build_object(
            'reparacion_id', r.id,
            'modelo', r.modelo,
            'descripcion_problema', r.descripcion_problema,
            'fecha_entrega', r.fecha_entrega,
            'precio_cliente_ars', COALESCE(r.precio_cliente_ars, 0),
            'precio_cliente_usd', COALESCE(r.precio_cliente_usd, 0),
            'costo_repuestos_ars', COALESCE(costo_rep.total_ars, 0),
            'costo_repuestos_usd', COALESCE(costo_rep.total_usd, 0),
            'ganancia_neta_ars', COALESCE(r.precio_cliente_ars, 0) - COALESCE(costo_rep.total_ars, 0),
            'ganancia_neta_usd', COALESCE(r.precio_cliente_usd, 0) - COALESCE(costo_rep.total_usd, 0),
            'split_usado', COALESCE(r.franquicia_split_override, v_split),
            'parte_tienda_ars', (COALESCE(r.precio_cliente_ars, 0) - COALESCE(costo_rep.total_ars, 0))
                * COALESCE(r.franquicia_split_override, v_split),
            'parte_tienda_usd', (COALESCE(r.precio_cliente_usd, 0) - COALESCE(costo_rep.total_usd, 0))
                * COALESCE(r.franquicia_split_override, v_split),
            'parte_franquicia_ars', (COALESCE(r.precio_cliente_ars, 0) - COALESCE(costo_rep.total_ars, 0))
                * (1 - COALESCE(r.franquicia_split_override, v_split)),
            'parte_franquicia_usd', (COALESCE(r.precio_cliente_usd, 0) - COALESCE(costo_rep.total_usd, 0))
                * (1 - COALESCE(r.franquicia_split_override, v_split))
        ) AS detalle
    ) sub
    LEFT JOIN LATERAL (
        SELECT
            SUM(rr.costo_unitario_snapshot_ars * rr.cantidad) AS total_ars,
            SUM(rr.costo_unitario_snapshot_usd * rr.cantidad) AS total_usd
        FROM reparacion_repuestos rr
        WHERE rr.reparacion_id = r.id
    ) costo_rep ON TRUE
    WHERE r.cliente_id = v_cliente_id
      AND r.tipo_servicio = 'franquicia'
      AND r.estado = 'entregado'
      AND r.fecha_entrega >= p_desde
      AND r.fecha_entrega <= p_hasta;

    RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------
-- 3. SALDO TEÓRICO DE CAJA
--    Suma de todos los movimientos de una caja hasta una fecha
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_saldo_teorico_caja(
    p_caja  caja_destino,
    p_fecha DATE
)
RETURNS NUMERIC AS $$
    SELECT COALESCE(SUM(monto), 0)
    FROM movimientos_caja
    WHERE caja = p_caja
      AND (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= p_fecha;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- --------------------------------------------------------
-- 4. OBTENER COTIZACIÓN ACTUAL
--    Retorna la última cotización cargada por moneda y fuente
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_obtener_cotizacion_actual(
    p_moneda moneda DEFAULT 'usd',
    p_fuente TEXT DEFAULT 'blue'
)
RETURNS TABLE (
    precio_compra   NUMERIC(14,2),
    precio_venta    NUMERIC(14,2),
    fuente          TEXT,
    fecha           TIMESTAMPTZ
) AS $$
    SELECT
        c.precio_compra,
        c.precio_venta,
        c.fuente,
        c.created_at AS fecha
    FROM cotizaciones c
    WHERE c.moneda_tipo = p_moneda
      AND c.fuente = p_fuente
    ORDER BY c.created_at DESC
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- --------------------------------------------------------
-- 5. REGISTRAR PAGO COMPLETO
--    Crea pagos + pago_metodos + movimientos_caja en una transacción
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_registrar_pago(
    p_reparacion_id     UUID DEFAULT NULL,
    p_venta_telefono_id UUID DEFAULT NULL,
    p_cierre_cuenta_id  UUID DEFAULT NULL,
    p_total_ars         NUMERIC DEFAULT 0,
    p_total_usd         NUMERIC DEFAULT 0,
    p_cotizacion_usada  NUMERIC DEFAULT NULL,
    p_metodos           JSONB DEFAULT '[]',  -- [{metodo, monto, cotizacion_usada}]
    p_notas             TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_pago_id       UUID;
    v_metodo        JSONB;
    v_caja          caja_destino;
    v_tipo_mov      tipo_movimiento_caja;
    v_descripcion   TEXT;
BEGIN
    -- Crear header del pago
    INSERT INTO pagos (
        reparacion_id, venta_telefono_id, cierre_cuenta_id,
        total_ars, total_usd, cotizacion_usada, notas, created_by
    ) VALUES (
        p_reparacion_id, p_venta_telefono_id, p_cierre_cuenta_id,
        p_total_ars, p_total_usd, p_cotizacion_usada, p_notas, auth.uid()
    )
    RETURNING id INTO v_pago_id;

    -- Determinar tipo de movimiento de caja
    IF p_reparacion_id IS NOT NULL THEN
        v_tipo_mov = 'ingreso_reparacion';
        v_descripcion = 'Cobro de reparación';
    ELSIF p_venta_telefono_id IS NOT NULL THEN
        v_tipo_mov = 'ingreso_venta_telefono';
        v_descripcion = 'Cobro de venta de teléfono';
    ELSIF p_cierre_cuenta_id IS NOT NULL THEN
        v_tipo_mov = 'ingreso_cierre_cuenta';
        v_descripcion = 'Cobro por cierre de cuenta corriente';
    ELSE
        v_tipo_mov = 'ajuste_manual';
        v_descripcion = COALESCE(p_notas, 'Pago sin referencia');
    END IF;

    -- Insertar cada método de pago y su movimiento de caja correspondiente
    FOR v_metodo IN SELECT * FROM jsonb_array_elements(p_metodos)
    LOOP
        -- Insertar línea del método de pago
        INSERT INTO pago_metodos (pago_id, metodo, monto, cotizacion_usada)
        VALUES (
            v_pago_id,
            (v_metodo->>'metodo')::metodo_pago,
            (v_metodo->>'monto')::numeric,
            (v_metodo->>'cotizacion_usada')::numeric
        );

        -- Determinar la caja destino según el método
        v_caja = CASE (v_metodo->>'metodo')
            WHEN 'efectivo_ars' THEN 'efectivo_ars'::caja_destino
            WHEN 'efectivo_usd' THEN 'efectivo_usd'::caja_destino
            WHEN 'transferencia' THEN 'banco'::caja_destino
        END;

        -- Crear movimiento de caja por cada método
        INSERT INTO movimientos_caja (
            caja, tipo, monto, descripcion,
            pago_id, reparacion_id,
            cotizacion_usada, created_by
        ) VALUES (
            v_caja, v_tipo_mov,
            (v_metodo->>'monto')::numeric,
            v_descripcion,
            v_pago_id, p_reparacion_id,
            (v_metodo->>'cotizacion_usada')::numeric,
            auth.uid()
        );
    END LOOP;

    RETURN v_pago_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
