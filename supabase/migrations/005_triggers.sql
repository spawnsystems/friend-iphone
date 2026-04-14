-- ============================================================
-- 005_triggers.sql
-- Triggers y funciones de trigger
-- ============================================================

-- --------------------------------------------------------
-- 1. DECREMENTAR STOCK DE REPUESTOS + SNAPSHOT DE COSTO
--    Cuando se registra un repuesto usado en una reparación
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_decrementar_stock_repuesto()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrementar stock
    UPDATE repuestos
    SET cantidad = cantidad - NEW.cantidad,
        updated_at = NOW()
    WHERE id = NEW.repuesto_id;

    -- Verificar que el stock no quede negativo
    IF (SELECT cantidad FROM repuestos WHERE id = NEW.repuesto_id) < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente para repuesto %. Stock actual no alcanza para cubrir cantidad %.',
            NEW.repuesto_id, NEW.cantidad;
    END IF;

    -- Snapshot del costo desde costos_inventario (SECURITY DEFINER puede leerlo)
    SELECT costo_unitario_ars, costo_unitario_usd
    INTO NEW.costo_unitario_snapshot_ars, NEW.costo_unitario_snapshot_usd
    FROM costos_inventario
    WHERE repuesto_id = NEW.repuesto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_decrementar_stock
    BEFORE INSERT ON reparacion_repuestos
    FOR EACH ROW
    EXECUTE FUNCTION fn_decrementar_stock_repuesto();

-- --------------------------------------------------------
-- 2. ACTUALIZAR SALDO DE CUENTA CORRIENTE
--    Cada movimiento de cuenta ajusta el saldo running
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_saldo_cuenta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cuenta_corriente
    SET saldo_ars = saldo_ars + NEW.monto_ars,
        saldo_usd = saldo_usd + NEW.monto_usd,
        updated_at = NOW()
    WHERE id = NEW.cuenta_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_actualizar_saldo
    AFTER INSERT ON movimientos_cuenta
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_saldo_cuenta();

-- --------------------------------------------------------
-- 3. MÁQUINA DE ESTADOS DE REPARACIONES
--    Valida transiciones, llena timestamps, valida franquicia
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_estado_reparacion()
RETURNS TRIGGER AS $$
DECLARE
    v_split NUMERIC;
BEGIN
    -- Solo actuar si el estado cambió
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        NEW.updated_at = NOW();
        NEW.updated_by = auth.uid();

        CASE NEW.estado
            WHEN 'en_reparacion' THEN
                -- Validar presupuesto aprobado
                IF NOT NEW.presupuesto_aprobado THEN
                    RAISE EXCEPTION 'No se puede iniciar la reparación sin presupuesto aprobado.';
                END IF;
                NEW.fecha_inicio_reparacion = NOW();

            WHEN 'listo' THEN
                NEW.fecha_listo = NOW();

            WHEN 'entregado' THEN
                NEW.fecha_entrega = NOW();

            WHEN 'cancelado' THEN
                -- No requiere validación especial
                NULL;

            ELSE
                NULL;
        END CASE;
    END IF;

    -- Validar split de franquicia cuando se setea tipo_servicio
    IF NEW.tipo_servicio = 'franquicia' THEN
        -- Determinar el split a usar
        v_split = NEW.franquicia_split_override;

        -- Si no hay override, buscar el default del cliente
        IF v_split IS NULL THEN
            SELECT franquicia_split INTO v_split
            FROM clientes
            WHERE id = NEW.cliente_id;
        END IF;

        -- Si aún no hay split, error
        IF v_split IS NULL THEN
            RAISE EXCEPTION 'Reparación de franquicia requiere un split definido. Configure franquicia_split en el cliente % o use franquicia_split_override.',
                NEW.cliente_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_estado_reparacion
    BEFORE UPDATE ON reparaciones
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_estado_reparacion();

