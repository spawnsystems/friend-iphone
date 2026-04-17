-- ============================================================
-- 012_tenants_and_industries.sql
-- Infraestructura SaaS multi-tenant:
-- - Enums: industry_type, module_key
-- - Tablas: tenants, tenant_members, tenant_modules, plans
-- - Tablas: industry_models, industry_part_categories
-- - Tablas: tenant_models, tenant_part_categories
-- - Seed: planes base + modelos iPhone + categorías de repuestos phones
-- ============================================================

-- ── Enums nuevos ──────────────────────────────────────────────

CREATE TYPE industry_type AS ENUM ('phones', 'generic');

CREATE TYPE module_key AS ENUM (
  'repairs',
  'customers',
  'stock_parts',
  'stock_devices',
  'consignment',
  'trade_in',
  'accounts_receivable',
  'finance',
  'reports',
  'audit'
);

-- ── Tabla: plans ──────────────────────────────────────────────
-- Definición de planes. Asignación manual desde /platform.
-- Stripe se integra en fase posterior.

CREATE TABLE plans (
  key                 TEXT        PRIMARY KEY,
  nombre              TEXT        NOT NULL,
  precio_mensual_usd  TEXT,
  max_users           TEXT,
  activo              BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ── Tabla: tenants ────────────────────────────────────────────

CREATE TABLE tenants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT        NOT NULL,
  industry        industry_type NOT NULL DEFAULT 'phones',
  plan_key        TEXT        NOT NULL DEFAULT 'free' REFERENCES plans(key),
  logo_url        TEXT,
  color_primario  TEXT,
  activo          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_activo ON tenants(activo);

-- ── Tabla: tenant_members ─────────────────────────────────────
-- 1 usuario puede pertenecer a N tenants (ej: dueño con múltiples talleres).

CREATE TABLE tenant_members (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID      NOT NULL REFERENCES tenants(id)   ON DELETE CASCADE,
  user_id     UUID      NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  rol         app_role  NOT NULL DEFAULT 'empleado',
  activo      BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenant_member UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_user   ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);

-- ── Tabla: tenant_modules ─────────────────────────────────────
-- Override de módulos por tenant.
-- Si no hay fila → se usa el default de la industria (definido en código).

CREATE TABLE tenant_modules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key  module_key  NOT NULL,
  enabled     BOOLEAN     NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_tenant_module UNIQUE(tenant_id, module_key)
);

CREATE INDEX idx_tenant_modules_tenant ON tenant_modules(tenant_id);

-- ── Tabla: industry_models ────────────────────────────────────
-- Modelos predefinidos por industria.

CREATE TABLE industry_models (
  id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  industry  industry_type NOT NULL,
  nombre    TEXT          NOT NULL,
  orden     INT           NOT NULL DEFAULT 0
);

CREATE INDEX idx_industry_models_industry ON industry_models(industry, orden);

-- ── Tabla: industry_part_categories ──────────────────────────
-- Categorías de repuestos predefinidas por industria.

CREATE TABLE industry_part_categories (
  id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  industry  industry_type NOT NULL,
  key       TEXT          NOT NULL,
  nombre    TEXT          NOT NULL,
  orden     INT           NOT NULL DEFAULT 0
);

CREATE INDEX idx_industry_part_cats_industry ON industry_part_categories(industry, orden);

-- ── Tabla: tenant_models ──────────────────────────────────────
-- Modelos custom agregados por un tenant (además de los de su industria).

CREATE TABLE tenant_models (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  orden      INT  NOT NULL DEFAULT 0
);

CREATE INDEX idx_tenant_models_tenant ON tenant_models(tenant_id);

-- ── Tabla: tenant_part_categories ────────────────────────────
-- Categorías de repuestos custom por tenant.

CREATE TABLE tenant_part_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  nombre     TEXT NOT NULL,
  orden      INT  NOT NULL DEFAULT 0
);

CREATE INDEX idx_tenant_part_cats_tenant ON tenant_part_categories(tenant_id);

-- ── RLS ───────────────────────────────────────────────────────
-- plans: lectura pública para todos los autenticados
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_select" ON plans FOR SELECT TO authenticated USING (true);

-- tenants: visible solo a sus miembros; management solo service role (dbAdmin)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND activo = TRUE
    )
  );

-- tenant_members: visible por sus propios miembros
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_members_select" ON tenant_members
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members tm2
      WHERE tm2.user_id = auth.uid() AND tm2.activo = TRUE
    )
  );

-- tenant_modules: igual que tenants
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_modules_select" ON tenant_modules
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND activo = TRUE
    )
  );

