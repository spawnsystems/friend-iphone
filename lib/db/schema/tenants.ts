import {
  pgTable, uuid, text, boolean, timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { industryTypeEnum, moduleKeyEnum, appRoleEnum } from './enums'
import { usuarios } from './users'

// ── tenants ───────────────────────────────────────────────────
// Cada negocio que usa la plataforma es un tenant.
export const tenants = pgTable('tenants', {
  id:             uuid('id').primaryKey().defaultRandom(),
  nombre:         text('nombre').notNull(),
  industry:       industryTypeEnum('industry').notNull().default('phones'),
  plan_key:       text('plan_key').notNull().default('free'),
  logo_url:       text('logo_url'),
  color_primario: text('color_primario'),   // hex, e.g. '#4BBCE8'
  activo:         boolean('activo').notNull().default(true),
  created_at:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at:     timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── tenant_members ────────────────────────────────────────────
// Relación N:M entre usuarios y tenants, con rol dentro del tenant.
// Un usuario puede pertenecer a varios tenants (ej: dueño con 2 talleres).
export const tenantMembers = pgTable('tenant_members', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  user_id:    uuid('user_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  rol:        appRoleEnum('rol').notNull().default('empleado'),
  activo:     boolean('activo').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── tenant_modules ────────────────────────────────────────────
// Overrides de módulos por tenant. Si no hay fila → se usa el default de la industria.
export const tenantModules = pgTable('tenant_modules', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  module_key: moduleKeyEnum('module_key').notNull(),
  enabled:    boolean('enabled').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── plans ─────────────────────────────────────────────────────
// Definición de planes disponibles. Asignación manual desde /platform por ahora.
// Stripe se integra en fase posterior.
export const plans = pgTable('plans', {
  key:                text('key').primaryKey(),   // 'free' | 'pro' | 'business'
  nombre:             text('nombre').notNull(),
  precio_mensual_usd: text('precio_mensual_usd'), // texto para mostrar ('0', '20', etc.)
  max_users:          text('max_users'),           // null = ilimitado
  activo:             boolean('activo').notNull().default(true),
})

// ── industry_models ───────────────────────────────────────────
// Modelos predefinidos por industria (ej: iPhones para 'phones').
// Los tenants pueden agregar los suyos en tenant_models.
export const industryModels = pgTable('industry_models', {
  id:       uuid('id').primaryKey().defaultRandom(),
  industry: industryTypeEnum('industry').notNull(),
  nombre:   text('nombre').notNull(),
  orden:    text('orden'),   // para ordenar en UI
})

// ── industry_part_categories ──────────────────────────────────
// Categorías de repuestos predefinidas por industria.
export const industryPartCategories = pgTable('industry_part_categories', {
  id:       uuid('id').primaryKey().defaultRandom(),
  industry: industryTypeEnum('industry').notNull(),
  key:      text('key').notNull(),    // ej: 'modulo_original' — puede ser libre para generic
  nombre:   text('nombre').notNull(), // label UI
  orden:    text('orden'),
})

// ── tenant_models ─────────────────────────────────────────────
// Modelos custom agregados por un tenant (además de los de industry_models).
export const tenantModels = pgTable('tenant_models', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  nombre:    text('nombre').notNull(),
  orden:     text('orden'),
})

// ── tenant_part_categories ────────────────────────────────────
// Categorías de repuestos custom por tenant (además de las de industry_part_categories).
export const tenantPartCategories = pgTable('tenant_part_categories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key:       text('key').notNull(),
  nombre:    text('nombre').notNull(),
  orden:     text('orden'),
})
