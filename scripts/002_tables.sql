-- ============================================================
-- 002_tables.sql
-- 17 tablas del sistema de gestión del taller
-- Orden respeta dependencias de FK
-- ============================================================

-- --------------------------------------------------------
-- 1. USUARIOS — Extiende auth.users de Supabase
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
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
CREATE TABLE IF NOT EXISTS clientes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo              tipo_cliente NOT NULL,
    nombre            TEXT NOT NULL,
    telefono          TEXT,
    email             TEXT,
    direccion         TEXT,
    nombre_negocio    TEXT,
    franquicia_split  NUMERIC(3,2) NOT NULL DEFAULT 0.50,
    notas             TEXT,
    activo            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes(tipo);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);

-- --------------------------------------------------------
-- 3. CUENTA CORRIENTE — Saldo running por cliente gremio/franquicia
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS cuenta_corriente (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    saldo_ars   NUMERIC(14,2) NOT NULL DEFAULT 0,
    saldo_usd   NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cuenta_cliente UNIQUE(cliente_id)
);

-- --------------------------------------------------------
-- 4. REPUESTOS — Inventario de partes (SIN costos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS repuestos (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre            TEXT NOT NULL,
    modelo_compatible TEXT[],
    cantidad          INT NOT NULL DEFAULT 0,
    cantidad_minima   INT NOT NULL DEFAULT 2,
    ubicacion         TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repuestos_nombre ON repuestos(nombre);

-- --------------------------------------------------------
-- 5. TELEFONOS — Inventario de celulares
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS telefonos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei                    TEXT NOT NULL UNIQUE,
    modelo                  TEXT NOT NULL,
    color                   TEXT,
    capacidad               TEXT,
    estado_bateria          INT,
    tipo                    tipo_telefono NOT NULL,
    estado                  estado_telefono NOT NULL DEFAULT 'en_stock',
    consignante_id          UUID REFERENCES clientes(id),
    precio_consignacion_ars NUMERIC(14,2),
    pendiente_de_costo      BOOLEAN NOT NULL DEFAULT FALSE,
    precio_venta_ars        NUMERIC(14,2),
    precio_venta_usd        NUMERIC(14,2),
    fecha_venta             TIMESTAMPTZ,
    comprador_id            UUID REFERENCES clientes(id),
    notas                   TEXT,
    created_by              UUID NOT NULL REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telefonos_imei ON telefonos(imei);
CREATE INDEX IF NOT EXISTS idx_telefonos_estado ON telefonos(estado);
CREATE INDEX IF NOT EXISTS idx_telefonos_tipo ON telefonos(tipo);

-- --------------------------------------------------------
-- 6. COSTOS INVENTARIO — TABLA SENSIBLE (bloqueada para empleados)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS costos_inventario (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repuesto_id         UUID REFERENCES repuestos(id) ON DELETE CASCADE,
    telefono_id         UUID REFERENCES telefonos(id) ON DELETE CASCADE,
    costo_unitario_ars  NUMERIC(14,2),
    costo_unitario_usd  NUMERIC(14,2),
    proveedor           TEXT,
    fecha_compra        DATE,
    notas               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
CREATE TABLE IF NOT EXISTS cotizaciones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moneda_tipo     moneda NOT NULL DEFAULT 'usd',
    precio_compra   NUMERIC(14,2) NOT NULL,
    precio_venta    NUMERIC(14,2) NOT NULL,
    fuente          TEXT NOT NULL DEFAULT 'blue',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_moneda_fecha ON cotizaciones(moneda_tipo, created_at DESC);

-- --------------------------------------------------------
-- 8. REPARACIONES — Core del negocio
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS reparaciones (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imei                        TEXT,
    modelo                      TEXT NOT NULL,
    descripcion_problema        TEXT NOT NULL,
    cliente_id                  UUID NOT NULL REFERENCES clientes(id),
    tipo_servicio               tipo_cliente NOT NULL,
    estado                      estado_reparacion NOT NULL DEFAULT 'recibido',
    precio_cliente_ars          NUMERIC(14,2),
    precio_cliente_usd          NUMERIC(14,2),
    presupuesto_aprobado        BOOLEAN NOT NULL DEFAULT FALSE,
    franquicia_split_override   NUMERIC(3,2),
    fecha_ingreso               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_presupuesto           TIMESTAMPTZ,
    fecha_inicio_reparacion     TIMESTAMPTZ,
    fecha_listo                 TIMESTAMPTZ,
    fecha_entrega               TIMESTAMPTZ,
    diagnostico                 TEXT,
    notas_internas              TEXT,
    created_by                  UUID NOT NULL REFERENCES usuarios(id),
    updated_by                  UUID REFERENCES usuarios(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reparaciones_estado ON reparaciones(estado);
CREATE INDEX IF NOT EXISTS idx_reparaciones_cliente ON reparaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reparaciones_fecha ON reparaciones(fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_reparaciones_imei ON reparaciones(imei);
CREATE INDEX IF NOT EXISTS idx_reparaciones_tipo ON reparaciones(tipo_servicio);

-- --------------------------------------------------------
-- 9. REPARACION_REPUESTOS — Partes usadas por reparación
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS reparacion_repuestos (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reparacion_id               UUID NOT NULL REFERENCES reparaciones(id) ON DELETE CASCADE,
    repuesto_id                 UUID NOT NULL REFERENCES repuestos(id),
    cantidad                    INT NOT NULL DEFAULT 1,
    costo_unitario_snapshot_ars NUMERIC(14,2),
    costo_unitario_snapshot_usd NUMERIC(14,2),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rep_repuestos_reparacion ON reparacion_repuestos(reparacion_id);
CREATE INDEX IF NOT EXISTS idx_rep_repuestos_repuesto ON reparacion_repuestos(repuesto_id);

-- --------------------------------------------------------
-- 10. CIERRES DE CUENTA — Snapshots inmutables de cierre
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS cierres_cuenta (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id           UUID NOT NULL REFERENCES cuenta_corriente(id),
    cliente_id          UUID NOT NULL REFERENCES clientes(id),
    saldo_previo_ars    NUMERIC(14,2) NOT NULL,
    saldo_previo_usd    NUMERIC(14,2) NOT NULL,
    monto_pagado_ars    NUMERIC(14,2) NOT NULL DEFAULT 0,
    monto_pagado_usd    NUMERIC(14,2) NOT NULL DEFAULT 0,
    saldo_restante_ars  NUMERIC(14,2) NOT NULL,
    saldo_restante_usd  NUMERIC(14,2) NOT NULL,
    detalle_franquicia  JSONB,
    periodo_desde       TIMESTAMPTZ NOT NULL,
    periodo_hasta       TIMESTAMPTZ NOT NULL,
    notas               TEXT,
    created_by          UUID NOT NULL REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cierres_cuenta ON cierres_cuenta(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_cierres_cliente ON cierres_cuenta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cierres_fecha ON cierres_cuenta(created_at DESC);

-- --------------------------------------------------------
-- 11. PAGOS — Header de cada pago (1 pago = 1-2 métodos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reparacion_id       UUID REFERENCES reparaciones(id),
    venta_telefono_id   UUID REFERENCES telefonos(id),
    cierre_cuenta_id    UUID REFERENCES cierres_cuenta(id),
    total_ars           NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_usd           NUMERIC(14,2) NOT NULL DEFAULT 0,
    cotizacion_usada    NUMERIC(14,2),
    notas               TEXT,
    created_by          UUID NOT NULL REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_reparacion ON pagos(reparacion_id);
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_telefono_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cierre ON pagos(cierre_cuenta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(created_at DESC);

-- --------------------------------------------------------
-- 12. PAGO_METODOS — Line items de cada pago (1-2 por pago)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS pago_metodos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pago_id         UUID NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
    metodo          metodo_pago NOT NULL,
    monto           NUMERIC(14,2) NOT NULL,
    cotizacion_usada NUMERIC(14,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pago_metodos_pago ON pago_metodos(pago_id);

-- --------------------------------------------------------
-- 13. MOVIMIENTOS CUENTA CORRIENTE
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_cuenta (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_id       UUID NOT NULL REFERENCES cuenta_corriente(id),
    tipo            tipo_movimiento_cuenta NOT NULL,
    monto_ars       NUMERIC(14,2) NOT NULL DEFAULT 0,
    monto_usd       NUMERIC(14,2) NOT NULL DEFAULT 0,
    descripcion     TEXT NOT NULL,
    reparacion_id   UUID REFERENCES reparaciones(id),
    cierre_id       UUID REFERENCES cierres_cuenta(id),
    created_by      UUID NOT NULL REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mov_cuenta_cuenta ON movimientos_cuenta(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_mov_cuenta_fecha ON movimientos_cuenta(created_at DESC);

-- --------------------------------------------------------
-- 14. MOVIMIENTOS DE CAJA — Todo ingreso/egreso de dinero
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja                    caja_destino NOT NULL,
    tipo                    tipo_movimiento_caja NOT NULL,
    monto                   NUMERIC(14,2) NOT NULL,
    descripcion             TEXT NOT NULL,
    pago_id                 UUID REFERENCES pagos(id),
    reparacion_id           UUID REFERENCES reparaciones(id),
    telefono_id             UUID REFERENCES telefonos(id),
    es_movimiento_personal  BOOLEAN NOT NULL DEFAULT FALSE,
    cotizacion_usada        NUMERIC(14,2),
    created_by              UUID NOT NULL REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mov_caja_caja ON movimientos_caja(caja);
CREATE INDEX IF NOT EXISTS idx_mov_caja_fecha ON movimientos_caja(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_caja_tipo ON movimientos_caja(tipo);

-- --------------------------------------------------------
-- 15. CIERRES DIARIOS DE CAJA — Checkpoints del dueño
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS cierres_diarios_caja (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha               DATE NOT NULL,
    caja                caja_destino NOT NULL,
    saldo_al_cierre     NUMERIC(14,2) NOT NULL,
    notas               TEXT,
    cerrado_por         UUID NOT NULL REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cierre_diario UNIQUE(fecha, caja)
);

CREATE INDEX IF NOT EXISTS idx_cierres_diarios_fecha ON cierres_diarios_caja(fecha DESC);

-- --------------------------------------------------------
-- 16. ARQUEOS DE CAJA — Conteo físico vs teórico
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS arqueos_caja (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha           DATE NOT NULL,
    caja            caja_destino NOT NULL,
    monto_fisico    NUMERIC(14,2) NOT NULL,
    monto_teorico   NUMERIC(14,2) NOT NULL,
    diferencia      NUMERIC(14,2) NOT NULL,
    notas           TEXT,
    created_by      UUID NOT NULL REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_arqueo UNIQUE(fecha, caja)
);

-- --------------------------------------------------------
-- 17. AUDIT LOG — Registro de auditoría
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla               TEXT NOT NULL,
    registro_id         UUID NOT NULL,
    accion              TEXT NOT NULL,
    datos_anteriores    JSONB,
    datos_nuevos        JSONB,
    usuario_id          UUID REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tabla ON audit_log(tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id);

-- --------------------------------------------------------
-- Enable RLS on all tables
-- --------------------------------------------------------
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuenta_corriente ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE telefonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparacion_repuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_cuenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pago_metodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_cuenta ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_diarios_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- Basic RLS policies (allow authenticated users)
-- --------------------------------------------------------
CREATE POLICY "Allow authenticated read" ON usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON cuenta_corriente FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON repuestos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON telefonos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON cotizaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON reparaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON reparaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON reparaciones FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON reparacion_repuestos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON pago_metodos FOR SELECT TO authenticated USING (true);
