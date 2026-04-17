import {
  pgTable, uuid, text, boolean, timestamp, numeric,
} from 'drizzle-orm/pg-core'
import {
  monedaEnum, metodoPagoEnum,
  tipoMovimientoCajaEnum, tipoMovimientoCuentaEnum, cajaDestinoEnum,
} from './enums'
import { tenants } from './tenants'
import { usuarios } from './users'
import { clientes } from './customers'
import { cuentaCorriente } from './customers'

// ── cotizaciones ──────────────────────────────────────────────
export const cotizaciones = pgTable('cotizaciones', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenant_id:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  moneda_tipo:   monedaEnum('moneda_tipo').notNull().default('usd'),
  precio_compra: numeric('precio_compra', { precision: 14, scale: 2 }).notNull(),
  precio_venta:  numeric('precio_venta',  { precision: 14, scale: 2 }).notNull(),
  fuente:        text('fuente').notNull().default('blue'), // 'blue' | 'oficial' | 'cripto'
  created_at:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── pagos ─────────────────────────────────────────────────────
// Encabezado de cada cobro (1 pago puede tener 1-2 métodos).
// Referencias polimórficas: solo una de reparacion_id/venta_telefono_id/cierre_cuenta_id se usa.
export const pagos = pgTable('pagos', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenant_id:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  reparacion_id:    uuid('reparacion_id'),      // FK a reparaciones (lazy — evitar circular)
  venta_telefono_id: uuid('venta_telefono_id'), // FK a telefonos
  cierre_cuenta_id: uuid('cierre_cuenta_id'),   // FK a cierres_cuenta
  total_ars:        numeric('total_ars', { precision: 14, scale: 2 }).notNull().default('0'),
  total_usd:        numeric('total_usd', { precision: 14, scale: 2 }).notNull().default('0'),
  cotizacion_usada: numeric('cotizacion_usada', { precision: 14, scale: 2 }),
  notas:            text('notas'),
  created_by:       uuid('created_by').notNull().references(() => usuarios.id),
  created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── pago_metodos ──────────────────────────────────────────────
export const pagoMetodos = pgTable('pago_metodos', {
  id:               uuid('id').primaryKey().defaultRandom(),
  pago_id:          uuid('pago_id').notNull().references(() => pagos.id, { onDelete: 'cascade' }),
  metodo:           metodoPagoEnum('metodo').notNull(),
  monto:            numeric('monto', { precision: 14, scale: 2 }).notNull(),
  cotizacion_usada: numeric('cotizacion_usada', { precision: 14, scale: 2 }),
  created_at:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── cierres_cuenta ────────────────────────────────────────────
// Snapshots inmutables de cierre de cuenta corriente.
// Creados por la RPC fn_cerrar_cuenta.
export const cierresCuenta = pgTable('cierres_cuenta', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenant_id:          uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  cuenta_id:          uuid('cuenta_id').notNull().references(() => cuentaCorriente.id),
  cliente_id:         uuid('cliente_id').notNull().references(() => clientes.id),
  saldo_previo_ars:   numeric('saldo_previo_ars',  { precision: 14, scale: 2 }).notNull(),
  saldo_previo_usd:   numeric('saldo_previo_usd',  { precision: 14, scale: 2 }).notNull(),
  monto_pagado_ars:   numeric('monto_pagado_ars',  { precision: 14, scale: 2 }).notNull().default('0'),
  monto_pagado_usd:   numeric('monto_pagado_usd',  { precision: 14, scale: 2 }).notNull().default('0'),
  saldo_restante_ars: numeric('saldo_restante_ars', { precision: 14, scale: 2 }).notNull(),
  saldo_restante_usd: numeric('saldo_restante_usd', { precision: 14, scale: 2 }).notNull(),
  detalle_franquicia: text('detalle_franquicia'),   // JSONB en DB — usamos text para compatibilidad
  periodo_desde:      timestamp('periodo_desde', { withTimezone: true }).notNull(),
  periodo_hasta:      timestamp('periodo_hasta', { withTimezone: true }).notNull(),
  notas:              text('notas'),
  created_by:         uuid('created_by').notNull().references(() => usuarios.id),
  created_at:         timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── movimientos_cuenta ────────────────────────────────────────
export const movimientosCuenta = pgTable('movimientos_cuenta', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenant_id:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  cuenta_id:     uuid('cuenta_id').notNull().references(() => cuentaCorriente.id),
  tipo:          tipoMovimientoCuentaEnum('tipo').notNull(),
  monto_ars:     numeric('monto_ars', { precision: 14, scale: 2 }).notNull().default('0'),
  monto_usd:     numeric('monto_usd', { precision: 14, scale: 2 }).notNull().default('0'),
  descripcion:   text('descripcion').notNull(),
  reparacion_id: uuid('reparacion_id'),  // FK a reparaciones (lazy)
  cierre_id:     uuid('cierre_id').references(() => cierresCuenta.id),
  created_by:    uuid('created_by').notNull().references(() => usuarios.id),
  created_at:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── movimientos_caja ──────────────────────────────────────────
export const movimientosCaja = pgTable('movimientos_caja', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  tenant_id:             uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  caja:                  cajaDestinoEnum('caja').notNull(),
  tipo:                  tipoMovimientoCajaEnum('tipo').notNull(),
  monto:                 numeric('monto', { precision: 14, scale: 2 }).notNull(),
  descripcion:           text('descripcion').notNull(),
  pago_id:               uuid('pago_id').references(() => pagos.id),
  reparacion_id:         uuid('reparacion_id'),  // FK lazy
  telefono_id:           uuid('telefono_id'),    // FK lazy
  es_movimiento_personal: boolean('es_movimiento_personal').notNull().default(false),
  cotizacion_usada:      numeric('cotizacion_usada', { precision: 14, scale: 2 }),
  created_by:            uuid('created_by').notNull().references(() => usuarios.id),
  created_at:            timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── cierres_diarios_caja ──────────────────────────────────────
// Checkpoints del dueño. Bloquea modificación de movimientos anteriores (vía trigger).
export const cierresDiariosCaja = pgTable('cierres_diarios_caja', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenant_id:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  fecha:           text('fecha').notNull(),   // DATE en DB
  caja:            cajaDestinoEnum('caja').notNull(),
  saldo_al_cierre: numeric('saldo_al_cierre', { precision: 14, scale: 2 }).notNull(),
  notas:           text('notas'),
  cerrado_por:     uuid('cerrado_por').notNull().references(() => usuarios.id),
  created_at:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── arqueos_caja ──────────────────────────────────────────────
export const arqueosCaja = pgTable('arqueos_caja', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenant_id:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' }),
  fecha:         text('fecha').notNull(),   // DATE en DB
  caja:          cajaDestinoEnum('caja').notNull(),
  monto_fisico:  numeric('monto_fisico',  { precision: 14, scale: 2 }).notNull(),
  monto_teorico: numeric('monto_teorico', { precision: 14, scale: 2 }).notNull(),
  diferencia:    numeric('diferencia',    { precision: 14, scale: 2 }).notNull(),
  notas:         text('notas'),
  created_by:    uuid('created_by').notNull().references(() => usuarios.id),
  created_at:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
