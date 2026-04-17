import {
  pgTable, uuid, text, boolean, timestamp, numeric,
} from 'drizzle-orm/pg-core'
import { tipoClienteEnum } from './enums'
import { tenants } from './tenants'

// ── clientes ──────────────────────────────────────────────────
export const clientes = pgTable('clientes', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenant_id:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  tipo:             tipoClienteEnum('tipo').notNull(),
  nombre:           text('nombre').notNull(),
  telefono:         text('telefono'),
  email:            text('email'),
  direccion:        text('direccion'),
  nombre_negocio:   text('nombre_negocio'),
  // Porción del taller (solo aplica a tipo = 'franquicia')
  franquicia_split: numeric('franquicia_split', { precision: 3, scale: 2 }),
  notas:            text('notas'),
  activo:           boolean('activo').notNull().default(true),
  created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── cuenta_corriente ──────────────────────────────────────────
// Saldo running para clientes gremio/franquicia.
// Actualizado por trigger fn_actualizar_saldo_cuenta.
export const cuentaCorriente = pgTable('cuenta_corriente', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenant_id:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  cliente_id: uuid('cliente_id').notNull().references(() => clientes.id, { onDelete: 'restrict' }),
  saldo_ars:  numeric('saldo_ars', { precision: 14, scale: 2 }).notNull().default('0'),
  saldo_usd:  numeric('saldo_usd', { precision: 14, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
