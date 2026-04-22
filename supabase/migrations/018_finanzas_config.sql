-- ============================================================
-- 018_finanzas_config.sql
-- Extiende el módulo de finanzas:
--   1. Agrega 'transferencia_entre_cajas' al enum tipo_movimiento_caja
--   2. Agrega columna cotizacion_config (JSONB) a tenants
--      Estructura: { ajuste_tipo: 'fijo'|'porcentaje', ajuste_valor: number, fuente_default: 'blue'|'oficial' }
-- ============================================================

-- 1. Extender el enum (PostgreSQL no permite DROP/RECREATE si hay datos)
ALTER TYPE tipo_movimiento_caja ADD VALUE IF NOT EXISTS 'transferencia_entre_cajas';

-- 2. Configuración de cotización por tenant
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS cotizacion_config JSONB NOT NULL DEFAULT '{}';
