-- ============================================================
-- 008_fix_franquicia_split.sql
-- Make franquicia_split nullable and add constraint
-- franquicia_split should only have a value for franquicia clients
-- ============================================================

-- Make the column nullable
ALTER TABLE clientes
  ALTER COLUMN franquicia_split DROP NOT NULL,
  ALTER COLUMN franquicia_split DROP DEFAULT;

-- Set to NULL for retail and gremio clients
UPDATE clientes SET franquicia_split = NULL WHERE tipo IN ('retail', 'gremio');

-- Add CHECK constraint: split only exists for franquicia type
ALTER TABLE clientes
  ADD CONSTRAINT ck_franquicia_split_only_for_franquicia
  CHECK (tipo = 'franquicia' OR franquicia_split IS NULL);