-- Trigger separado para INSERT: validar franquicia en la creación
CREATE OR REPLACE FUNCTION fn_validar_reparacion_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_split NUMERIC;
BEGIN
    IF NEW.tipo_servicio = 'franquicia' THEN
        v_split = NEW.franquicia_split_override;

        IF v_split IS NULL THEN
            SELECT franquicia_split INTO v_split
            FROM clientes
            WHERE id = NEW.cliente_id;
        END IF;

        IF v_split IS NULL THEN
            RAISE EXCEPTION 'Reparación de franquicia requiere un split definido. Configure franquicia_split en el cliente % o use franquicia_split_override.',
                NEW.cliente_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validar_reparacion_insert
    BEFORE INSERT ON reparaciones
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_reparacion_insert();

-- --------------------------------------------------------
-- 4. BLOQUEO POR CIERRE DIARIO DE CAJA
--    Impide modificar/borrar movimientos de caja cerrados
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_bloqueo_cierre_diario()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si existe un cierre diario para esta caja en la fecha del movimiento o posterior
    IF EXISTS (
        SELECT 1 FROM cierres_diarios_caja
        WHERE caja = OLD.caja
          AND fecha >= (OLD.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    ) THEN
        RAISE EXCEPTION 'No se puede modificar/eliminar el movimiento de caja %. Existe un cierre diario para la caja "%" en fecha % o posterior.',
            OLD.id, OLD.caja, (OLD.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_bloqueo_cierre_diario
    BEFORE UPDATE OR DELETE ON movimientos_caja
    FOR EACH ROW
    EXECUTE FUNCTION fn_bloqueo_cierre_diario();

-- --------------------------------------------------------
-- 5. AUTO-FLAG PASAMANOS SIN COSTO
--    Si se crea un teléfono tipo pasamanos, marcar pendiente_de_costo
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_flag_pasamanos_sin_costo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo = 'pasamanos' THEN
        -- Verificar si existe un registro de costo
        IF NOT EXISTS (
            SELECT 1 FROM costos_inventario WHERE telefono_id = NEW.id
        ) THEN
            NEW.pendiente_de_costo = TRUE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_flag_pasamanos
    BEFORE INSERT ON telefonos
    FOR EACH ROW
    EXECUTE FUNCTION fn_flag_pasamanos_sin_costo();

-- Trigger para limpiar el flag cuando se carga el costo
CREATE OR REPLACE FUNCTION fn_limpiar_flag_pasamanos()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.telefono_id IS NOT NULL AND (NEW.costo_unitario_ars IS NOT NULL OR NEW.costo_unitario_usd IS NOT NULL) THEN
        UPDATE telefonos
        SET pendiente_de_costo = FALSE,
            updated_at = NOW()
        WHERE id = NEW.telefono_id
          AND pendiente_de_costo = TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_limpiar_flag_pasamanos
    AFTER INSERT OR UPDATE ON costos_inventario
    FOR EACH ROW
    EXECUTE FUNCTION fn_limpiar_flag_pasamanos();

-- --------------------------------------------------------
-- 6. AUDIT LOG — Trigger genérico de auditoría
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (tabla, registro_id, accion, datos_anteriores, datos_nuevos, usuario_id)
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
        auth.uid()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar audit a tablas críticas
CREATE TRIGGER trg_audit_reparaciones
    AFTER INSERT OR UPDATE OR DELETE ON reparaciones
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_telefonos
    AFTER INSERT OR UPDATE OR DELETE ON telefonos
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_pagos
    AFTER INSERT OR UPDATE ON pagos
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_cierres_cuenta
    AFTER INSERT ON cierres_cuenta
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_mov_caja
    AFTER INSERT ON movimientos_caja
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_costos
    AFTER INSERT OR UPDATE OR DELETE ON costos_inventario
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

CREATE TRIGGER trg_audit_cierres_diarios
    AFTER INSERT ON cierres_diarios_caja
    FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
