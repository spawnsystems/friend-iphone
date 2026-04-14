-- ============================================================
-- 001_enums_and_types.sql
-- Tipos ENUM para el sistema de gestión del taller
-- ============================================================

-- Roles del sistema
CREATE TYPE app_role AS ENUM ('dueno', 'empleado', 'admin');

-- Estado de reparación
CREATE TYPE estado_reparacion AS ENUM (
    'recibido',
    'en_reparacion',
    'listo',
    'entregado',
    'cancelado'
);

-- Tipo de cliente
CREATE TYPE tipo_cliente AS ENUM ('retail', 'gremio', 'franquicia');

-- Tipo de teléfono en inventario
CREATE TYPE tipo_telefono AS ENUM ('comprado', 'consignacion', 'pasamanos');

-- Estado del teléfono en inventario
CREATE TYPE estado_telefono AS ENUM ('en_stock', 'publicado', 'vendido', 'devuelto');

-- Método de pago
CREATE TYPE metodo_pago AS ENUM ('efectivo_ars', 'efectivo_usd', 'transferencia');

-- Tipo de movimiento de caja
CREATE TYPE tipo_movimiento_caja AS ENUM (
    'ingreso_reparacion',
    'ingreso_venta_telefono',
    'ingreso_cierre_cuenta',
    'egreso_compra_repuesto',
    'egreso_compra_telefono',
    'egreso_pago_consignante',
    'retiro_personal',
    'aporte_personal',
    'ajuste_manual'
);

-- Tipo de movimiento en cuenta corriente
CREATE TYPE tipo_movimiento_cuenta AS ENUM (
    'cargo_reparacion',
    'cargo_venta',
    'pago_cierre',
    'ajuste'
);

-- Caja destino (cada "caja" física o virtual)
CREATE TYPE caja_destino AS ENUM ('efectivo_ars', 'efectivo_usd', 'banco');

-- Moneda
CREATE TYPE moneda AS ENUM ('ars', 'usd');
