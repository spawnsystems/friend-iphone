-- ============================================================
-- 002_tables.sql
-- 17 tablas del sistema de gestión del taller
-- Orden respeta dependencias de FK
-- ============================================================

-- --------------------------------------------------------
-- 1. USUARIOS — Extiende auth.users de Supabase
-- --------------------------------------------------------
CREATE TABLE usuarios (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    rol         app_role NOT NULL DEFAULT 'empleado',
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------
-- 2. CLIENTES — Unifica retail, gremio, franquicia
-- --------------------------------------------------------
CREATE TABLE clientes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo              tipo_cliente NOT NULL,
    nombre            TEXT NOT NULL,
    telefono          TEXT,
    email             TEXT,
    direccion         TEXT,
    nombre_negocio    TEXT,                                    -- Para gremio/franquicia
    franquicia_split  NUMERIC(3,2) NOT NULL DEFAULT 0.50,     -- Porción de la tienda (solo aplica a franquicia)
    notas             TEXT,
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_tipo ON clientes(tipo);
CREATE INDEX idx_clientes_nombre ON clientes(nombre);

-- --------------------------------------------------------
-- 3. CUENTA CORRIENTE — Saldo running por cliente gremio/franquicia
-- --------------------------------------------------------
CREATE TABLE cuenta_corriente (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    saldo_ars   NUMERIC(14,2) NOT NULL DEFAULT 0,    -- Positivo = cliente debe al taller
    saldo_usd   NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cuenta_cliente UNIQUE(cliente_id)
);

-- --------------------------------------------------------
-- 4. REPUESTOS — Inventario de partes (SIN costos)
-- --------------------------------------------------------
CREATE TABLE repuestos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre            TEXT NOT NULL,
    modelo_compatible TEXT[],                          -- {'iPhone 12', 'iPhone 12 Pro'}
    cantidad          INT NOT NULL DEFAULT 0,
    cantidad_minima   INT NOT NULL DEFAULT 2,          -- Umbral de alerta stock bajo
    ubicacion         TEXT,                             -- Ubicación física en el local
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_repuestos_nombre ON repuestos(nombre);

-- --------------------------------------------------------
-- 5. TELEFONOS — Inventario de celulares
-- --------------------------------------------------------
CREATE TABLE telefonos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei                    TEXT NOT NULL UNIQUE,
    modelo                  TEXT NOT NULL,
    color                   TEXT,
    capacidad               TEXT,                      -- '128GB', '256GB'
    estado_bateria          INT,                       -- Porcentaje
    tipo                    tipo_telefono NOT NULL,
    estado                  estado_telefono NOT NULL DEFAULT 'en_stock',
    -- Consignación
    consignante_id          UUID REFERENCES clientes(id),
    precio_consignacion_ars NUMERIC(14,2),
    -- Flag para pasamanos sin costo cargado
    pendiente_de_costo      BOOLEAN NOT NULL DEFAULT FALSE,
    -- Datos de venta (se llenan al vender)
    precio_venta_ars        NUMERIC(14,2),
    precio_venta_usd        NUMERIC(14,2),
    fecha_venta             TIMESTAMPTZ,
    comprador_id            UUID REFERENCES clientes(id),
    notas                   TEXT,
    created_by              UUID NOT NULL REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telefonos_imei ON telefonos(imei);
CREATE INDEX idx_telefonos_estado ON telefonos(estado);
CREATE INDEX idx_telefonos_tipo ON telefonos(tipo);
CREATE INDEX idx_telefonos_pendiente ON telefonos(pendiente_de_costo) WHERE pendiente_de_costo = TRUE;

-- --------------------------------------------------------
-- 6. COSTOS INVENTARIO — TABLA SENSIBLE (bloqueada para empleados)
--    Almacena costos separados de las tablas principales
-- --------------------------------------------------------
CREATE TABLE costos_inventario (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repuesto_id         UUID REFERENCES repuestos(id) ON DELETE CASCADE,
    telefono_id         UUID REFERENCES telefonos(id) ON DELETE CASCADE,
    costo_unitario_ars  NUMERIC(14,2),                 -- NULL permitido para pasamanos
    costo_unitario_usd  NUMERIC(14,2),                 -- NULL permitido para pasamanos
    proveedor           TEXT,
    fecha_compra        DATE,
    notas               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Exactamente un FK debe estar seteado
    CONSTRAINT chk_costos_one_reference CHECK (
        (repuesto_id IS NOT NULL AND telefono_id IS NULL) OR
        (repuesto_id IS NULL AND telefono_id IS NOT NULL)
    ),
    CONSTRAINT uq_costo_repuesto UNIQUE(repuesto_id),
    CONSTRAINT uq_costo_telefono UNIQUE(telefono_id)
);

-- --------------------------------------------------------
-- 7. COTIZACIONES — Cotización dólar dinámica
-- --------------------------------------------------------
CREATE TABLE cotizaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moneda_tipo     moneda NOT NULL DEFAULT 'usd',
    precio_compra   NUMERIC(14,2) NOT NULL,            -- Precio al que se compra USD
    precio_venta    NUMERIC(14,2) NOT NULL,            -- Precio al que se vende USD
    fuente          TEXT NOT NULL DEFAULT 'blue',       -- 'blue', 'oficial', 'cripto', etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cotizaciones_moneda_fecha ON cotizaciones(moneda_tipo, created_at DESC);

-- --------------------------------------------------------
-- 8. REPARACIONES — Core del negocio
-- --------------------------------------------------------
CREATE TABLE reparaciones (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Equipo
    imei                        TEXT,
    modelo                      TEXT NOT NULL,
    descripcion_problema        TEXT NOT NULL,
    -- Cliente
    cliente_id                  UUID NOT NULL REFERENCES clientes(id),
    tipo_servicio               tipo_cliente NOT NULL,   -- retail/gremio/franquicia
    -- Máquina de estados
    estado                      estado_reparacion NOT NULL DEFAULT 'recibido',
    -- Precios (visibles para todos)
    precio_cliente_ars          NUMERIC(14,2),           -- Lo que paga el cliente final
    precio_cliente_usd          NUMERIC(14,2),
    presupuesto_aprobado        BOOLEAN NOT NULL DEFAULT FALSE,
    -- Franquicia
    franquicia_split_override   NUMERIC(3,2),            -- NULL = usa default del cliente
    -- Fechas del flujo
    fecha_ingreso               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_presupuesto           TIMESTAMPTZ,
    fecha_inicio_reparacion     TIMESTAMPTZ,
    fecha_listo                 TIMESTAMPTZ,
    fecha_entrega               TIMESTAMPTZ,
    -- Metadata
    diagnostico                 TEXT,
    notas_internas              TEXT,
    created_by                  UUID NOT NULL REFERENCES usuarios(id),
    updated_by                  UUID REFERENCES usuarios(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reparaciones_estado ON reparaciones(estado);
CREATE INDEX idx_reparaciones_cliente ON reparaciones(cliente_id);
CREATE INDEX idx_reparaciones_fecha ON reparaciones(fecha_ingreso DESC);
CREATE INDEX idx_reparaciones_imei ON reparaciones(imei);
CREATE INDEX idx_reparaciones_tipo ON reparaciones(tipo_servicio);

-- --------------------------------------------------------
-- 9. REPARACION_REPUESTOS — Partes usadas por reparación
-- --------------------------------------------------------
CREATE TABLE reparacion_repuestos (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reparacion_id               UUID NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
    repuesto_id                 UUID NOT NULL REFERENCES repuestos(id),
    cantidad                    INT NOT NULL DEFAULT 1,
    -- Snapshot de costo al momento de uso (llenado por trigger SECURITY DEFINER)
    costo_unitario_snapshot_ars NUMERIC(14,2),
    costo_unitario_snapshot_usd NUMERIC(14,2),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rep_repuestos_reparacion ON reparacion_repuestos(reparacion_id);
CREATE INDEX idx_rep_repuestos_repuesto ON reparacion_repuestos(repuesto_id);

-- --------------------------------------------------------
-- 10. CIERRES DE CUENTA — Snapshots inmutables de cierre
-- --------------------------------------------------------
CREATE TABLE cierres_cuenta (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id           UUID NOT NULL REFERENCES cuenta_corriente(id),
    cliente_id          UUID NOT NULL REFERENCES clientes(id),
    -- Snapshot al momento del cierre
    saldo_previo_ars    NUMERIC(14,2) NOT NULL,
    saldo_previo_usd    NUMERIC(14,2) NOT NULL,
    -- Lo que se pagó
    monto_pagado_ars    NUMERIC(14,2) NOT NULL DEFAULT 0,
    monto_pagado_usd    NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Saldo restante después del pago
    saldo_restante_ars  NUMERIC(14,2) NOT NULL,
    saldo_restante_usd  NUMERIC(14,2) NOT NULL,
    -- Detalle de franquicia (solo para clientes franquicia)
    -- Array de {reparacion_id, precio_cliente, costo_repuesto, ganancia_neta, split_tienda, split_franquicia}
    detalle_franquicia  JSONB,
    -- Período que cubre este cierre
    periodo_desde       TIMESTAMPTZ NOT NULL,
    periodo_hasta       TIMESTAMPTZ NOT NULL,
    notas               TEXT,
    created_by          UUID NOT NULL REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cierres_cuenta ON cierres_cuenta(cuenta_id);
CREATE INDEX idx_cierres_cliente ON cierres_cuenta(cliente_id);
CREATE INDEX idx_cierres_fecha ON cierres_cuenta(created_at DESC);

-- --------------------------------------------------------
-- 11. PAGOS — Header de cada pago (1 pago = 1-2 métodos)
-- --------------------------------------------------------
CREATE TABLE pagos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Referencias polimórficas (solo una debe estar seteada por pago)
    reparacion_id       UUID REFERENCES reparaciones(id),
    venta_telefono_id   UUID REFERENCES telefonos(id),
    cierre_cuenta_id    UUID REFERENCES cierres_cuenta(id),
    -- Totales
    total_ars           NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_usd           NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Cotización pactada en el momento del pago
    cotizacion_usada    NUMERIC(14,2),                 -- ARS por 1 USD al momento de cobrar
    notas               TEXT,
    created_by          UUID NOT NULL REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_reparacion ON pagos(reparacion_id);
CREATE INDEX idx_pagos_venta ON pagos(venta_telefono_id);
CREATE INDEX idx_pagos_cierre ON pagos(cierre_cuenta_id);
CREATE INDEX idx_pagos_fecha ON pagos(created_at DESC);

-- --------------------------------------------------------
-- 12. PAGO_METODOS — Line items de cada pago (1-2 por pago)
-- --------------------------------------------------------
CREATE TABLE pago_metodos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pago_id         UUID NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
    metodo          metodo_pago NOT NULL,
    monto           NUMERIC(14,2) NOT NULL,
    -- Cotización usada en este método específico
    -- (ej: si paga parte en USD cash y parte en ARS transfer, cada uno puede tener su cotización)
    cotizacion_usada NUMERIC(14,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pago_metodos_pago ON pago_metodos(pago_id);

-- --------------------------------------------------------
-- 13. MOVIMIENTOS CUENTA CORRIENTE
-- --------------------------------------------------------
CREATE TABLE movimientos_cuenta (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id       UUID NOT NULL REFERENCES cuenta_corriente(id),
    tipo            tipo_movimiento_cuenta NOT NULL,
    -- Positivo = cliente debe más, negativo = cliente pagó
    monto_ars       NUMERIC(14,2) NOT NULL DEFAULT 0,
    monto_usd       NUMERIC(14,2) NOT NULL DEFAULT 0,
    descripcion     TEXT NOT NULL,
    -- Referencias opcionales
    reparacion_id   UUID REFERENCES reparaciones(id),
    cierre_id       UUID REFERENCES cierres_cuenta(id),
    created_by      UUID NOT NULL REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_cuenta_cuenta ON movimientos_cuenta(cuenta_id);
CREATE INDEX idx_mov_cuenta_fecha ON movimientos_cuenta(created_at DESC);

-- --------------------------------------------------------
-- 14. MOVIMIENTOS DE CAJA — Todo ingreso/egreso de dinero
-- --------------------------------------------------------
CREATE TABLE movimientos_caja (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja                    caja_destino NOT NULL,
    tipo                    tipo_movimiento_caja NOT NULL,
    monto                   NUMERIC(14,2) NOT NULL,    -- Positivo = ingreso, negativo = egreso
    descripcion             TEXT NOT NULL,
    -- Referencias opcionales
    pago_id                 UUID REFERENCES pagos(id),
    reparacion_id           UUID REFERENCES reparaciones(id),
    telefono_id             UUID REFERENCES telefonos(id),  -- Para vincular egreso consignante al IMEI
    -- Flag de movimiento personal del dueño (oculto para empleados)
    es_movimiento_personal  BOOLEAN NOT NULL DEFAULT FALSE,
    -- Cotización usada si aplica conversión
    cotizacion_usada        NUMERIC(14,2),
    created_by              UUID NOT NULL REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_caja_caja ON movimientos_caja(caja);
CREATE INDEX idx_mov_caja_fecha ON movimientos_caja(created_at DESC);
CREATE INDEX idx_mov_caja_tipo ON movimientos_caja(tipo);
CREATE INDEX idx_mov_caja_telefono ON movimientos_caja(telefono_id) WHERE telefono_id IS NOT NULL;

-- --------------------------------------------------------
-- 15. CIERRES DIARIOS DE CAJA — Checkpoints del dueño
--     Bloquea modificación de movimientos anteriores
-- --------------------------------------------------------
CREATE TABLE cierres_diarios_caja (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha               DATE NOT NULL,
    caja                caja_destino NOT NULL,
    saldo_al_cierre     NUMERIC(14,2) NOT NULL,        -- Saldo teórico al momento del cierre
    notas               TEXT,
    cerrado_por         UUID NOT NULL REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cierre_diario UNIQUE(fecha, caja)
);

CREATE INDEX idx_cierres_diarios_fecha ON cierres_diarios_caja(fecha DESC);

-- --------------------------------------------------------
-- 16. ARQUEOS DE CAJA — Conteo físico vs teórico
-- --------------------------------------------------------
CREATE TABLE arqueos_caja (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha           DATE NOT NULL,
    caja            caja_destino NOT NULL,
    monto_fisico    NUMERIC(14,2) NOT NULL,            -- Lo que contó el empleado
    monto_teorico   NUMERIC(14,2) NOT NULL,            -- Lo que dice el sistema
    diferencia      NUMERIC(14,2) NOT NULL,            -- fisico - teorico
    notas           TEXT,
    created_by      UUID NOT NULL REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_arqueo UNIQUE(fecha, caja)
);

-- --------------------------------------------------------
-- 17. AUDIT LOG — Registro de auditoría
-- --------------------------------------------------------
CREATE TABLE audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla               TEXT NOT NULL,
    registro_id         UUID NOT NULL,
    accion              TEXT NOT NULL,                  -- INSERT, UPDATE, DELETE
    datos_anteriores    JSONB,
    datos_nuevos        JSONB,
    usuario_id          UUID REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tabla ON audit_log(tabla, registro_id);
CREATE INDEX idx_audit_fecha ON audit_log(created_at DESC);
CREATE INDEX idx_audit_usuario ON audit_log(usuario_id);
