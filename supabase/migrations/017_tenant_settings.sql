-- ============================================================
-- 017_tenant_settings.sql
-- Agrega campos de configuración operativa al tenant:
--   notas                    — texto libre visible para el equipo
--   split_franquicia_default — % default de split al crear cliente franquicia
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS notas                    TEXT,
  ADD COLUMN IF NOT EXISTS split_franquicia_default SMALLINT NOT NULL DEFAULT 30;