-- industry_models: lectura pública para todos los autenticados
ALTER TABLE industry_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "industry_models_select" ON industry_models
  FOR SELECT TO authenticated USING (true);

-- industry_part_categories: lectura pública
ALTER TABLE industry_part_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "industry_part_cats_select" ON industry_part_categories
  FOR SELECT TO authenticated USING (true);

-- tenant_models y tenant_part_categories: visibles por miembros del tenant
ALTER TABLE tenant_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_models_select" ON tenant_models
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND activo = TRUE
    )
  );

ALTER TABLE tenant_part_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_part_cats_select" ON tenant_part_categories
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid() AND activo = TRUE
    )
  );

-- ── Seed: Planes base ─────────────────────────────────────────

INSERT INTO plans (key, nombre, precio_mensual_usd, max_users) VALUES
  ('free',     'Free',     '0',  '2'),
  ('pro',      'Pro',      '20', '5'),
  ('business', 'Business', '49', NULL)
ON CONFLICT (key) DO NOTHING;

-- ── Seed: Modelos iPhone (industria phones) ───────────────────

INSERT INTO industry_models (industry, nombre, orden) VALUES
  ('phones', 'iPhone 17 Pro Max',    1),
  ('phones', 'iPhone 17 Pro',        2),
  ('phones', 'iPhone Air',           3),
  ('phones', 'iPhone 17',            4),
  ('phones', 'iPhone 17e',           5),
  ('phones', 'iPhone 16 Pro Max',    6),
  ('phones', 'iPhone 16 Pro',        7),
  ('phones', 'iPhone 16 Plus',       8),
  ('phones', 'iPhone 16',            9),
  ('phones', 'iPhone 15 Pro Max',   10),
  ('phones', 'iPhone 15 Pro',       11),
  ('phones', 'iPhone 15 Plus',      12),
  ('phones', 'iPhone 15',           13),
  ('phones', 'iPhone 14 Pro Max',   14),
  ('phones', 'iPhone 14 Pro',       15),
  ('phones', 'iPhone 14 Plus',      16),
  ('phones', 'iPhone 14',           17),
  ('phones', 'iPhone 13 Pro Max',   18),
  ('phones', 'iPhone 13 Pro',       19),
  ('phones', 'iPhone 13 mini',      20),
  ('phones', 'iPhone 13',           21),
  ('phones', 'iPhone 12 Pro Max',   22),
  ('phones', 'iPhone 12 Pro',       23),
  ('phones', 'iPhone 12 mini',      24),
  ('phones', 'iPhone 12',           25),
  ('phones', 'iPhone 11 Pro Max',   26),
  ('phones', 'iPhone 11 Pro',       27),
  ('phones', 'iPhone 11',           28),
  ('phones', 'iPhone XS Max',       29),
  ('phones', 'iPhone XS',           30),
  ('phones', 'iPhone XR',           31),
  ('phones', 'iPhone X',            32),
  ('phones', 'iPhone 8 Plus',       33),
  ('phones', 'iPhone 8',            34),
  ('phones', 'iPhone 7 Plus',       35),
  ('phones', 'iPhone 7',            36),
  ('phones', 'iPhone SE (3.ª gen)', 37),
  ('phones', 'iPhone SE (2.ª gen)', 38),
  ('phones', 'iPhone SE (1.ª gen)', 39)
ON CONFLICT DO NOTHING;

-- ── Seed: Categorías de repuestos (industria phones) ─────────

INSERT INTO industry_part_categories (industry, key, nombre, orden) VALUES
  ('phones', 'auricular',         'Auricular',            1),
  ('phones', 'sensor_proximidad', 'Sensor de proximidad', 2),
  ('phones', 'flex_carga',        'Flex de carga',        3),
  ('phones', 'parlante',          'Parlante',             4),
  ('phones', 'vibrador',          'Vibrador',             5),
  ('phones', 'lector_sim',        'Lector SIM',           6),
  ('phones', 'bateria',           'Batería',              7),
  ('phones', 'tapa_sin_anclaje',  'Tapa sin anclaje',     8),
  ('phones', 'tapa_con_anclaje',  'Tapa con anclaje',     9),
  ('phones', 'modulo_generico',   'Módulo genérico',     10),
  ('phones', 'modulo_original',   'Módulo original',     11),
  ('phones', 'vidrio_oca',        'Vidrio + OCA',        12),
  ('phones', 'camara_trasera',    'Cámara trasera',      13),
  ('phones', 'camara_selfie',     'Cámara selfie',       14),
  ('phones', 'lente_camara',      'Lente de cámara',     15),
  ('phones', 'chapitas',          'Chapitas',            16)
ON CONFLICT DO NOTHING;

-- ============================================================
-- End migration 012
-- ============================================================
